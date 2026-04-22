// src/utils/messageCache.ts
//
// IndexedDB 消息缓存
// - 消息持久化存储
// - 支持大量消息缓存
// - 自动过期清理

const DB_NAME = 'claude-voiceinter';
const STORE_NAME = 'messages';
const MAX_MESSAGES = 1000;

interface CachedMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sessionId?: string;
}

interface DBEventTarget extends EventTarget {
  result: IDBDatabase;
  error: Error | null;
}

interface IDBEvent extends Event {
  target: DBEventTarget;
}

interface IDBRequestWithResult<T> extends IDBRequest {
  result: T;
}

interface RequestEvent extends Event {
  target: IDBRequestWithResult<IDBDatabase>;
}

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: Event) => {
      const db = (event.target as IDBRequestWithResult<IDBDatabase>).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export async function saveMessages(messages: CachedMessage[]): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // 先清除旧消息
    store.clear();

    // 添加所有消息
    for (const msg of messages) {
      store.add(msg);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (error: unknown) {
    console.error('[messageCache] saveMessages error:', error);
    return false;
  }
}

export async function loadMessages(): Promise<CachedMessage[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        resolve(request.result as CachedMessage[]);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error: unknown) {
    console.error('[messageCache] loadMessages error:', error);
    return [];
  }
}

export async function clearMessages(): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (error: unknown) {
    console.error('[messageCache] clearMessages error:', error);
    return false;
  }
}

export async function getMessageCount(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error: unknown) {
    console.error('[messageCache] getMessageCount error:', error);
    return 0;
  }
}

export type { CachedMessage };

export default {
  saveMessages,
  loadMessages,
  clearMessages,
  getMessageCount,
  MAX_MESSAGES,
};
