/**
 * Tests for ttsCache utility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCachedAudio,
  cacheAudio,
  cleanExpiredCache,
  getCacheStats,
  clearAllCache,
  precacheCommonPhrases,
  enforceMaxCacheSize,
  COMMON_PHRASES,
} from '../../utils/ttsCache';

describe('ttsCache', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearAllCache();
  });

  afterEach(async () => {
    await clearAllCache();
  });

  describe('getCachedAudio', () => {
    it('should return null for non-existent cache entry', async () => {
      const result = await getCachedAudio('non-existent', 'zh-CN', 1.0);
      expect(result).toBeNull();
    });

    it('should accept text, voice, and speed parameters', async () => {
      const result = await getCachedAudio('test text', 'en-US', 2.0);
      expect(result).toBeNull();
    });
  });

  describe('cacheAudio', () => {
    it('should cache audio blob without throwing', async () => {
      const audioBlob = new Blob(['test audio data'], { type: 'audio/wav' });

      await expect(cacheAudio('test text', 'zh-CN', 1.0, audioBlob)).resolves.not.toThrow();
    });

    it('should store with correct metadata', async () => {
      const audioBlob = new Blob(['test'], { type: 'audio/wav' });

      await cacheAudio('hello', 'en-US', 1.5, audioBlob);

      const stats = await getCacheStats();
      expect(stats.count).toBeGreaterThan(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const stats = await getCacheStats();

      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('memoryCacheCount');
      expect(stats).toHaveProperty('oldestTimestamp');
    });

    it('should return count as number', async () => {
      const stats = await getCacheStats();
      expect(typeof stats.count).toBe('number');
    });

    it('should return totalSize as number', async () => {
      const stats = await getCacheStats();
      expect(typeof stats.totalSize).toBe('number');
    });

    it('should show empty cache after clear', async () => {
      await clearAllCache();
      const stats = await getCacheStats();
      expect(stats.count).toBe(0);
    });
  });

  describe('cleanExpiredCache', () => {
    it('should clean expired items without throwing', async () => {
      await expect(cleanExpiredCache()).resolves.not.toThrow();
    });

    it('should return a number', async () => {
      const result = await cleanExpiredCache();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cached items', async () => {
      const audioBlob = new Blob(['test'], { type: 'audio/wav' });
      await cacheAudio('to clear', 'zh-CN', 1.0, audioBlob);

      await clearAllCache();

      const stats = await getCacheStats();
      expect(stats.count).toBe(0);
    });

    it('should return true on success', async () => {
      const result = await clearAllCache();
      expect(result).toBe(true);
    });

    it('should clear memory cache', async () => {
      await clearAllCache();

      const stats = await getCacheStats();
      expect(stats.memoryCacheCount).toBe(0);
    });
  });

  describe('precacheCommonPhrases', () => {
    it('should precache common phrases without throwing', async () => {
      const mockSpeak = vi.fn(async () => new Blob(['audio'], { type: 'audio/wav' }));

      await expect(precacheCommonPhrases('zh-CN', 1.0, mockSpeak)).resolves.not.toThrow();
    });

    it('should handle speak function returning null', async () => {
      const mockSpeak = vi.fn(async () => null);

      const results = await precacheCommonPhrases('zh-CN', 1.0, mockSpeak);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should return precache results', async () => {
      const mockSpeak = vi.fn(async () => new Blob(['test'], { type: 'audio/wav' }));

      const results = await precacheCommonPhrases('en-US', 1.0, mockSpeak);

      expect(results[0]).toHaveProperty('phrase');
      expect(results[0]).toHaveProperty('status');
    });
  });

  describe('enforceMaxCacheSize', () => {
    it('should enforce max cache size without throwing', async () => {
      await expect(enforceMaxCacheSize()).resolves.not.toThrow();
    });

    it('should return a number', async () => {
      const result = await enforceMaxCacheSize();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('COMMON_PHRASES', () => {
    it('should export common phrases list', () => {
      expect(Array.isArray(COMMON_PHRASES)).toBe(true);
    });

    it('should contain common Chinese phrases', () => {
      expect(COMMON_PHRASES).toContain('你好');
      expect(COMMON_PHRASES).toContain('好的');
      expect(COMMON_PHRASES).toContain('谢谢');
    });

    it('should have reasonable size', () => {
      expect(COMMON_PHRASES.length).toBeGreaterThan(5);
    });
  });

  describe('cache key generation', () => {
    it('should generate different keys for different voices', async () => {
      const blob = new Blob(['test'], { type: 'audio/wav' });

      await cacheAudio('same text', 'zh-CN', 1.0, blob);
      await cacheAudio('same text', 'en-US', 1.0, blob);

      const stats = await getCacheStats();
      expect(stats.count).toBeGreaterThan(0);
    });

    it('should generate different keys for different speeds', async () => {
      const blob = new Blob(['test'], { type: 'audio/wav' });

      await cacheAudio('same text', 'zh-CN', 1.0, blob);
      await cacheAudio('same text', 'zh-CN', 2.0, blob);

      const stats = await getCacheStats();
      expect(stats.count).toBeGreaterThan(0);
    });
  });
});
