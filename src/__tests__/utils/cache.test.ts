// src/__tests__/utils/cache.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cache, DataLoader, memoize } from '../../utils/cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>({ ttlMs: 1000, maxSize: 3 });
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('TTL', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 100);
      expect(cache.get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should use custom TTL over default', async () => {
      cache.set('key1', 'value1', 50);
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('size limits', () => {
    it('should enforce max size with LRU eviction', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1 to make it recently used
      cache.get('key1');

      // Adding key4 should evict key2 (least recently used)
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('value1'); // Still present (recently used)
      expect(cache.get('key2')).toBeUndefined(); // Evicted
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // hit
      cache.get('key2'); // miss
      cache.get('key1'); // hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.666, 2);
    });

    it('should track size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 200);

      await new Promise(resolve => setTimeout(resolve, 100));

      const removed = cache.cleanup();
      expect(removed).toBe(1);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });
  });
});

describe('DataLoader', () => {
  it('should batch multiple loads into single call', async () => {
    const batchFn = vi.fn(async (keys: string[]) => {
      return keys.map(k => `value-${k}`);
    });

    const loader = new DataLoader(batchFn, { batchWindowMs: 10 });

    // These should be batched together
    const promise1 = loader.load('key1');
    const promise2 = loader.load('key2');
    const promise3 = loader.load('key3');

    const results = await Promise.all([promise1, promise2, promise3]);

    expect(results).toEqual(['value-key1', 'value-key2', 'value-key3']);
    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
  });

  it('should cache results', async () => {
    const batchFn = vi.fn(async (keys: string[]) => {
      return keys.map(k => `value-${k}`);
    });

    const loader = new DataLoader(batchFn);

    await loader.load('key1');
    await loader.load('key1'); // Should use cache

    expect(batchFn).toHaveBeenCalledTimes(1);
  });

  it('should handle loadMany', async () => {
    const batchFn = vi.fn(async (keys: string[]) => {
      return keys.map(k => `value-${k}`);
    });

    const loader = new DataLoader(batchFn);

    const results = await loader.loadMany(['key1', 'key2', 'key3']);

    expect(results).toEqual(['value-key1', 'value-key2', 'value-key3']);
  });

  it('should clear cache', async () => {
    const batchFn = vi.fn(async (keys: string[]) => {
      return keys.map(k => `value-${k}`);
    });

    const loader = new DataLoader(batchFn);

    await loader.load('key1');
    loader.clear('key1');
    await loader.load('key1'); // Should call batchFn again

    expect(batchFn).toHaveBeenCalledTimes(2);
  });
});

describe('memoize', () => {
  it('should cache function results', async () => {
    let callCount = 0;
    const fn = async (x: number) => {
      callCount++;
      return x * 2;
    };

    const memoized = memoize(fn, { ttlMs: 1000 });

    const result1 = await memoized(5);
    const result2 = await memoized(5); // Should use cache

    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(callCount).toBe(1);
  });

  it('should use custom key generator', async () => {
    let callCount = 0;
    const fn = async (obj: { id: number }) => {
      callCount++;
      return obj.id * 2;
    };

    const memoized = memoize(fn, {
      keyGenerator: (obj) => String(obj.id),
    });

    await memoized({ id: 5 });
    await memoized({ id: 5 });

    expect(callCount).toBe(1);
  });

  it('should respect TTL', async () => {
    let callCount = 0;
    const fn = async (x: number) => {
      callCount++;
      return x * 2;
    };

    const memoized = memoize(fn, { ttlMs: 50 });

    await memoized(5);
    await new Promise(resolve => setTimeout(resolve, 100));
    await memoized(5); // Should call function again

    expect(callCount).toBe(2);
  });
});
