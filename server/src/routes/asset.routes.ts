import { t } from 'elysia';
import { createBaseRoute } from './base';
import { AssetController } from '../controllers/asset.controller';
import logger from '../logger';

/**
 * Asset routes for handling asset operations
 * 
 * Usage in main application:
 * ```typescript
 * // In your main app.ts or index.ts:
 * import { Elysia } from 'elysia';
 * import { assetRoutes } from './routes/asset.routes';
 * 
 * const app = new Elysia()
 *   .use(assetRoutes)
 *   .listen(3000);
 * ```
 * 
 * This will expose the following endpoints:
 * - POST /assets/ingest - Upload and process a new asset with optional metadata
 * - POST /assets/:uuid/metadata - Upsert metadata for an asset
 * - GET /assets/:uuid - Get asset by UUID
 * - GET /assets - List assets with optional filtering
 * - DELETE /assets/:uuid - Delete an asset
 * - POST /assets/:uuid/access - Grant access to an asset
 * - DELETE /assets/:uuid/access/:user_uuid - Revoke access to an asset
 */
export const assetRoutes = createBaseRoute('/assets')
  // Ingest a new asset with multipart form upload (metadata is now optional)
  .post('/ingest', 
    async ({ body, set }) => {
      try {
        const { 
          file,
          asset_type,
          asset_class,
          asset_location_name,
          asset_camera,
          asset_date_label
        } = body;
        
        if (!file || !(file instanceof File)) {
          set.status = 400;
          return {
            success: false,
            error: 'No file provided or invalid file'
          };
        }

        // Check if all metadata fields are provided
        const hasAllMetadataFields = asset_type && 
          asset_class && 
          asset_location_name && 
          asset_camera && 
          asset_date_label;
        
        let asset;
        
        // If all metadata fields are provided, include them in the ingest
        if (hasAllMetadataFields) {
          const metadata = {
            asset_type,
            asset_class,
            asset_location_name,
            asset_camera,
            asset_date_label
          };

          logger.info('Ingesting asset with metadata', { 
            filename: file.name, 
            size: file.size, 
            type: file.type,
            metadata
          });
          
          asset = await AssetController.ingestAsset(file, metadata);
        } else {
          // If any metadata field is missing, ingest the asset without metadata
          logger.info('Ingesting asset without metadata', { 
            filename: file.name, 
            size: file.size, 
            type: file.type
          });
          
          asset = await AssetController.ingestAsset(file);
        }

        return {
          success: true,
          data: asset
        };
      } catch (error) {
        logger.error('Failed to ingest asset:', error);
        const statusCode = error instanceof Error && 'statusCode' in error 
          ? (error as any).statusCode 
          : 500;
        
        set.status = statusCode;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to ingest asset'
        };
      }
    }, 
    {
      body: t.Object({
        file: t.Any(),
        // Make metadata fields optional
        asset_type: t.Optional(t.String()),
        asset_class: t.Optional(t.String()),
        asset_location_name: t.Optional(t.String()),
        asset_camera: t.Optional(t.String()),
        asset_date_label: t.Optional(t.String())
      })
    }
  )
  
  // New route for upserting metadata
  .post('/:uuid/metadata',
    async ({ params, body, set }) => {
      try {
        const { uuid } = params;
        const { 
          asset_type,
          asset_class,
          asset_location_name,
          asset_camera,
          asset_date_label
        } = body;
        
        // All metadata fields are required for this operation
        const metadata = {
          asset_type,
          asset_class,
          asset_location_name,
          asset_camera,
          asset_date_label
        };
        
        // Validate required metadata fields
        const missingFields = Object.entries(metadata)
          .filter(([_, value]) => !value)
          .map(([key]) => key);
        
        if (missingFields.length > 0) {
          set.status = 400;
          return {
            success: false,
            error: `Missing required metadata fields: ${missingFields.join(', ')}`
          };
        }
        
        logger.info('Upserting metadata for asset', { 
          uuid, 
          metadata 
        });
        
        const asset = await AssetController.upsertMetadata(uuid, metadata);
        
        return {
          success: true,
          data: asset
        };
      } catch (error) {
        logger.error('Failed to upsert metadata:', error);
        const statusCode = error instanceof Error && 'statusCode' in error 
          ? (error as any).statusCode 
          : 500;
        
        set.status = statusCode;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to upsert metadata'
        };
      }
    },
    {
      params: t.Object({
        uuid: t.String()
      }),
      body: t.Object({
        asset_type: t.String(),
        asset_class: t.String(),
        asset_location_name: t.String(),
        asset_camera: t.String(),
        asset_date_label: t.String()
      })
    }
  )
  
  // For future implementation - Get an asset by ID
  .get('/:uuid', 
    async ({ params, set }) => {
      try {
        // For future implementation
        // const asset = await AssetController.getAssetById(params.uuid);
        
        return {
          success: true,
          message: "Asset retrieval endpoint - Not yet implemented",
          data: { uuid: params.uuid }
        };
      } catch (error) {
        logger.error('Failed to get asset:', error);
        const statusCode = error instanceof Error && 'statusCode' in error 
          ? (error as any).statusCode 
          : 500;
        
        set.status = statusCode;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get asset'
        };
      }
    }, 
    {
      params: t.Object({
        uuid: t.String()
      })
    }
  )
  
  // For future implementation - List all assets
  .get('/', 
    async ({ query, set }) => {
      try {
        // For future implementation
        // const assets = await AssetController.listAssets(query);
        
        return {
          success: true,
          message: "Asset listing endpoint - Not yet implemented",
          data: []
        };
      } catch (error) {
        logger.error('Failed to list assets:', error);
        const statusCode = error instanceof Error && 'statusCode' in error 
          ? (error as any).statusCode 
          : 500;
        
        set.status = statusCode;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list assets'
        };
      }
    }, 
    {
      query: t.Object({})
    }
  )
  
  // For future implementation - Delete an asset
  .delete('/:uuid', 
    async ({ params, set }) => {
      try {
        // For future implementation
        // await AssetController.deleteAsset(params.uuid);
        
        return {
          success: true,
          message: "Asset deletion endpoint - Not yet implemented"
        };
      } catch (error) {
        logger.error('Failed to delete asset:', error);
        const statusCode = error instanceof Error && 'statusCode' in error 
          ? (error as any).statusCode 
          : 500;
        
        set.status = statusCode;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete asset'
        };
      }
    }, 
    {
      params: t.Object({
        uuid: t.String()
      })
    }
  )
  
  // For future implementation - Add user access to an asset
  .post('/:uuid/access', 
    async ({ params, body, set }) => {
      try {
        // For future implementation
        // await AssetController.addUserAccess(params.uuid, body.user_uuid);
        
        return {
          success: true,
          message: "Asset access grant endpoint - Not yet implemented"
        };
      } catch (error) {
        logger.error('Failed to add user access:', error);
        const statusCode = error instanceof Error && 'statusCode' in error 
          ? (error as any).statusCode 
          : 500;
        
        set.status = statusCode;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to add user access'
        };
      }
    }, 
    {
      params: t.Object({
        uuid: t.String()
      }),
      body: t.Object({
        user_uuid: t.String()
      })
    }
  )
  
  // For future implementation - Remove user access from an asset
  .delete('/:uuid/access/:user_uuid', 
    async ({ params, set }) => {
      try {
        // For future implementation
        // await AssetController.removeUserAccess(params.uuid, params.user_uuid);
        
        return {
          success: true,
          message: "Asset access revocation endpoint - Not yet implemented"
        };
      } catch (error) {
        logger.error('Failed to remove user access:', error);
        const statusCode = error instanceof Error && 'statusCode' in error 
          ? (error as any).statusCode 
          : 500;
        
        set.status = statusCode;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to remove user access'
        };
      }
    }, 
    {
      params: t.Object({
        uuid: t.String(),
        user_uuid: t.String()
      })
    }
  );
