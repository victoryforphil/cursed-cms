import { Client } from 'minio';
import { MinioConfig } from '../types/config';
import { config } from '../config';
import logger from '../logger';

/**
 * MinIO client singleton class for object storage operations
 */
export class MinioClient {
  private static instance: MinioClient;
  private client!: Client;
  private initialized: boolean = false;
  private config: MinioConfig;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.config = config.minio;
  }

  /**
   * Get the singleton instance of MinioClient
   * @returns MinioClient instance
   */
  public static getInstance(): MinioClient {
    if (!MinioClient.instance) {
      MinioClient.instance = new MinioClient();
    }
    return MinioClient.instance;
  }

  /**
   * Initialize the MinIO client connection
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.client = new Client({
        endPoint: this.config.endPoint,
        port: this.config.port,
        useSSL: this.config.useSSL,
        accessKey: this.config.accessKey,
        secretKey: this.config.secretKey,
      });

      // Check if bucket exists, create if it doesn't
      const bucketExists = await this.client.bucketExists(this.config.bucket);
      if (!bucketExists) {
        await this.client.makeBucket(this.config.bucket, '');
        logger.info(`Created bucket: ${this.config.bucket}`);
      }

      this.initialized = true;
      logger.info('MinIO client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MinIO client', error);
      throw error;
    }
  }

  /**
   * Upload a file to MinIO
   * @param objectName - Name to store the object as
   * @param data - File data (Buffer or Readable stream)
   * @param size - Size of the file in bytes
   * @param contentType - MIME type of the file
   * @returns Promise with etag info of the uploaded object
   */
  public async uploadObject(
    objectName: string,
    data: Buffer | NodeJS.ReadableStream,
    size: number,
    contentType: string
  ): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const etag = await this.client.putObject(
        this.config.bucket,
        objectName,
        data as any, // Type cast to avoid TS error with minio types
        size,
        { 'Content-Type': contentType }
      );
      logger.info(`Uploaded object: ${objectName}`);
      return etag;
    } catch (error) {
      logger.error(`Error uploading object: ${objectName}`, error);
      throw error;
    }
  }

  /**
   * Download an object from MinIO
   * @param objectName - Name of the object to download
   * @returns Promise with the object data as a stream
   */
  public async getObject(objectName: string): Promise<NodeJS.ReadableStream> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      return await this.client.getObject(this.config.bucket, objectName);
    } catch (error) {
      logger.error(`Error downloading object: ${objectName}`, error);
      throw error;
    }
  }

  /**
   * Delete an object from MinIO
   * @param objectName - Name of the object to delete
   */
  public async deleteObject(objectName: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.client.removeObject(this.config.bucket, objectName);
      logger.info(`Deleted object: ${objectName}`);
    } catch (error) {
      logger.error(`Error deleting object: ${objectName}`, error);
      throw error;
    }
  }

  /**
   * Generate a presigned URL for temporary access to an object
   * @param objectName - Name of the object
   * @param expiry - Expiration time in seconds (default: 24 hours)
   * @returns Promise with the presigned URL
   */
  public async getPresignedUrl(objectName: string, expiry: number = 86400): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      return await this.client.presignedGetObject(this.config.bucket, objectName, expiry);
    } catch (error) {
      logger.error(`Error generating presigned URL for: ${objectName}`, error);
      throw error;
    }
  }

  /**
   * List all objects in a bucket with optional prefix
   * @param prefix - Optional prefix to filter objects
   * @returns Promise with array of object information
   */
  public async listObjects(prefix: string = ''): Promise<any[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const objectsStream = this.client.listObjects(this.config.bucket, prefix, true);
      const objects: any[] = [];

      return new Promise((resolve, reject) => {
        objectsStream.on('data', (obj) => {
          objects.push(obj);
        });
        objectsStream.on('error', (err) => {
          reject(err);
        });
        objectsStream.on('end', () => {
          resolve(objects);
        });
      });
    } catch (error) {
      logger.error('Error listing objects', error);
      throw error;
    }
  }

  /**
   * Get the MinIO client instance for direct operations
   * @returns The MinIO client instance
   */
  public getClient(): Client {
    if (!this.initialized) {
      throw new Error('MinIO client not initialized. Call initialize() first.');
    }
    return this.client;
  }
}


