// src/utils/ttsCache.ts
//
// TTS 音频缓存系统
// - 缓存生成的 TTS 音频文件
// - 支持常用短语预缓存
// - 自动过期清理
// - 内存 + IndexedDB 双层缓存

import logger from './logger';

logger.setContext('TTSCache');

const DB_NAME = 'claude-voiceinter';
const STORE_NAME = 'tts-audio';
const MAX_CACHE_SIZE = 100; // 最大缓存条数
const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 小时过期

interface CachedItem {
  key: string;
  text: string;
  voice: string;
  speed: number;
  audio: Blob;
  timestamp: number;
  expiry: number;
  size: number;
}

interface CacheStats {
  count: number;
  totalSize: number;
  memoryCacheCount: number;
  oldestTimestamp: number | null;
}

interface PrecacheResult {
  phrase: string;
  status: 'cached' | 'already-cached' | 'failed' | 'error';
  error?: Error;
}

type SpeakFunction = (text: string) => Promise<Blob | null>;

// 内存缓存 (快速访问)
const memoryCache = new Map<string, CachedItem>();

// 常用短语预缓存列表
const COMMON_PHRASES: string[] = [
  '你好',
  '好的',
  '明白了',
  '请稍等',
  '正在处理',
  '已完成',
  '没问题',
  '谢谢',
  '再见',
  '你好，有什么可以帮你的吗？',
];

/**
 * 生成缓存键
 * 格式: voice:speed:textHash
 */
function generateCacheKey(text: string, voice: string, speed: number): string {
  // 简单文本哈希 (用于识别相同文本)
  const textHash = hashText(text);
  return `${voice}:${speed}:${textHash}`;
}

/**
 * 简单文本哈希函数
 */
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * 打开 IndexedDB
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // 版本 2，添加 tts-audio store

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * 获取缓存音频
 */
export async function getCachedAudio(
  text: string,
  voice: string = 'af_sky',
  speed: number = 1.0
): Promise<Blob | null> {
  const key = generateCacheKey(text, voice, speed);

  // 先检查内存缓存
  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key)!;
    if (!isExpired(cached)) {
      logger.debug('内存缓存命中', { key });
      return cached.audio;
    } else {
      memoryCache.delete(key);
    }
  }

  // 检查 IndexedDB 缓存
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        db.close();
        const cached = request.result as CachedItem | undefined;
        if (cached && !isExpired(cached)) {
          logger.debug('IndexedDB 缓存命中', { key });
          // 存入内存缓存
          memoryCache.set(key, cached);
          resolve(cached.audio);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    logger.error('getCachedAudio error', { error });
    return null;
  }
}

/**
 * 缓存音频
 */
export async function cacheAudio(
  text: string,
  audioBlob: Blob,
  voice: string = 'af_sky',
  speed: number = 1.0
): Promise<boolean> {
  const key = generateCacheKey(text, voice, speed);
  const timestamp = Date.now();

  const cachedItem: CachedItem = {
    key,
    text,
    voice,
    speed,
    audio: audioBlob,
    timestamp,
    expiry: timestamp + DEFAULT_EXPIRY,
    size: audioBlob.size,
  };

  // 存入内存缓存
  memoryCache.set(key, cachedItem);

  // 存入 IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(cachedItem);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        logger.debug('音频已缓存', { key, size: audioBlob.size });
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    logger.error('cacheAudio error', { error });
    return false;
  }
}

/**
 * 检查是否过期
 */
function isExpired(cached: CachedItem): boolean {
  return Date.now() > cached.expiry;
}

/**
 * 清理过期缓存
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    const now = Date.now();
    const range = IDBKeyRange.upperBound(now - DEFAULT_EXPIRY);

    return new Promise((resolve, reject) => {
      const request = index.openCursor(range);
      let deleted = 0;

      request.onsuccess = (event: Event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const key = cursor.value.key;
          store.delete(key);
          memoryCache.delete(key);
          deleted++;
          cursor.continue();
        } else {
          logger.info('清理过期缓存', { count: deleted });
          resolve(deleted);
        }
      };
      request.onerror = () => reject(request.error);

      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    logger.error('cleanExpiredCache error', { error });
    return 0;
  }
}

/**
 * 获取缓存统计
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        const items = request.result as CachedItem[];
        const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
        resolve({
          count: items.length,
          totalSize,
          memoryCacheCount: memoryCache.size,
          oldestTimestamp: items.length > 0 ? Math.min(...items.map(i => i.timestamp)) : null,
        });
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    logger.error('getCacheStats error', { error });
    return { count: 0, totalSize: 0, memoryCacheCount: memoryCache.size, oldestTimestamp: null };
  }
}

/**
 * 清空所有缓存
 */
export async function clearAllCache(): Promise<boolean> {
  memoryCache.clear();

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        logger.info('所有缓存已清空');
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    logger.error('clearAllCache error', { error });
    return false;
  }
}

/**
 * 预缓存常用短语
 * 需要传入 TTS 生成函数
 */
export async function precacheCommonPhrases(
  speakFunction: SpeakFunction,
  voice: string = 'af_sky',
  speed: number = 1.0
): Promise<PrecacheResult[]> {
  logger.info('开始预缓存常用短语...');
  const results: PrecacheResult[] = [];

  for (const phrase of COMMON_PHRASES) {
    try {
      // 检查是否已缓存
      const cached = await getCachedAudio(phrase, voice, speed);
      if (cached) {
        results.push({ phrase, status: 'already-cached' });
        continue;
      }

      // 生成并缓存
      const audioBlob = await speakFunction(phrase);
      if (audioBlob) {
        await cacheAudio(phrase, audioBlob, voice, speed);
        results.push({ phrase, status: 'cached' });
      } else {
        results.push({ phrase, status: 'failed' });
      }
    } catch (error) {
      logger.error('预缓存失败', { phrase, error });
      results.push({ phrase, status: 'error', error: error as Error });
    }
  }

  const cachedCount = results.filter(
    r => r.status === 'cached' || r.status === 'already-cached'
  ).length;
  logger.info('预缓存完成', { cached: cachedCount, total: COMMON_PHRASES.length });

  return results;
}

/**
 * 检查缓存大小并清理超出部分
 */
export async function enforceMaxCacheSize(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = async () => {
        db.close();
        const items = request.result as CachedItem[];

        if (items.length <= MAX_CACHE_SIZE) {
          resolve(0);
          return;
        }

        // 按时间排序，删除最旧的
        items.sort((a, b) => a.timestamp - b.timestamp);
        const toDelete = items.slice(0, items.length - MAX_CACHE_SIZE);

        // 删除超出部分
        const deleteDb = await openDB();
        const deleteTx = deleteDb.transaction(STORE_NAME, 'readwrite');
        const deleteStore = deleteTx.objectStore(STORE_NAME);

        for (const item of toDelete) {
          deleteStore.delete(item.key);
          memoryCache.delete(item.key);
        }

        deleteTx.oncomplete = () => {
          deleteDb.close();
          logger.info('清理超出缓存', { count: toDelete.length });
          resolve(toDelete.length);
        };

        deleteTx.onerror = () => {
          deleteDb.close();
          reject(deleteTx.error);
        };
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    logger.error('enforceMaxCacheSize error', { error });
    return 0;
  }
}

// 导出常用短语列表供外部使用
export { COMMON_PHRASES };
export type { CachedItem, CacheStats, PrecacheResult, SpeakFunction };

export default {
  getCachedAudio,
  cacheAudio,
  cleanExpiredCache,
  getCacheStats,
  clearAllCache,
  precacheCommonPhrases,
  enforceMaxCacheSize,
  COMMON_PHRASES,
};
