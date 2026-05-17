// src/hooks/useLocalWhisper.ts
//
// Local Whisper STT Hook
// Uses Whisper service for Speech-to-Text with VAD

import { useState, useRef, useCallback, useEffect } from 'react';
import { getErrorInfo } from '../utils/voiceErrors';

interface LocalWhisperOptions {
  language?: string;
  onResult?: (text: string) => void;
  onError?: (errorType: string, errorInfo: ReturnType<typeof getErrorInfo>) => void;
  autoStop?: boolean;
  silenceThreshold?: number;
}

interface LocalWhisperResult {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  serviceReady: boolean | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  isSupported: boolean;
}

export function useLocalWhisper(options: LocalWhisperOptions = {}): LocalWhisperResult {
  const {
    language = 'auto',
    onResult,
    onError,
    autoStop = true,
    silenceThreshold = 1000,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [serviceReady, setServiceReady] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastSpeechTimeRef = useRef(Date.now());

  useEffect(() => {
    fetch('/api/voice/status')
      .then(res => res.json())
      .then(data => setServiceReady(data.ready))
      .catch(() => setServiceReady(false));
  }, []);

  const startVAD = useCallback(
    (stream: MediaStream): (() => void) => {
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

        const now = Date.now();
        if (maxVolume > 0.01) {
          lastSpeechTimeRef.current = now;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (autoStop && !silenceTimerRef.current) {
          const silenceDuration = now - lastSpeechTimeRef.current;
          if (silenceDuration >= silenceThreshold) {
            silenceTimerRef.current = setTimeout(() => {
              if (isListening && mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
                setIsListening(false);
              }
            }, silenceThreshold);
          }
        }
      };

      const vadInterval = setInterval(checkActivity, 100);
      return () => {
        clearInterval(vadInterval);
        audioContextRef.current?.close();
      };
    },
    [autoStop, silenceThreshold, isListening]
  );

  const sendToWhisper = useCallback(
    async (audioBlob: Blob): Promise<void> => {
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        formData.append('language', language);

        const response = await fetch('/api/voice/stt', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          setTranscript(result.text);
          onResult?.(result.text);
        } else {
          const errorType = result.error?.includes('Whisper') ? 'whisper-offline' : 'network-error';
          setError(errorType);
          onError?.(errorType, getErrorInfo(errorType));
        }
      } catch {
        setError('network-error');
        onError?.('network-error', getErrorInfo('network-error'));
      }
    },
    [language, onResult, onError]
  );

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const startListening = useCallback(async () => {
    try {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      audioChunksRef.current = [];
      lastSpeechTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000 },
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendToWhisper(blob);
        cleanup();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsListening(true);
      startVAD(stream);
    } catch (err: unknown) {
      const errorType =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'microphone-access-denied'
          : 'audio-capture';
      setError(errorType);
      onError?.(errorType, getErrorInfo(errorType));
    }
  }, [language, onResult, onError, startVAD, sendToWhisper, cleanup]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  useEffect(() => {
    return () => {
      cleanup();
      mediaRecorderRef.current?.stop();
    };
  }, [cleanup]);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    serviceReady,
    startListening,
    stopListening,
    isSupported: serviceReady !== false,
  };
}

export type { LocalWhisperOptions, LocalWhisperResult };
