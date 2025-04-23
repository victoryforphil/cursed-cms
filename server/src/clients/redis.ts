import Redis from 'ioredis';
import { RedisConfig } from '../types/config';
import { config } from '../config';
import logger from '../logger';

/**
 * Redis client singleton class for caching and pub/sub operations
 */
export class RedisClient {
  private static instance: RedisClient;
  private client!: Redis;
  private initialized: boolean = false;
  private config: RedisConfig;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.config = config.redis;
  }

  /**
   * Get the singleton instance of RedisClient
   * @returns RedisClient instance
   */
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Initialize the Redis client connection
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing Redis client', { url: this.config.url });
      this.client = new Redis({
        host: this.config.url.split(':')[0],
        port: parseInt(this.config.url.split(':')[1] || '6379'),
        maxRetriesPerRequest: 3,
        retryStrategy: (retries) => Math.min(retries * 50, 1000)
      });

      // Set up error handling
      this.client.on('error', (err) => {
        logger.error('Redis client error', err);
      });

      this.initialized = true;
      logger.info('Redis client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis client', error);
      throw error;
    }
  }

  /**
   * Publish a message to a channel
   * @param channel - The channel to publish to
   * @param message - The message to publish (will be stringified if object)
   */
  public async publish(channel: string, message: any): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const messageStr = typeof message === 'object' ? JSON.stringify(message) : message;
      await this.client.publish(channel, messageStr);
      logger.debug(`Published message to channel: ${channel}`);
    } catch (error) {
      logger.error(`Error publishing message to channel: ${channel}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to a channel
   * @param channel - The channel to subscribe to
   * @param callback - The callback to execute when a message is received
   */
  public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.client.subscribe(channel);
      this.client.on('message', (chan, message) => {
        if (chan === channel) {
          logger.debug(`Received message from channel: ${channel}`);
          callback(message);
        }
      });
      logger.info(`Subscribed to channel: ${channel}`);
    } catch (error) {
      logger.error(`Error subscribing to channel: ${channel}`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a channel
   * @param channel - The channel to unsubscribe from
   */
  public async unsubscribe(channel: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.client.unsubscribe(channel);
      logger.info(`Unsubscribed from channel: ${channel}`);
    } catch (error) {
      logger.error(`Error unsubscribing from channel: ${channel}`, error);
      throw error;
    }
  }

  /**
   * Set a key-value pair in Redis
   * @param key - The key to set
   * @param value - The value to set
   * @param expiry - Optional expiration time in seconds
   */
  public async set(key: string, value: any, expiry?: number): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;
      if (expiry) {
        await this.client.set(key, valueStr, 'EX', expiry);
      } else {
        await this.client.set(key, valueStr);
      }
      logger.debug(`Set key: ${key}`);
    } catch (error) {
      logger.error(`Error setting key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Get a value from Redis by key
   * @param key - The key to get
   * @returns The value or null if not found
   */
  public async get(key: string): Promise<string | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const value = await this.client.get(key);
      return value;
    } catch (error) {
      logger.error(`Error getting key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete a key from Redis
   * @param key - The key to delete
   */
  public async delete(key: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.client.del(key);
      logger.debug(`Deleted key: ${key}`);
    } catch (error) {
      logger.error(`Error deleting key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Close the Redis client connection
   */
  public async close(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.client.quit();
      this.initialized = false;
      logger.info('Redis client connection closed');
    } catch (error) {
      logger.error('Error closing Redis client connection', error);
      throw error;
    }
  }

  /**
   * Get the Redis client instance for direct operations
   * @returns The Redis client instance
   */
  public getClient(): Redis {
    if (!this.initialized) {
      throw new Error('Redis client not initialized. Call initialize() first.');
    }
    return this.client;
  }
}
