// src/hooks/useVoiceInteraction.ts
//
// Combined Voice Interaction Hook
// Orchestrates STT (useSpeechRecognition) and TTS (useSpeechSynthesis)

import { useCallback } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';

interface VoiceInteractionOptions {
  language?: string;
  onSpeechResult?: (text: string) => void;
  autoSpeakResponse?: boolean;
}

interface VoiceInteractionResult {
  // STT
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  errorMessage: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  // TTS
  isSpeaking: boolean;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  speakResponse: (text: string) => void;
  // Combined
  isSupported: boolean;
  isInitialized: boolean;
  isActive: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': '请允许麦克风权限',
  'no-speech': '没有检测到语音',
  'audio-capture': '麦克风无法使用',
  network: '网络错误',
  'browser-not-supported': '浏览器不支持',
  'not-initialized': '语音未初始化',
  'start-failed': '启动失败',
};

export function useVoiceInteraction(
  options: VoiceInteractionOptions = {}
): VoiceInteractionResult {
  const { language = 'zh-CN', onSpeechResult, autoSpeakResponse = true } = options;

  const stt = useSpeechRecognition({
    language,
    onResult: onSpeechResult,
    onError: (_errorType, _message) => {},
  });

  const tts = useSpeechSynthesis({ language });

  const speakResponse = useCallback(
    (text: string): void => {
      if (autoSpeakResponse && text) tts.speak(text);
    },
    [autoSpeakResponse, tts]
  );

  const getErrorMessage = useCallback((): string | null => {
    if (!stt.isSupported) return '浏览器不支持语音识别，请使用 Chrome 或 Safari';
    if (stt.error) return ERROR_MESSAGES[stt.error] || '语音错误';
    return null;
  }, [stt.isSupported, stt.error]);

  return {
    isListening: stt.isListening,
    transcript: stt.transcript,
    interimTranscript: stt.interimTranscript,
    error: stt.error,
    errorMessage: getErrorMessage(),
    startListening: stt.startListening,
    stopListening: stt.stopListening,
    toggleListening: stt.toggleListening,

    isSpeaking: tts.isSpeaking,
    speak: tts.speak,
    stopSpeaking: tts.stop,
    speakResponse,

    isSupported: stt.isSupported && tts.isSupported,
    isInitialized: stt.isInitialized,
    isActive: stt.isListening || tts.isSpeaking,
  };
}

export type { VoiceInteractionOptions, VoiceInteractionResult };