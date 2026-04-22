// src/__tests__/setup.js
// Test environment setup

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock IndexedDB with proper async handling
const createIDBRequestMock = (result, error = null) => {
  const request = {
    result: result,
    error: error,
    onsuccess: null,
    onerror: null,
    source: null
  };

  // Simulate async resolution
  setTimeout(() => {
    if (error && request.onerror) {
      request.onerror({ target: request });
    } else if (request.onsuccess) {
      request.onsuccess({ target: request });
    }
  }, 0);

  return request;
};

class MockObjectStore {
  constructor(name) {
    this.name = name;
    this.data = new Map();
    this.indexes = new Map();
  }

  put(item) {
    this.data.set(item.key, item);
    return createIDBRequestMock(true);
  }

  get(key) {
    const item = this.data.get(key);
    return createIDBRequestMock(item || null);
  }

  delete(key) {
    this.data.delete(key);
    return createIDBRequestMock(true);
  }

  clear() {
    this.data.clear();
    return createIDBRequestMock(true);
  }

  getAll() {
    return createIDBRequestMock(Array.from(this.data.values()));
  }

  count() {
    return createIDBRequestMock(this.data.size);
  }

  createIndex(name, keyPath, options) {
    this.indexes.set(name, { name, keyPath, options });
    return { name, keyPath, options };
  }

  index(name) {
    return {
      openCursor: (range) => {
        const items = Array.from(this.data.values()).filter(item => {
          if (!range) return true;
          return true; // Simplified range check
        });
        const request = createIDBRequestMock(null);

        // Simulate cursor
        let cursorIndex = 0;
        const cursor = {
          value: items[cursorIndex],
          continue: () => {
            cursorIndex++;
            if (cursorIndex < items.length) {
              cursor.value = items[cursorIndex];
              if (request.onsuccess) {
                request.onsuccess({ target: { result: cursor } });
              }
            } else {
              cursor.value = null;
              if (request.onsuccess) {
                request.onsuccess({ target: { result: null } });
              }
            }
          }
        };

        setTimeout(() => {
          if (items.length > 0) {
            request.result = cursor;
          } else {
            request.result = null;
          }
          if (request.onsuccess) {
            request.onsuccess({ target: request });
          }
        }, 0);

        return request;
      }
    };
  }
}

class MockTransaction {
  constructor(db, storeNames, mode) {
    this.db = db;
    this.mode = mode;
    this.objectStores = {};
    this.oncomplete = null;
    this.onerror = null;

    storeNames.forEach(name => {
      this.objectStores[name] = db.stores.get(name) || new MockObjectStore(name);
    });

    // Simulate transaction completion
    setTimeout(() => {
      if (this.oncomplete) {
        this.oncomplete();
      }
    }, 0);
  }

  objectStore(name) {
    return this.objectStores[name] || new MockObjectStore(name);
  }
}

class MockIndexedDB {
  constructor() {
    this.databases = new Map();
    this.stores = new Map();
  }

  open(name, version = 1) {
    const db = {
      name: name,
      version: version,
      objectStoreNames: { contains: (n) => this.stores.has(n) },
      stores: this.stores,

      createObjectStore: (storeName, options) => {
        const store = new MockObjectStore(storeName);
        this.stores.set(storeName, store);
        return store;
      },

      transaction: (storeNames, mode = 'readonly') => {
        return new MockTransaction(this, Array.isArray(storeNames) ? storeNames : [storeNames], mode);
      },

      close: () => {}
    };

    const request = createIDBRequestMock(db);

    // Handle onupgradeneeded
    setTimeout(() => {
      if (version > 1) {
        const event = { target: { result: db } };
        if (request.onupgradeneeded) {
          request.onupgradeneeded(event);
        }
      }
    }, 0);

    return request;
  }
}

Object.defineProperty(window, 'indexedDB', { value: new MockIndexedDB() });

// Mock IDBKeyRange
window.IDBKeyRange = {
  upperBound: (value) => ({ upper: value, lower: null }),
  lowerBound: (value) => ({ lower: value, upper: null }),
  bound: (lower, upper) => ({ lower, upper }),
  only: (value) => ({ lower: value, upper: value })
};

// Mock SpeechSynthesis
const speechSynthesisMock = {
  speak: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: () => [
    { name: 'Default Voice', lang: 'zh-CN' }
  ],
  speaking: false,
  paused: false,
  pending: false,
  onvoiceschanged: null
};

Object.defineProperty(window, 'speechSynthesis', { value: speechSynthesisMock });

// Mock WebSocket
class WebSocketMock {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;

    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen({ target: this });
    }, 0);
  }

  send() {}
  close() {
    this.readyState = 3;
    if (this.onclose) this.onclose({ target: this });
  }
  addEventListener() {}
  removeEventListener() {}
}

WebSocketMock.CONNECTING = 0;
WebSocketMock.OPEN = 1;
WebSocketMock.CLOSING = 2;
WebSocketMock.CLOSED = 3;

Object.defineProperty(window, 'WebSocket', { value: WebSocketMock });

// Mock fetch
global.fetch = vi.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({})
}));

// Mock navigator.storage
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: () => Promise.resolve({ usage: 0, quota: 1000000000 })
  },
  configurable: true
});

// Mock Blob.size
Object.defineProperty(Blob.prototype, 'size', {
  get: function() {
    return this._data ? this._data.length : 0;
  },
  configurable: true
});

// Global test utilities
global.testUtils = {
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  mockAudioBuffer: () => new Float32Array(1024)
};

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});