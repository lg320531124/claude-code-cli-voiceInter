// src/hooks/useLocalVoiceCombined.ts
//
// Combined Local Voice Hook
// Orchestrates Whisper STT and Kokoro TTS

import { useCallback } from 'react';
import { useLocalWhisper } from './useLocalWhisper';
import { useLocalKokoro } from './useLocalKokoro';

interface LocalVoiceOptions {
  language?: string;
  voice?: string;
  onSpeechResult?: (text: string) => void;
  autoSpeakResponse?: boolean;
}

interface LocalVoiceResult {
  // STT
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  sttError: string | null;
  sttReady: boolean | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  // TTS
  isSpeaking: boolean;
  ttsReady: boolean | null;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  speakResponse: (text: string) => void;
  // Combined
  isSupported: boolean;
  isActive: boolean;
}

export function useLocalVoiceCombined(
  options: LocalVoiceOptions = {}
): LocalVoiceResult {
  const { language = 'auto', voice = 'af_sky', onSpeechResult, autoSpeakResponse = true } = options;

  const stt = useLocalWhisper({ language, onResult: onSpeechResult });
  const tts = useLocalKokoro({ voice });

  const speakResponse = useCallback(
    (text: string): void => {
      if (autoSpeakResponse && text && tts.serviceReady) tts.speak(text);
    },
    [autoSpeakResponse, tts]
  );

  return {
    isListening: stt.isListening,
    transcript: stt.transcript,
    interimTranscript: stt.interimTranscript,
    sttError: stt.error,
    sttReady: stt.serviceReady,
    startListening: stt.startListening,
    stopListening: stt.stopListening,

    isSpeaking: tts.isSpeaking,
    ttsReady: tts.serviceReady,
    speak: tts.speak,
    stopSpeaking: tts.stop,
    speakResponse,

    isSupported: Boolean(stt.serviceReady && tts.serviceReady),
    isActive: stt.isListening || tts.isSpeaking,
  };
}

export type { LocalVoiceOptions, LocalVoiceResult };

// Alias for backwards compatibility
export { useLocalVoiceCombined as useLocalVoice };