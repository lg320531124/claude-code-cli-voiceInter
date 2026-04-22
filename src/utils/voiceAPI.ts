// src/utils/voiceAPI.ts
//
// Voice API 网络层 - 带超时和重试机制
// - API 调用超时配置
// - 失败自动重试
// - 网络状态监控

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

interface TranscribeOptions {
  language?: string;
  timeout?: number;
  maxRetries?: number;
}

interface TranscribeResult {
  success: boolean;
  text?: string;
  error?: string;
}

interface SynthesizeOptions {
  voice?: string;
  speed?: number;
  timeout?: number;
  maxRetries?: number;
}

interface VoiceStatus {
  whisper: string;
  kokoro: string;
  ready: boolean;
}

type NetworkStatus = 'unknown' | 'good' | 'partial' | 'offline';
type StatusListener = (status: NetworkStatus) => void;

interface FetchOptions extends RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: FormData | string;
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时');
    }
    throw error;
  }
}

/**
 * Fetch with retry
 */
async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
  maxRetries: number = MAX_RETRIES,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);

      if (response.ok) {
        return response;
      }

      // Server error - might be temporary
      if (response.status >= 500 && attempt < maxRetries - 1) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        console.log(
          `[VoiceAPI] 服务错误 ${response.status}, 重试中 (${attempt + 1}/${maxRetries}), 等待 ${delay}ms`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt < maxRetries - 1) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        console.log(
          `[VoiceAPI] 网络错误: ${lastError.message}, 重试中 (${attempt + 1}/${maxRetries}), 等待 ${delay}ms`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('请求失败');
}

/**
 * Check service status
 */
async function checkServiceStatus(endpoint: string, timeout: number = 3000): Promise<boolean> {
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
async function transcribeAudio(audioBlob: Blob, options: TranscribeOptions = {}): Promise<TranscribeResult> {
  const {
    language = 'auto',
    timeout = 30000, // STT needs longer timeout
    maxRetries = 2,
  } = options;

  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  if (language !== 'auto') {
    formData.append('language', language);
  }

  const response = await fetchWithRetry(
    '/api/voice/stt',
    {
      method: 'POST',
      body: formData,
    },
    maxRetries,
    timeout
  );

  const result = await response.json();
  return result as TranscribeResult;
}

/**
 * TTS API call
 */
async function synthesizeSpeech(text: string, options: SynthesizeOptions = {}): Promise<Blob> {
  const {
    voice = 'af_sky',
    speed = 1.0,
    timeout = 20000,
    maxRetries = 2,
  } = options;

  const response = await fetchWithRetry(
    '/api/voice/tts',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed }),
    },
    maxRetries,
    timeout
  );

  const audioBlob = await response.blob();
  return audioBlob;
}

/**
 * Get voice service status
 */
async function getVoiceStatus(timeout: number = 5000): Promise<VoiceStatus> {
  const response = await fetchWithTimeout(
    '/api/voice/status',
    {
      method: 'GET',
    },
    timeout
  );

  const status = await response.json();
  return status as VoiceStatus;
}

/**
 * Network status monitor
 */
class NetworkMonitor {
  private status: NetworkStatus = 'unknown';
  private listeners: StatusListener[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  start(checkIntervalMs: number = 30000): void {
    this.checkInterval = setInterval(async () => {
      try {
        const status = await getVoiceStatus(3000);
        const newStatus: NetworkStatus = status.ready ? 'good' : 'partial';
        this.updateStatus(newStatus);
      } catch {
        this.updateStatus('offline');
      }
    }, checkIntervalMs);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private updateStatus(newStatus: NetworkStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.listeners.forEach(listener => listener(newStatus));
    }
  }

  addListener(listener: StatusListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getStatus(): NetworkStatus {
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
  MAX_RETRIES,
};

export type {
  TranscribeOptions,
  TranscribeResult,
  SynthesizeOptions,
  VoiceStatus,
  NetworkStatus,
  StatusListener,
  FetchOptions,
};

export default {
  transcribeAudio,
  synthesizeSpeech,
  getVoiceStatus,
  networkMonitor,
};