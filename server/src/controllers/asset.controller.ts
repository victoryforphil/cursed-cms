import { PrismaClient } from '@prisma/client';
import { MinioClient } from '../clients/minio';
import { RedisClient } from '../clients/redis';
import logger from '../logger';
import crypto from 'crypto';
import path from 'path';

// Initialize Prisma client
const prisma = new PrismaClient();

// Define error class
class ServerError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ServerError';
  }
}

/**
 * Controller for managing assets using Prisma and MinIO
 */
export const AssetController = {
  /**
   * Ingest an asset into the system
   * - Uploads file to MinIO
   * - Creates asset record in the database
   * - Optionally creates metadata if provided
   * - Emits Redis event with asset data
   * 
   * @param file - The file to upload
   * @param metaData - Optional metadata about the asset
   * @returns The created asset with its metadata
   */
  ingestAsset: async (
    file: File,
    metaData?: {
      asset_type: string;
      asset_class: string;
      asset_location_name: string;
      asset_camera: string;
      asset_date_label: string;
    }
  ) => {
    // Setup clients
    const minioClient = MinioClient.getInstance();
    const redisClient = RedisClient.getInstance();
    
    // Generate a unique ID for the asset
    const assetUuid = crypto.randomUUID();
    
    logger.info(`Starting asset ingestion: ${assetUuid}`, {
      filename: file.name,
      size: file.size,
      type: file.type
    });
    
    try {
      // 1. Prepare file data
      const fileBuffer = await file.arrayBuffer();
      const fileContent = Buffer.from(fileBuffer);
      const fileExtension = path.extname(file.name);
      const originalFilename = file.name;
      
      // Generate a storage path
      let storedPath: string;
      
      if (metaData) {
        // If metadata is provided, use it for the path
        const datePart = metaData.asset_date_label.replace(/[^0-9]/g, '');
        const metaPath = [
          metaData.asset_type,
          metaData.asset_class,
          metaData.asset_location_name.replace(/\s+/g, '_').toLowerCase(),
          metaData.asset_camera.replace(/\s+/g, '_').toLowerCase(),
          datePart || 'undated'
        ].join('/');
        
        const storedFilename = `${assetUuid}${fileExtension}`;
        storedPath = `assets/${metaPath}/${storedFilename}`;
      } else {
        // If no metadata, use a simple path
        const storedFilename = `${assetUuid}${fileExtension}`;
        storedPath = `assets/unclassified/${storedFilename}`;
      }
      
      // 2. Upload file to MinIO
      logger.info(`Uploading file to MinIO: ${storedPath}`);
      await minioClient.uploadObject(
        storedPath,
        fileContent,
        file.size,
        file.type
      );
      
      // 3. Generate a presigned URL for accessing the file
      const storedUrl = await minioClient.getPresignedUrl(storedPath);
      
      // 4. Create the asset record in the database
      logger.info(`Creating asset record in database: ${assetUuid}`);
      
      // Prepare the asset data
      const assetData: any = {
        uuid: assetUuid,
        imported_fullpath: originalFilename,
        imported_filename: path.basename(originalFilename),
        stored_fullpath: storedPath,
        stored_url: storedUrl,
        size: file.size,
        stored_filename: path.basename(storedPath),
        extension: fileExtension.replace('.', ''),
        hash: crypto.createHash('md5').update(fileContent).digest('hex'),
      };
      
      // If metadata is provided, include it in the create operation
      if (metaData) {
        assetData.meta_base = {
          create: {
            asset_type: metaData.asset_type,
            asset_class: metaData.asset_class,
            asset_location_name: metaData.asset_location_name,
            asset_camera: metaData.asset_camera,
            asset_date_label: metaData.asset_date_label
          }
        };
      }
      
      const asset = await prisma.asset.create({
        data: assetData,
        include: {
          meta_base: true
        }
      });
      
      // 5. Emit a Redis event for the newly ingested asset
      logger.info(`Emitting asset_ingested event for: ${assetUuid}`);
      await redisClient.publish('asset_ingested', {
        asset: {
          uuid: asset.uuid,
          filename: asset.imported_filename,
          url: asset.stored_url,
          extension: asset.extension,
          size: asset.size
        },
        meta: asset.meta_base
      });
      
      logger.info(`Asset ingestion completed successfully: ${assetUuid}`);
      
      return asset;
    } catch (error) {
      logger.error('Asset ingestion failed:', {
        error: error instanceof Error ? error.message : String(error),
        assetUuid,
        filename: file.name
      });
      
      // If there's an error, try to clean up any partial uploads
      try {
        let storedPath: string;
        
        if (metaData) {
          // If metadata is provided, reconstruct the path for cleanup
          const datePart = metaData.asset_date_label.replace(/[^0-9]/g, '');
          const metaPath = [
            metaData.asset_type,
            metaData.asset_class,
            metaData.asset_location_name.replace(/\s+/g, '_').toLowerCase(),
            metaData.asset_camera.replace(/\s+/g, '_').toLowerCase(),
            datePart || 'undated'
          ].join('/');
          
          const storedFilename = `${assetUuid}${path.extname(file.name)}`;
          storedPath = `assets/${metaPath}/${storedFilename}`;
        } else {
          // If no metadata, use the simple path
          const storedFilename = `${assetUuid}${path.extname(file.name)}`;
          storedPath = `assets/unclassified/${storedFilename}`;
        }
        
        await minioClient.deleteObject(storedPath);
        logger.info(`Cleaned up failed upload: ${storedPath}`);
      } catch (cleanupError) {
        logger.error('Failed to clean up after failed asset ingestion:', cleanupError);
      }
      
      if (error instanceof ServerError) {
        throw error;
      }
      
      throw new ServerError('Failed to ingest asset', 500);
    }
  },

  /**
   * Upsert metadata for an asset
   * Create metadata if it doesn't exist, or update it if it does
   * 
   * @param assetUuid - UUID of the asset
   * @param metaData - Metadata to upsert
   * @returns The updated asset with its metadata
   */
  upsertMetadata: async (
    assetUuid: string,
    metaData: {
      asset_type: string;
      asset_class: string;
      asset_location_name: string;
      asset_camera: string;
      asset_date_label: string;
    }
  ) => {
    logger.info(`Upserting metadata for asset: ${assetUuid}`);
    
    try {
      // 1. Check if the asset exists
      const existingAsset = await prisma.asset.findUnique({
        where: { uuid: assetUuid },
        include: { meta_base: true }
      });
      
      if (!existingAsset) {
        logger.error(`Asset not found: ${assetUuid}`);
        throw new ServerError('Asset not found', 404);
      }
      
      // 2. Upsert the metadata
      // If the asset already has metadata, update it. Otherwise, create new metadata.
      const metaBase = await prisma.assetMetaBase.upsert({
        where: {
          asset_id: assetUuid
        },
        update: {
          asset_type: metaData.asset_type,
          asset_class: metaData.asset_class,
          asset_location_name: metaData.asset_location_name,
          asset_camera: metaData.asset_camera,
          asset_date_label: metaData.asset_date_label
        },
        create: {
          asset_type: metaData.asset_type,
          asset_class: metaData.asset_class,
          asset_location_name: metaData.asset_location_name,
          asset_camera: metaData.asset_camera,
          asset_date_label: metaData.asset_date_label,
          asset: {
            connect: {
              uuid: assetUuid
            }
          }
        }
      });
      
      logger.info(`Metadata upserted successfully for asset: ${assetUuid}`);
      
      // 3. Return the updated asset with metadata
      const updatedAsset = await prisma.asset.findUnique({
        where: { uuid: assetUuid },
        include: { meta_base: true }
      });
      
      return updatedAsset;
    } catch (error) {
      logger.error('Metadata upsert failed:', {
        error: error instanceof Error ? error.message : String(error),
        assetUuid
      });
      
      if (error instanceof ServerError) {
        throw error;
      }
      
      throw new ServerError('Failed to upsert metadata', 500);
    }
  }
};