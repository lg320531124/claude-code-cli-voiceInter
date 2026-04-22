// src/hooks/useAudioWorker.ts
//
// WebWorker audio processing hook
// - Offload audio processing to worker
// - Support resampling and compression
// - Non-blocking audio handling

import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioWorkerStats {
  bufferChunks: number;
  totalSamples: number;
  estimatedSize: number;
  estimatedDuration: number;
}

interface WorkerResult {
  data?: Float32Array;
  samples?: number;
  totalSamples?: number;
  type?: string;
  originalSize?: number;
  compressedSize?: number;
}

interface WorkerMessage {
  type: 'configure' | 'process' | 'compress' | 'getStats' | 'clear';
  data?: Float32Array;
  options?: {
    targetSampleRate?: number;
    chunkSize?: number;
    compressionQuality?: number;
    sourceSampleRate?: number;
    quality?: number;
  };
}

interface WorkerResponse {
  type: 'configured' | 'processed' | 'compressed' | 'stats' | 'cleared' | 'error';
  data?: Float32Array;
  samples?: number;
  totalSamples?: number;
  originalSize?: number;
  compressedSize?: number;
  error?: string;
  stats?: AudioWorkerStats;
  config?: WorkerMessage['options'];
}

interface ProcessResult {
  data: Float32Array;
  samples: number;
  totalSamples: number;
}

interface CompressResult {
  type: 'compressed';
  data: Float32Array;
  originalSize: number;
  compressedSize: number;
}

interface AudioWorkerResult {
  isReady: boolean;
  isProcessing: boolean;
  stats: AudioWorkerStats;
  error: string | null;
  processAudio: (audioData: Float32Array, sourceSampleRate?: number) => Promise<ProcessResult | null>;
  compressAudio: (audioData: Float32Array, quality?: number) => Promise<CompressResult | null>;
  getStats: () => void;
  clearBuffer: () => void;
  configure: (options: WorkerMessage['options']) => void;
}

function useAudioWorker(): AudioWorkerResult {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<AudioWorkerStats>({
    bufferChunks: 0,
    totalSamples: 0,
    estimatedSize: 0,
    estimatedDuration: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const resultQueueRef = useRef<WorkerResult[]>([]);

  // Initialize worker
  useEffect(() => {
    // Check if WebWorker is supported
    if (!window.Worker) {
      setError('WebWorker not supported in this browser');
      return;
    }

    try {
      // Create worker from public directory
      workerRef.current = new Worker('/audioWorker.js');

      workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { type, data, error: workerError, stats: newStats, config } = e.data;

        switch (type) {
          case 'configured':
            console.log('[useAudioWorker] Worker configured:', config);
            setIsReady(true);
            break;

          case 'processed':
            resultQueueRef.current.push({
              data: e.data.data,
              samples: e.data.samples,
              totalSamples: e.data.totalSamples,
            });
            setIsProcessing(false);
            break;

          case 'compressed':
            resultQueueRef.current.push({
              type: 'compressed',
              data: e.data.data,
              originalSize: e.data.originalSize,
              compressedSize: e.data.compressedSize,
            });
            setIsProcessing(false);
            break;

          case 'stats':
            if (newStats) setStats(newStats);
            break;

          case 'cleared':
            resultQueueRef.current = [];
            setStats({
              bufferChunks: 0,
              totalSamples: 0,
              estimatedSize: 0,
              estimatedDuration: 0,
            });
            break;

          case 'error':
            if (workerError) setError(workerError);
            setIsProcessing(false);
            console.error('[useAudioWorker] Worker error:', workerError);
            break;

          default:
            console.log('[useAudioWorker] Unknown response:', type);
        }
      };

      workerRef.current.onerror = (e: ErrorEvent) => {
        setError(e.message || 'Worker error');
        setIsProcessing(false);
        console.error('[useAudioWorker] Worker error:', e);
      };

      // Configure worker
      workerRef.current.postMessage({
        type: 'configure',
        options: {
          targetSampleRate: 16000,
          chunkSize: 4096,
          compressionQuality: 0.8,
        },
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError('Failed to create audio worker: ' + errorMessage);
    }

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Process audio chunk
  const processAudio = useCallback(
    (
      audioData: Float32Array,
      sourceSampleRate: number = 48000
    ): Promise<ProcessResult | null> => {
      if (!workerRef.current || !isReady) {
        console.warn('[useAudioWorker] Worker not ready');
        return Promise.resolve(null);
      }

      setIsProcessing(true);
      setError(null);

      workerRef.current.postMessage({
        type: 'process',
        data: audioData,
        options: { sourceSampleRate },
      });

      // Return a promise for the result
      return new Promise((resolve, reject) => {
        // Check for result periodically
        const checkResult = () => {
          const result = resultQueueRef.current.find(r => r.samples);
          if (result) {
            resultQueueRef.current = resultQueueRef.current.filter(r => !r.samples);
            resolve({
              data: result.data!,
              samples: result.samples!,
              totalSamples: result.totalSamples!,
            });
          } else if (error) {
            reject(new Error(error));
          }
        };

        // Give worker time to process (typically very fast)
        setTimeout(checkResult, 50);
      });
    },
    [isReady, error]
  );

  // Compress audio
  const compressAudio = useCallback(
    (audioData: Float32Array, quality: number = 0.8): Promise<CompressResult | null> => {
      if (!workerRef.current || !isReady) {
        console.warn('[useAudioWorker] Worker not ready');
        return Promise.resolve(null);
      }

      setIsProcessing(true);

      workerRef.current.postMessage({
        type: 'compress',
        data: audioData,
        options: { quality },
      });

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const result = resultQueueRef.current.find(r => r.type === 'compressed');
          if (result) {
            resultQueueRef.current = resultQueueRef.current.filter(r => r.type !== 'compressed');
            resolve({
              type: 'compressed',
              data: result.data!,
              originalSize: result.originalSize!,
              compressedSize: result.compressedSize!,
            });
          } else if (error) {
            reject(new Error(error));
          }
        }, 100);
      });
    },
    [isReady, error]
  );

  // Get stats
  const getStats = useCallback(() => {
    if (!workerRef.current || !isReady) return;

    workerRef.current.postMessage({ type: 'getStats' });
  }, [isReady]);

  // Clear buffer
  const clearBuffer = useCallback(() => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({ type: 'clear' });
    resultQueueRef.current = [];
  }, []);

  // Configure
  const configure = useCallback((options: WorkerMessage['options']) => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      type: 'configure',
      options,
    });
  }, []);

  return {
    isReady,
    isProcessing,
    stats,
    error,
    processAudio,
    compressAudio,
    getStats,
    clearBuffer,
    configure,
  };
}

export default useAudioWorker;

export type {
  AudioWorkerStats,
  WorkerResult,
  WorkerMessage,
  WorkerResponse,
  ProcessResult,
  CompressResult,
  AudioWorkerResult,
};