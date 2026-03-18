import { describe, it, expect, beforeEach } from 'vitest';
import { CacheFactory } from '../CacheFactory';

describe('CacheFactory', () => {
  describe('MEMORY Provider', () => {
    it('should create InMemoryAdapter', () => {
      const cache = CacheFactory.create({
        provider: 'MEMORY',
        prefix: 'test:',
        defaultTTL: 300
      });

      expect(cache).toBeDefined();
    });

    it('should set and get value', async () => {
      const cache = CacheFactory.create({
        provider: 'MEMORY'
      });

      const setResult = await cache.set('key1', 'value1');
      expect(setResult.isSuccess).toBe(true);

      const getResult = await cache.get<string>('key1');
      expect(getResult.isSuccess).toBe(true);
      expect(getResult.getValue()).toBe('value1');
    });

    it('should handle TTL expiration', async () => {
      const cache = CacheFactory.create({
        provider: 'MEMORY'
      });

      await cache.set('key1', 'value1', 1); // 1 second TTL
      
      const immediateGet = await cache.get<string>('key1');
      expect(immediateGet.getValue()).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const expiredGet = await cache.get<string>('key1');
      expect(expiredGet.getValue()).toBeNull();
    });

    it('should increment and decrement', async () => {
      const cache = CacheFactory.create({
        provider: 'MEMORY'
      });

      const incResult1 = await cache.increment('counter', 5);
      expect(incResult1.getValue()).toBe(5);

      const incResult2 = await cache.increment('counter', 3);
      expect(incResult2.getValue()).toBe(8);

      const decResult = await cache.decrement('counter', 2);
      expect(decResult.getValue()).toBe(6);
    });

    it('should handle multiple get/set', async () => {
      const cache = CacheFactory.create({
        provider: 'MEMORY'
      });

      await cache.mset({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      });

      const results = await cache.mget<string>(['key1', 'key2', 'key3']);
      expect(results.getValue()).toEqual(['value1', 'value2', 'value3']);
    });

    it('should return stats', async () => {
      const cache = CacheFactory.create({
        provider: 'MEMORY'
      });

      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.get('key1'); // hit
      await cache.get('key3'); // miss

      const statsResult = await cache.stats();
      expect(statsResult.isSuccess).toBe(true);
      
      const stats = statsResult.getValue();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.keys).toBeGreaterThan(0);
    });

    it('should clear cache', async () => {
      const cache = CacheFactory.create({
        provider: 'MEMORY'
      });

      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const clearResult = await cache.clear();
      expect(clearResult.isSuccess).toBe(true);

      const getResult = await cache.get('key1');
      expect(getResult.getValue()).toBeNull();
    });
  });

  describe('REDIS Provider', () => {
    it('should throw error without redis client', () => {
      expect(() => {
        CacheFactory.create({
          provider: 'REDIS'
        });
      }).toThrow('Redis client is required');
    });

    it('should create RedisAdapter with client', () => {
      const mockRedisClient = {
        get: () => Promise.resolve(null),
        set: () => Promise.resolve('OK')
      };

      const cache = CacheFactory.create({
        provider: 'REDIS',
        redisClient: mockRedisClient
      });

      expect(cache).toBeDefined();
    });
  });

  describe('Invalid Provider', () => {
    it('should throw error for unsupported provider', () => {
      expect(() => {
        CacheFactory.create({
          provider: 'INVALID' as any
        });
      }).toThrow('Unsupported cache provider');
    });
  });
});