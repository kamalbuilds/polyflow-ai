/**
 * Cache Service - Redis-based caching for AI responses and templates
 */

import Redis from 'ioredis';
import NodeCache from 'node-cache';
import { Logger } from '../utils/logger';
import crypto from 'crypto-js';

export interface CacheConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultTTL: number;
  maxSize: number;
}

export class CacheService {
  private redis?: Redis;
  private localCache: NodeCache;
  private logger: Logger;
  private config: CacheConfig;

  constructor() {
    this.logger = new Logger();
    this.config = {
      redis: process.env.REDIS_URL ? {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10)
      } : undefined,
      defaultTTL: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10)
    };

    // Initialize local cache
    this.localCache = new NodeCache({
      stdTTL: this.config.defaultTTL,
      maxKeys: this.config.maxSize,
      useClones: false
    });
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Cache Service...');

      // Initialize Redis if configured
      if (this.config.redis && process.env.REDIS_URL) {
        this.redis = new Redis({
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
          db: this.config.redis.db,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });

        // Test Redis connection
        await this.redis.ping();
        this.logger.info('Redis cache initialized successfully');
      } else {
        this.logger.info('Using local memory cache (Redis not configured)');
      }

      this.logger.info('Cache Service initialized successfully');
    } catch (error) {
      this.logger.warn('Failed to initialize Redis, falling back to local cache:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const hashedKey = this.hashKey(key);

      // Try Redis first if available
      if (this.redis) {
        const cached = await this.redis.get(hashedKey);
        if (cached) {
          this.logger.debug('Cache hit (Redis):', hashedKey);
          return JSON.parse(cached);
        }
      }

      // Fall back to local cache
      const localCached = this.localCache.get<string>(hashedKey);
      if (localCached) {
        this.logger.debug('Cache hit (Local):', hashedKey);
        return JSON.parse(localCached);
      }

      this.logger.debug('Cache miss:', hashedKey);
      return null;
    } catch (error) {
      this.logger.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const hashedKey = this.hashKey(key);
      const serialized = JSON.stringify(value);
      const cacheTTL = ttl || this.config.defaultTTL;

      // Set in Redis if available
      if (this.redis) {
        await this.redis.setex(hashedKey, cacheTTL, serialized);
        this.logger.debug('Cached in Redis:', hashedKey);
      }

      // Always set in local cache as backup
      this.localCache.set(hashedKey, serialized, cacheTTL);
      this.logger.debug('Cached locally:', hashedKey);
    } catch (error) {
      this.logger.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const hashedKey = this.hashKey(key);

      if (this.redis) {
        await this.redis.del(hashedKey);
      }

      this.localCache.del(hashedKey);
      this.logger.debug('Deleted from cache:', hashedKey);
    } catch (error) {
      this.logger.error('Cache delete error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.flushdb();
      }

      this.localCache.flushAll();
      this.logger.info('Cache cleared');
    } catch (error) {
      this.logger.error('Cache clear error:', error);
    }
  }

  async getStats(): Promise<{
    redis?: any;
    local: any;
  }> {
    const stats: any = {
      local: this.localCache.getStats()
    };

    if (this.redis) {
      try {
        const info = await this.redis.info('memory');
        stats.redis = {
          connected: true,
          memory: info
        };
      } catch (error) {
        stats.redis = {
          connected: false,
          error: (error as Error).message
        };
      }
    }

    return stats;
  }

  private hashKey(key: string): string {
    return crypto.SHA256(key).toString();
  }

  isHealthy(): boolean {
    return true; // Local cache is always available
  }
}