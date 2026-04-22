// src/utils/voiceAPI.js
//
// Voice API 网络层 - 带超时和重试机制
// - API 调用超时配置
// - 失败自动重试
// - 网络状态监控

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('请求超时');
    }
    throw error;
  }
}

/**
 * Fetch with retry
 */
async function fetchWithRetry(url, options, maxRetries = MAX_RETRIES, timeout = DEFAULT_TIMEOUT) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);

      if (response.ok) {
        return response;
      }

      // Server error - might be temporary
      if (response.status >= 500 && attempt < maxRetries - 1) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        console.log(`[VoiceAPI] 服务错误 ${response.status}, 重试中 (${attempt + 1}/${maxRetries}), 等待 ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        console.log(`[VoiceAPI] 网络错误: ${error.message}, 重试中 (${attempt + 1}/${maxRetries}), 等待 ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('请求失败');
}

/**
 * Check service status
 */
async function checkServiceStatus(endpoint, timeout = 3000) {
  try {
    const response = await fetchWithTimeout(endpoint, { method: 'GET' }, timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * STT API call
 */
async function transcribeAudio(audioBlob, options = {}) {
  const {
    language = 'auto',
    timeout = 30000, // STT needs longer timeout
    maxRetries = 2
  } = options;

  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');

  const response = await fetchWithRetry('/api/voice/stt', {
    method: 'POST',
    body: formData
  }, maxRetries, timeout);

  const result = await response.json();
  return result;
}

/**
 * TTS API call
 */
async function synthesizeSpeech(text, options = {}) {
  const {
    voice = 'af_sky',
    speed = 1.0,
    timeout = 20000,
    maxRetries = 2
  } = options;

  const response = await fetchWithRetry('/api/voice/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, speed })
  }, maxRetries, timeout);

  const audioBlob = await response.blob();
  return audioBlob;
}

/**
 * Get voice service status
 */
async function getVoiceStatus(timeout = 5000) {
  const response = await fetchWithTimeout('/api/voice/status', {
    method: 'GET'
  }, timeout);

  const status = await response.json();
  return status;
}

/**
 * Network status monitor
 */
class NetworkMonitor {
  constructor() {
    this.status = 'unknown';
    this.listeners = [];
    this.checkInterval = null;
  }

  start(checkIntervalMs = 30000) {
    this.checkInterval = setInterval(async () => {
      try {
        const status = await getVoiceStatus(3000);
        const newStatus = status.ready ? 'good' : 'partial';
        this.updateStatus(newStatus);
      } catch {
        this.updateStatus('offline');
      }
    }, checkIntervalMs);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  updateStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.listeners.forEach(listener => listener(newStatus));
    }
  }

  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getStatus() {
    return this.status;
  }
}

// Global network monitor instance
const networkMonitor = new NetworkMonitor();

export {
  fetchWithTimeout,
  fetchWithRetry,
  checkServiceStatus,
  transcribeAudio,
  synthesizeSpeech,
  getVoiceStatus,
  NetworkMonitor,
  networkMonitor,
  DEFAULT_TIMEOUT,
  MAX_RETRIES
};

export default {
  transcribeAudio,
  synthesizeSpeech,
  getVoiceStatus,
  networkMonitor
};