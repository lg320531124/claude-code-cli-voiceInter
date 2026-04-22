// src/__tests__/utils/memoryMonitor.test.js
// Memory monitor unit tests

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { MemoryMonitor, memoryMonitor } from '../../utils/memoryMonitor';

describe('MemoryMonitor', () => {
  describe('MemoryMonitor class', () => {
    test('should initialize with default values', () => {
      const monitor = new MemoryMonitor();

      expect(monitor.metrics).toHaveProperty('ttsCacheMemory');
      expect(monitor.metrics).toHaveProperty('ttsCacheIndexedDB');
      expect(monitor.metrics).toHaveProperty('messageCache');
      expect(monitor.metrics).toHaveProperty('audioBuffers');
      expect(monitor.metrics.ttsCacheMemory).toBe(0);
    });

    test('should have correct threshold values', () => {
      const monitor = new MemoryMonitor();

      expect(monitor.thresholds.warning).toBe(50 * 1024 * 1024); // 50MB
      expect(monitor.thresholds.critical).toBe(100 * 1024 * 1024); // 100MB
    });
  });

  describe('getTotalUsage', () => {
    test('should sum all metric values', () => {
      const monitor = new MemoryMonitor();
      monitor.metrics.ttsCacheMemory = 10 * 1024 * 1024;
      monitor.metrics.ttsCacheIndexedDB = 20 * 1024 * 1024;
      monitor.metrics.messageCache = 5 * 1024 * 1024;
      monitor.metrics.audioBuffers = 2 * 1024 * 1024;

      const total = monitor.getTotalUsage();
      expect(total).toBe(37 * 1024 * 1024);
    });

    test('should return 0 for empty metrics', () => {
      const monitor = new MemoryMonitor();
      const total = monitor.getTotalUsage();
      expect(total).toBe(0);
    });
  });

  describe('getLevel', () => {
    test('should return normal for usage under warning threshold', () => {
      const monitor = new MemoryMonitor();
      monitor.metrics.ttsCacheMemory = 10 * 1024 * 1024; // 10MB

      expect(monitor.getLevel()).toBe('normal');
    });

    test('should return warning for usage between thresholds', () => {
      const monitor = new MemoryMonitor();
      monitor.metrics.ttsCacheMemory = 60 * 1024 * 1024; // 60MB

      expect(monitor.getLevel()).toBe('warning');
    });

    test('should return critical for usage above critical threshold', () => {
      const monitor = new MemoryMonitor();
      monitor.metrics.ttsCacheMemory = 120 * 1024 * 1024; // 120MB

      expect(monitor.getLevel()).toBe('critical');
    });
  });

  describe('formatBytes', () => {
    test('should format bytes correctly', () => {
      const monitor = new MemoryMonitor();

      expect(monitor.formatBytes(0)).toBe('0 B');
      expect(monitor.formatBytes(1024)).toBe('1 KB');
      expect(monitor.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(monitor.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    test('should handle decimal values', () => {
      const monitor = new MemoryMonitor();

      expect(monitor.formatBytes(1536)).toBe('1.5 KB');
      expect(monitor.formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });
  });

  describe('getCleanupSuggestions', () => {
    test('should suggest cleaning TTS cache when large', () => {
      const monitor = new MemoryMonitor();
      monitor.metrics.ttsCacheIndexedDB = 25 * 1024 * 1024; // 25MB

      const suggestions = monitor.getCleanupSuggestions();
      expect(suggestions).toContain('清理 TTS 音频缓存');
    });

    test('should suggest cleaning message cache when large', () => {
      const monitor = new MemoryMonitor();
      monitor.metrics.messageCache = 35 * 1024 * 1024; // 35MB

      const suggestions = monitor.getCleanupSuggestions();
      expect(suggestions).toContain('清理旧消息缓存');
    });

    test('should return empty array for normal usage', () => {
      const monitor = new MemoryMonitor();

      const suggestions = monitor.getCleanupSuggestions();
      expect(suggestions).toEqual([]);
    });
  });

  describe('start/stop monitoring', () => {
    test('should start monitoring interval', () => {
      const monitor = new MemoryMonitor();
      vi.useFakeTimers();

      monitor.start(5000);

      expect(monitor.updateInterval).not.toBeNull();

      monitor.stop();
      expect(monitor.updateInterval).toBeNull();

      vi.useRealTimers();
    });

    test('should not start duplicate intervals', () => {
      const monitor = new MemoryMonitor();
      vi.useFakeTimers();

      monitor.start(5000);
      const firstInterval = monitor.updateInterval;
      monitor.start(5000);

      expect(monitor.updateInterval).toBe(firstInterval);

      monitor.stop();
      vi.useRealTimers();
    });
  });

  describe('addListener', () => {
    test('should add and call listeners', () => {
      const monitor = new MemoryMonitor();
      const listener = vi.fn();

      monitor.addListener(listener);
      monitor.notifyListeners();

      expect(listener).toHaveBeenCalled();
    });

    test('should return unsubscribe function', () => {
      const monitor = new MemoryMonitor();
      const listener = vi.fn();

      const unsubscribe = monitor.addListener(listener);
      unsubscribe();

      monitor.notifyListeners();
      expect(listener).not.toHaveBeenCalled();
    });

    test('should handle listener errors gracefully', () => {
      const monitor = new MemoryMonitor();
      const badListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      monitor.addListener(badListener);
      monitor.addListener(goodListener);

      monitor.notifyListeners();

      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('getReport', () => {
    test('should generate complete report', () => {
      const monitor = new MemoryMonitor();
      monitor.metrics.ttsCacheMemory = 5 * 1024 * 1024;

      const report = monitor.getReport();

      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('total');
      expect(report).toHaveProperty('level');
      expect(report).toHaveProperty('thresholds');
      expect(report).toHaveProperty('suggestions');
      expect(report.metrics.formatted.ttsCacheMemory).toBe('5 MB');
    });
  });

  describe('singleton instance', () => {
    test('should export singleton instance', () => {
      expect(memoryMonitor).toBeInstanceOf(MemoryMonitor);
    });

    test('should have all methods available on singleton', () => {
      expect(memoryMonitor.start).toBeDefined();
      expect(memoryMonitor.stop).toBeDefined();
      expect(memoryMonitor.getReport).toBeDefined();
      expect(memoryMonitor.addListener).toBeDefined();
    });
  });
});