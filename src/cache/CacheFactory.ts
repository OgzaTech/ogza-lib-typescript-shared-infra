import { ICache } from '@ogza/core';
import { InMemoryAdapter, RedisAdapter, type RedisConfig } from '@ogza/core';

/**
 * Cache Provider Types
 */
export type CacheProvider = 'MEMORY' | 'REDIS';

/**
 * Cache Configuration
 */
export interface CacheFactoryConfig {
  provider: CacheProvider;
  prefix?: string;
  defaultTTL?: number;
  redisClient?: any; // For Redis provider
  redisConfig?: RedisConfig;
}

/**
 * CacheFactory - Cache provider oluşturma factory
 * 
 * Desteklenen provider'lar:
 * - MEMORY: In-memory cache (test/development için)
 * - REDIS: Redis cache (production için)
 */
export class CacheFactory {
  static create(config: CacheFactoryConfig): ICache {
    switch (config.provider) {
      case 'MEMORY':
        return new InMemoryAdapter(
          config.prefix || 'cache:',
          config.defaultTTL || 3600
        );
      
      case 'REDIS':
        if (!config.redisClient) {
          throw new Error('Redis client is required for REDIS provider');
        }
        return new RedisAdapter(config.redisClient, {
          prefix: config.prefix,
          defaultTTL: config.defaultTTL,
          ...config.redisConfig
        });
      
      default:
        throw new Error(`Unsupported cache provider: ${config.provider}`);
    }
  }
}