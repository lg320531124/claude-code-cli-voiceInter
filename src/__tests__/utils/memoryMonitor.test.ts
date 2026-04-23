/**
 * Tests for memoryMonitor utility
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { memoryMonitor } from '../../utils/memoryMonitor';

describe('memoryMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReport', () => {
    it('should return memory report', () => {
      const report = memoryMonitor.getReport();

      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('total');
      expect(report).toHaveProperty('level');
      expect(report).toHaveProperty('thresholds');
      expect(report).toHaveProperty('suggestions');
    });

    it('should return metrics with formatted values', () => {
      const report = memoryMonitor.getReport();

      expect(report.metrics).toHaveProperty('formatted');
      expect(report.metrics.formatted).toHaveProperty('ttsCacheMemory');
      expect(report.metrics.formatted).toHaveProperty('messageCache');
    });

    it('should return total in bytes and formatted', () => {
      const report = memoryMonitor.getReport();

      expect(report.total).toHaveProperty('bytes');
      expect(report.total).toHaveProperty('formatted');
      expect(typeof report.total.bytes).toBe('number');
      expect(typeof report.total.formatted).toBe('string');
    });

    it('should return memory level', () => {
      const report = memoryMonitor.getReport();

      expect(['normal', 'warning', 'critical']).toContain(report.level);
    });
  });

  describe('addListener', () => {
    it('should add listener and return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = memoryMonitor.addListener(listener);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('updateMetrics', () => {
    it('should update metrics asynchronously', async () => {
      await memoryMonitor.updateMetrics();

      const report = memoryMonitor.getReport();
      expect(report.metrics.lastUpdate).not.toBeNull();
    });

    it('should not throw on update', async () => {
      await expect(memoryMonitor.updateMetrics()).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should cleanup specified caches', async () => {
      const result = await memoryMonitor.cleanup({ ttsCache: true });

      expect(typeof result).toBe('object');
    });

    it('should cleanup all caches when no options provided', async () => {
      const result = await memoryMonitor.cleanup();

      expect(typeof result).toBe('object');
    });
  });

  describe('thresholds', () => {
    it('should return warning threshold', () => {
      const report = memoryMonitor.getReport();
      expect(report.thresholds.warning).toBeDefined();
    });

    it('should return critical threshold', () => {
      const report = memoryMonitor.getReport();
      expect(report.thresholds.critical).toBeDefined();
    });
  });

  describe('suggestions', () => {
    it('should return suggestions array', () => {
      const report = memoryMonitor.getReport();
      expect(Array.isArray(report.suggestions)).toBe(true);
    });
  });

  describe('start/stop', () => {
    it('should start monitoring interval', () => {
      memoryMonitor.start(1000);

      // Should not throw
      expect(() => memoryMonitor.getReport()).not.toThrow();

      memoryMonitor.stop();
    });

    it('should stop previous monitoring when called again', () => {
      memoryMonitor.start(1000);
      memoryMonitor.start(2000);

      expect(() => memoryMonitor.getReport()).not.toThrow();

      memoryMonitor.stop();
    });

    it('should stop monitoring', () => {
      memoryMonitor.start(1000);
      memoryMonitor.stop();

      expect(() => memoryMonitor.getReport()).not.toThrow();
    });
  });

  describe('estimateTTSCacheSize', () => {
    it('should estimate TTS cache size', async () => {
      const result = await memoryMonitor.estimateTTSCacheSize();

      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('indexedDB');
      expect(typeof result.memory).toBe('number');
      expect(typeof result.indexedDB).toBe('number');
    });
  });

  describe('estimateMessageCacheSize', () => {
    it('should estimate message cache size', async () => {
      const result = await memoryMonitor.estimateMessageCacheSize();

      expect(typeof result).toBe('number');
    });
  });
});
