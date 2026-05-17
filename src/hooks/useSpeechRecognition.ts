// src/hooks/useSpeechRecognition.ts
//
// Speech Recognition Hook (STT)
// Uses Web Speech API for Speech-to-Text
// Default language is Chinese (zh-CN)

import { useState, useRef, useEffect, useCallback } from 'react';

const SpeechRecognitionAPI: unknown =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

type VoiceErrorType =
  | 'not-allowed'
  | 'no-speech'
  | 'audio-capture'
  | 'network'
  | 'aborted'
  | 'service-not-allowed'
  | 'browser-not-supported'
  | 'init-failed'
  | 'not-initialized'
  | 'start-failed'
  | 'restart-failed';

interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  onResult?: (text: string) => void;
  onError?: (error: string, message: string) => void;
  onEnd?: () => void;
}

interface SpeechRecognitionResult {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isInitialized: boolean;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  isSupported: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许访问',
  'no-speech': '没有检测到语音，请说话后再试',
  'audio-capture': '无法捕获音频，请检查麦克风是否正常',
  network: '网络错误，语音识别需要网络连接',
  aborted: '语音识别被中断',
  'service-not-allowed': '语音服务不可用',
  'browser-not-supported': '浏览器不支持语音识别',
  'init-failed': '语音初始化失败',
  'not-initialized': '语音未初始化',
  'start-failed': '启动失败',
  'restart-failed': '重启失败',
};

export function useSpeechRecognition(
  options: SpeechRecognitionOptions = {}
): SpeechRecognitionResult {
  const { language = 'zh-CN', continuous = true, onResult, onError, onEnd } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const recognitionRef = useRef<any>(null);
  const manuallyStoppedAtRef = useRef<number>(0);

  // Store callbacks in refs to avoid recreating SpeechRecognition on every render
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
    onEndRef.current = onEnd;
  }, [onResult, onError, onEnd]);

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      console.warn('[SpeechRecognition] Not supported');
      setError('browser-not-supported');
      return;
    }

    try {
      const recognition = new (SpeechRecognitionAPI as any)();
      recognition.lang = language;
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        // Ignore results that arrive after manual stop (browser may deliver final result after stop())
        if (manuallyStoppedAtRef.current > 0 && Date.now() - manuallyStoppedAtRef.current < 300) {
          return;
        }

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (interim) setInterimTranscript(interim);
        if (final) {
          setTranscript(final);
          onResultRef.current?.(final);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setError(event.error);
        onErrorRef.current?.(event.error, ERROR_MESSAGES[event.error] || '未知错误');
      };

      recognition.onend = () => {
        setIsListening(false);
        onEndRef.current?.();
      };

      recognitionRef.current = recognition;
      setIsInitialized(true);
    } catch {
      setError('init-failed');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [language, continuous]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('not-initialized');
      return;
    }
    if (isListening) return;

    // Reset manual stop flag so new results are accepted
    manuallyStoppedAtRef.current = 0;

    setTranscript('');
    setInterimTranscript('');
    setError(null);

    try {
      recognitionRef.current.start();
    } catch (startError: unknown) {
      if (startError instanceof Error && startError.name === 'InvalidStateError') {
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch {
              setError('start-failed');
            }
          }, 100);
        } catch {
          setError('restart-failed');
        }
      } else {
        setError('start-failed');
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      // Mark manual stop time to suppress late-arriving final results
      manuallyStoppedAtRef.current = Date.now();
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isInitialized,
    startListening,
    stopListening,
    toggleListening,
    isSupported: Boolean(SpeechRecognitionAPI),
  };
}

export type { SpeechRecognitionOptions, SpeechRecognitionResult, VoiceErrorType };
