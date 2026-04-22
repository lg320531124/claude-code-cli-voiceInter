// src/hooks/useAudioWorker.js
//
// WebWorker audio processing hook
// - Offload audio processing to worker
// - Support resampling and compression
// - Non-blocking audio handling

import { useState, useEffect, useRef, useCallback } from 'react';

function useAudioWorker() {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    bufferChunks: 0,
    totalSamples: 0,
    estimatedSize: 0,
    estimatedDuration: 0
  });
  const [error, setError] = useState(null);

  const workerRef = useRef(null);
  const resultQueueRef = useRef([]);

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

      workerRef.current.onmessage = (e) => {
        const { type, data, error, stats: newStats, config } = e.data;

        switch (type) {
          case 'configured':
            console.log('[useAudioWorker] Worker configured:', config);
            setIsReady(true);
            break;

          case 'processed':
            resultQueueRef.current.push({
              data: e.data.data,
              samples: e.data.samples,
              totalSamples: e.data.totalSamples
            });
            setIsProcessing(false);
            break;

          case 'compressed':
            resultQueueRef.current.push({
              type: 'compressed',
              data: e.data.data,
              originalSize: e.data.originalSize,
              compressedSize: e.data.compressedSize
            });
            setIsProcessing(false);
            break;

          case 'stats':
            setStats(newStats);
            break;

          case 'cleared':
            resultQueueRef.current = [];
            setStats({
              bufferChunks: 0,
              totalSamples: 0,
              estimatedSize: 0,
              estimatedDuration: 0
            });
            break;

          case 'error':
            setError(error);
            setIsProcessing(false);
            console.error('[useAudioWorker] Worker error:', error);
            break;

          default:
            console.log('[useAudioWorker] Unknown response:', type);
        }
      };

      workerRef.current.onerror = (e) => {
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
          compressionQuality: 0.8
        }
      });

    } catch (e) {
      setError('Failed to create audio worker: ' + e.message);
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
  const processAudio = useCallback((audioData, sourceSampleRate = 48000) => {
    if (!workerRef.current || !isReady) {
      console.warn('[useAudioWorker] Worker not ready');
      return null;
    }

    setIsProcessing(true);
    setError(null);

    workerRef.current.postMessage({
      type: 'process',
      data: audioData,
      options: { sourceSampleRate }
    });

    // Return a promise for the result
    return new Promise((resolve, reject) => {
      // Check for result periodically
      const checkResult = () => {
        const result = resultQueueRef.current.find(r => r.samples);
        if (result) {
          resultQueueRef.current = resultQueueRef.current.filter(r => !r.samples);
          resolve(result);
        } else if (error) {
          reject(new Error(error));
        }
      };

      // Give worker time to process (typically very fast)
      setTimeout(checkResult, 50);
    });
  }, [isReady, error]);

  // Compress audio
  const compressAudio = useCallback((audioData, quality = 0.8) => {
    if (!workerRef.current || !isReady) {
      console.warn('[useAudioWorker] Worker not ready');
      return null;
    }

    setIsProcessing(true);

    workerRef.current.postMessage({
      type: 'compress',
      data: audioData,
      options: { quality }
    });

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const result = resultQueueRef.current.find(r => r.type === 'compressed');
        if (result) {
          resultQueueRef.current = resultQueueRef.current.filter(r => r.type !== 'compressed');
          resolve(result);
        } else if (error) {
          reject(new Error(error));
        }
      }, 100);
    });
  }, [isReady, error]);

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
  const configure = useCallback((options) => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      type: 'configure',
      options
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
    configure
  };
}

export default useAudioWorker;