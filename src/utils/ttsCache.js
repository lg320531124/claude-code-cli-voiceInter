// src/utils/ttsCache.js
//
// TTS 音频缓存系统
// - 缓存生成的 TTS 音频文件
// - 支持常用短语预缓存
// - 自动过期清理
// - 内存 + IndexedDB 双层缓存

const DB_NAME = 'claude-voiceinter';
const STORE_NAME = 'tts-audio';
const MAX_CACHE_SIZE = 100; // 最大缓存条数
const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 小时过期

// 内存缓存 (快速访问)
const memoryCache = new Map();

// 常用短语预缓存列表
const COMMON_PHRASES = [
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
function generateCacheKey(text, voice, speed) {
  // 简单文本哈希 (用于识别相同文本)
  const textHash = hashText(text);
  return `${voice}:${speed}:${textHash}`;
}

/**
 * 简单文本哈希函数
 */
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * 打开 IndexedDB
 */
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // 版本 2，添加 tts-audio store

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
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
export async function getCachedAudio(text, voice = 'af_sky', speed = 1.0) {
  const key = generateCacheKey(text, voice, speed);

  // 先检查内存缓存
  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key);
    if (!isExpired(cached)) {
      console.log('[TTSCache] 内存缓存命中:', key);
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
        const cached = request.result;
        if (cached && !isExpired(cached)) {
          console.log('[TTSCache] IndexedDB 缓存命中:', key);
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
    console.error('[TTSCache] getCachedAudio error:', error);
    return null;
  }
}

/**
 * 缓存音频
 */
export async function cacheAudio(text, audioBlob, voice = 'af_sky', speed = 1.0) {
  const key = generateCacheKey(text, voice, speed);
  const timestamp = Date.now();

  const cachedItem = {
    key,
    text,
    voice,
    speed,
    audio: audioBlob,
    timestamp,
    expiry: timestamp + DEFAULT_EXPIRY,
    size: audioBlob.size
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
        console.log('[TTSCache] 音频已缓存:', key, `size: ${audioBlob.size}`);
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error('[TTSCache] cacheAudio error:', error);
    return false;
  }
}

/**
 * 检查是否过期
 */
function isExpired(cached) {
  return Date.now() > cached.expiry;
}

/**
 * 清理过期缓存
 */
export async function cleanExpiredCache() {
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

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const key = cursor.value.key;
          store.delete(key);
          memoryCache.delete(key);
          deleted++;
          cursor.continue();
        } else {
          console.log('[TTSCache] 清理过期缓存:', deleted, '条');
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
    console.error('[TTSCache] cleanExpiredCache error:', error);
    return 0;
  }
}

/**
 * 获取缓存统计
 */
export async function getCacheStats() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        const items = request.result;
        const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
        resolve({
          count: items.length,
          totalSize,
          memoryCacheCount: memoryCache.size,
          oldestTimestamp: items.length > 0 ? Math.min(...items.map(i => i.timestamp)) : null
        });
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[TTSCache] getCacheStats error:', error);
    return { count: 0, totalSize: 0, memoryCacheCount: memoryCache.size };
  }
}

/**
 * 清空所有缓存
 */
export async function clearAllCache() {
  memoryCache.clear();

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        console.log('[TTSCache] 所有缓存已清空');
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error('[TTSCache] clearAllCache error:', error);
    return false;
  }
}

/**
 * 预缓存常用短语
 * 需要传入 TTS 生成函数
 */
export async function precacheCommonPhrases(speakFunction, voice = 'af_sky', speed = 1.0) {
  console.log('[TTSCache] 开始预缓存常用短语...');
  const results = [];

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
      console.error('[TTSCache] 预缓存失败:', phrase, error);
      results.push({ phrase, status: 'error', error });
    }
  }

  const cachedCount = results.filter(r => r.status === 'cached' || r.status === 'already-cached').length;
  console.log('[TTSCache] 预缓存完成:', cachedCount, '/', COMMON_PHRASES.length);

  return results;
}

/**
 * 检查缓存大小并清理超出部分
 */
export async function enforceMaxCacheSize() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = async () => {
        db.close();
        const items = request.result;

        if (items.length <= MAX_CACHE_SIZE) {
          resolve(0);
          return;
        }

        // 按时间排序，删除最旧的
        items.sort((a, b) => a.timestamp - b.timestamp);
        const toDelete = items.slice(0, items.length - MAX_CACHE_SIZE);

        // 删除超出部分
        const deleteTx = await openDB();
        const deleteStore = deleteTx.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);

        for (const item of toDelete) {
          deleteStore.delete(item.key);
          memoryCache.delete(item.key);
        }

        deleteTx.oncomplete = () => {
          deleteTx.close();
          console.log('[TTSCache] 清理超出缓存:', toDelete.length, '条');
          resolve(toDelete.length);
        };
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[TTSCache] enforceMaxCacheSize error:', error);
    return 0;
  }
}

// 导出常用短语列表供外部使用
export { COMMON_PHRASES };

export default {
  getCachedAudio,
  cacheAudio,
  cleanExpiredCache,
  getCacheStats,
  clearAllCache,
  precacheCommonPhrases,
  enforceMaxCacheSize,
  COMMON_PHRASES
};