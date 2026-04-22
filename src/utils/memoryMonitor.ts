// src/utils/memoryMonitor.ts
//
// 内存使用监控
// - 跟踪 TTS 缓存大小
// - 跟踪消息缓存大小
// - 跟踪音频缓冲区
// - 显示内存使用统计
// - 内存警告阈值
// - 自动清理建议

import logger from './logger';

logger.setContext('MemoryMonitor');

interface MemoryMetrics {
  ttsCacheMemory: number;
  ttsCacheIndexedDB: number;
  messageCache: number;
  audioBuffers: number;
  lastUpdate: number | null;
}

interface MemoryThresholds {
  warning: number;
  critical: number;
  maxCacheSize: number;
}

interface MemoryAlert {
  type: 'alert';
  level: 'normal' | 'warning' | 'critical';
  usage: number;
  timestamp: number;
  suggestions: string[];
}

interface MemoryUpdateEvent {
  type: 'update' | 'alert' | 'cleanup';
  metrics?: MemoryMetrics;
  total?: number;
  level?: 'normal' | 'warning' | 'critical';
  timestamp?: number;
  usage?: number;
  suggestions?: string[];
  results?: Record<string, string>;
}

interface MemoryReport {
  metrics: {
    ttsCacheMemory: number;
    ttsCacheIndexedDB: number;
    messageCache: number;
    audioBuffers: number;
    lastUpdate: number | null;
    formatted: {
      ttsCacheMemory: string;
      ttsCacheIndexedDB: string;
      messageCache: string;
      audioBuffers: string;
    };
  };
  total: {
    bytes: number;
    formatted: string;
  };
  level: 'normal' | 'warning' | 'critical';
  thresholds: {
    warning: string;
    critical: string;
  };
  suggestions: string[];
}

interface CleanupOptions {
  ttsCache?: boolean;
  messageCache?: boolean;
}

type MemoryLevel = 'normal' | 'warning' | 'critical';
type MemoryEventListener = (event: MemoryUpdateEvent) => void;

class MemoryMonitor {
  private metrics: MemoryMetrics;
  private thresholds: MemoryThresholds;
  private listeners: MemoryEventListener[];
  private updateInterval: ReturnType<typeof setInterval> | null;

  constructor() {
    this.metrics = {
      ttsCacheMemory: 0,
      ttsCacheIndexedDB: 0,
      messageCache: 0,
      audioBuffers: 0,
      lastUpdate: null,
    };

    this.thresholds = {
      warning: 50 * 1024 * 1024, // 50MB 警告阈值
      critical: 100 * 1024 * 1024, // 100MB 临界阈值
      maxCacheSize: 100, // 最大缓存条目数
    };

    this.listeners = [];
    this.updateInterval = null;
  }

  // 启动监控
  start(intervalMs: number = 10000): void {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      this.updateMetrics();
      this.checkThresholds();
      this.notifyListeners();
    }, intervalMs);

    logger.info('Started monitoring', { interval: intervalMs });
  }

  // 停止监控
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info('Stopped monitoring');
    }
  }

  // 更新指标
  async updateMetrics(): Promise<void> {
    // 估算 TTS 缓存大小
    const ttsCache = await this.estimateTTSCacheSize();
    this.metrics.ttsCacheMemory = ttsCache.memory;
    this.metrics.ttsCacheIndexedDB = ttsCache.indexedDB;

    // 估算消息缓存大小
    this.metrics.messageCache = await this.estimateMessageCacheSize();

    // 估算音频缓冲区
    this.metrics.audioBuffers = this.estimateAudioBuffers();

    this.metrics.lastUpdate = Date.now();
  }

  // 估算 TTS 缓存大小
  async estimateTTSCacheSize(): Promise<{ memory: number; indexedDB: number }> {
    let memorySize = 0;
    let indexedDBSize = 0;

    // 检查内存缓存（如果有全局引用）
    try {
      // 尝试从 localStorage 获取缓存统计
      const cacheStats = localStorage.getItem('tts-cache-stats');
      if (cacheStats) {
        const stats = JSON.parse(cacheStats);
        memorySize = stats.memorySize || 0;
        indexedDBSize = stats.indexedDBSize || 0;
      }

      // 估算 IndexedDB 大小
      if (window.indexedDB) {
        const estimate = await this.estimateIndexedDBUsage('tts-audio-cache');
        indexedDBSize = estimate || indexedDBSize;
      }
    } catch (e) {
      logger.warn('Failed to estimate TTS cache', { error: e });
    }

    return { memory: memorySize, indexedDB: indexedDBSize };
  }

  // 估算消息缓存大小
  async estimateMessageCacheSize(): Promise<number> {
    try {
      // 从 localStorage 估算
      const messagesKey = 'claude-chat-messages';
      const messagesData = localStorage.getItem(messagesKey);
      if (messagesData) {
        return new Blob([messagesData]).size;
      }

      // 从 IndexedDB 估算
      const estimate = await this.estimateIndexedDBUsage('claude-voiceinter');
      return estimate || 0;
    } catch (e) {
      logger.warn('Failed to estimate message cache', { error: e });
      return 0;
    }
  }

  // 估算 IndexedDB 使用量
  async estimateIndexedDBUsage(dbName: string): Promise<number> {
    try {
      // 使用 Storage API 估算（如果可用）
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }

      // 手动估算：打开数据库计算条目数
      return new Promise<number>(resolve => {
        const request = indexedDB.open(dbName);
        request.onerror = () => resolve(0);
        request.onsuccess = () => {
          const db = request.result;
          let totalSize = 0;

          // 尝试遍历所有 object stores
          if (db.objectStoreNames) {
            for (const storeName of db.objectStoreNames) {
              try {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const countRequest = store.count();

                countRequest.onsuccess = () => {
                  // 估算每条记录约 10KB
                  totalSize += countRequest.result * 10 * 1024;
                };
              } catch {
                // 忽略错误
              }
            }
          }

          db.close();
          resolve(totalSize);
        };
      });
    } catch {
      return 0;
    }
  }

  // 估算音频缓冲区使用量
  estimateAudioBuffers(): number {
    // 无法直接测量，使用估算
    // 假设每个活跃音频源约 1MB
    let activeAudioCount = 0;

    // 检查是否有正在播放的音频
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      activeAudioCount++;
    }

    return activeAudioCount * 1024 * 1024; // 1MB per active source
  }

  // 检查阈值
  checkThresholds(): void {
    const totalUsage = this.getTotalUsage();
    const level = this.getLevel();

    if (level === 'critical') {
      logger.warn('Memory usage critical', { usage: this.formatBytes(totalUsage) });
      this.emitAlert('critical', totalUsage);
    } else if (level === 'warning') {
      logger.warn('Memory usage warning', { usage: this.formatBytes(totalUsage) });
      this.emitAlert('warning', totalUsage);
    }
  }

  // 获取总使用量
  getTotalUsage(): number {
    return (
      this.metrics.ttsCacheMemory +
      this.metrics.ttsCacheIndexedDB +
      this.metrics.messageCache +
      this.metrics.audioBuffers
    );
  }

  // 获取使用级别
  getLevel(): MemoryLevel {
    const total = this.getTotalUsage();
    if (total >= this.thresholds.critical) return 'critical';
    if (total >= this.thresholds.warning) return 'warning';
    return 'normal';
  }

  // 发出警告
  emitAlert(level: MemoryLevel, usage: number): void {
    this.notifyListeners({
      type: 'alert',
      level,
      usage,
      timestamp: Date.now(),
      suggestions: this.getCleanupSuggestions(),
    });
  }

  // 获取清理建议
  getCleanupSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.metrics.ttsCacheIndexedDB > 20 * 1024 * 1024) {
      suggestions.push('清理 TTS 音频缓存');
    }

    if (this.metrics.messageCache > 30 * 1024 * 1024) {
      suggestions.push('清理旧消息缓存');
    }

    if (this.metrics.audioBuffers > 5 * 1024 * 1024) {
      suggestions.push('停止正在播放的音频');
    }

    return suggestions;
  }

  // 格式化字节大小
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 添加监听器
  addListener(callback: MemoryEventListener): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // 通知监听器
  notifyListeners(data: MemoryUpdateEvent | null = null): void {
    const event: MemoryUpdateEvent = data || {
      type: 'update',
      metrics: this.metrics,
      total: this.getTotalUsage(),
      level: this.getLevel(),
      timestamp: this.metrics.lastUpdate,
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        logger.warn('Listener error', { error: e });
      }
    });
  }

  // 获取报告
  getReport(): MemoryReport {
    return {
      metrics: {
        ...this.metrics,
        formatted: {
          ttsCacheMemory: this.formatBytes(this.metrics.ttsCacheMemory),
          ttsCacheIndexedDB: this.formatBytes(this.metrics.ttsCacheIndexedDB),
          messageCache: this.formatBytes(this.metrics.messageCache),
          audioBuffers: this.formatBytes(this.metrics.audioBuffers),
        },
      },
      total: {
        bytes: this.getTotalUsage(),
        formatted: this.formatBytes(this.getTotalUsage()),
      },
      level: this.getLevel(),
      thresholds: {
        warning: this.formatBytes(this.thresholds.warning),
        critical: this.formatBytes(this.thresholds.critical),
      },
      suggestions: this.getCleanupSuggestions(),
    };
  }

  // 手动触发清理
  async cleanup(options: CleanupOptions = {}): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    if (options.ttsCache) {
      try {
        // 清理 IndexedDB TTS 缓存
        if (window.indexedDB) {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('tts-audio-cache');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          const transaction = db.transaction(['audio-cache'], 'readwrite');
          const store = transaction.objectStore('audio-cache');
          store.clear();

          db.close();
          results.ttsCache = 'cleared';
        }
      } catch (e) {
        results.ttsCache = 'failed: ' + (e as Error).message;
      }
    }

    if (options.messageCache) {
      try {
        // 清理 localStorage 消息
        localStorage.removeItem('claude-chat-messages');
        results.messageCache = 'cleared';
      } catch (e) {
        results.messageCache = 'failed: ' + (e as Error).message;
      }
    }

    // 更新指标
    await this.updateMetrics();
    this.notifyListeners({ type: 'cleanup', results });

    return results;
  }
}

// 创建单例
const memoryMonitor = new MemoryMonitor();

// 导出
export { MemoryMonitor, memoryMonitor };
export type { MemoryMetrics, MemoryThresholds, MemoryAlert, MemoryUpdateEvent, MemoryReport, CleanupOptions, MemoryLevel };
export default memoryMonitor;