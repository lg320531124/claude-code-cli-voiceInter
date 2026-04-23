/**
 * useStreamingWhisper - Streaming Whisper STT Hook
 * Real-time transcription with VAD auto-stop
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { getErrorInfo } from '../utils/voiceErrors';
import logger from '../utils/logger';

logger.setContext('StreamingWhisper');

interface Options {
  language?: string;
  onResult?: (text: string) => void;
  onInterimResult?: (text: string) => void;
  onError?: (errorType: string, errorInfo: ReturnType<typeof getErrorInfo>) => void;
  autoStop?: boolean;
  silenceThreshold?: number;
  streamingInterval?: number;
  accumulateMode?: boolean;
}

export type StreamingWhisperOptions = Options;

interface Result {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  serviceReady: boolean | null;
  volumeLevel: number;
  startListening: () => Promise<void>;
  stopListening: () => void;
  isSupported: boolean;
}

export type StreamingWhisperResult = Result;

export function useStreamingWhisper(options: Options = {}): Result {
  const {
    language = 'auto',
    onResult,
    onInterimResult,
    onError,
    autoStop = true,
    silenceThreshold = 3000,
    streamingInterval = 2000,
    accumulateMode = false,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [serviceReady, setServiceReady] = useState<boolean | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamingChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastSpeechTimeRef = useRef(Date.now());

  // Check service status
  useEffect(() => {
    fetch('/api/voice/status')
      .then(res => res.json())
      .then(data => setServiceReady(data.whisper === 'running'))
      .catch(() => setServiceReady(false));
  }, []);

  // Send audio chunk to Whisper
  const sendChunkToWhisper = useCallback(
    async (audioBlob: Blob, isInterim: boolean = true) => {
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');

        const response = await fetch('/api/voice/stt', { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success && result.text) {
          if (isInterim) {
            setInterimTranscript(result.text);
            onInterimResult?.(result.text);
          } else {
            setTranscript(result.text);
            onResult?.(result.text);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Whisper send failed:', { error: errorMessage });
        if (!isInterim) {
          const errorType = 'network-error';
          setError(errorType);
          onError?.(errorType, getErrorInfo(errorType));
        }
      }
    },
    [onResult, onInterimResult, onError]
  );

  // Cleanup resources
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      setVolumeLevel(0);
    }
  }, [isListening]);

  // VAD and volume detection
  const startVAD = useCallback(
    (stream: MediaStream) => {
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      source.connect(analyserRef.current);

      const dataArray = new Float32Array(analyserRef.current.frequencyBinCount);

      const checkActivity = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(dataArray);

        let maxVolume = 0;
        for (let i = 0; i < dataArray.length; i++) {
          maxVolume = Math.max(maxVolume, Math.abs(dataArray[i]));
        }

        setVolumeLevel(Math.round(maxVolume * 100));
        const now = Date.now();

        if (maxVolume > 0.01) {
          lastSpeechTimeRef.current = now;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (autoStop && !silenceTimerRef.current && isListening) {
          const silenceDuration = now - lastSpeechTimeRef.current;
          if (silenceDuration >= silenceThreshold) {
            silenceTimerRef.current = setTimeout(() => {
              if (mediaRecorderRef.current && isListening) stopListening();
            }, silenceThreshold);
          }
        }
      };

      const vadInterval = setInterval(checkActivity, 50);
      return () => {
        clearInterval(vadInterval);
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };
    },
    [autoStop, silenceThreshold, isListening, stopListening]
  );

  // Start streaming timer
  const startStreamingTimer = useCallback(() => {
    streamingTimerRef.current = setInterval(() => {
      if (streamingChunksRef.current.length > 0) {
        const blob = new Blob(streamingChunksRef.current, { type: 'audio/webm' });
        sendChunkToWhisper(blob, true);
        streamingChunksRef.current = [];
      }
    }, streamingInterval);
  }, [streamingInterval, sendChunkToWhisper]);

  // Start listening
  const startListening = useCallback(async () => {
    try {
      if (!accumulateMode) {
        setTranscript('');
        setInterimTranscript('');
      }
      setError(null);
      audioChunksRef.current = [];
      streamingChunksRef.current = [];
      lastSpeechTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000 },
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          streamingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamingTimerRef.current) {
          clearInterval(streamingTimerRef.current);
          streamingTimerRef.current = null;
        }

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendChunkToWhisper(blob, false);
        cleanup();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsListening(true);

      startVAD(stream);
      startStreamingTimer();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Whisper start failed:', { error: errorMessage });
      const errorType =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'microphone-access-denied'
          : 'audio-capture';
      setError(errorType);
      onError?.(errorType, getErrorInfo(errorType));
    }
  }, [accumulateMode, startVAD, startStreamingTimer, sendChunkToWhisper, cleanup, onError]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    serviceReady,
    volumeLevel,
    startListening,
    stopListening,
    isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
  };
}
