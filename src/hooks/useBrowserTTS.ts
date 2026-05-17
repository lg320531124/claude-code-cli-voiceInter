// src/hooks/useBrowserTTS.ts
//
// Browser TTS Hook
// Uses Web Speech API SpeechSynthesis for text-to-speech

import { useState, useEffect, useCallback } from 'react';

interface BrowserTTSOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
  onError?: (type: string, error: unknown) => void;
}

interface BrowserTTSResult {
  isSpeaking: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  speak: (text: string) => void;
  stop: () => void;
  isSupported: boolean;
}

export function useBrowserTTS(
  options: BrowserTTSOptions = {}
): BrowserTTSResult {
  const { language = 'zh-CN', rate = 1.0, pitch = 1.0, onEnd, onError } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);

      const chineseVoice = availableVoices.find(
        v => v.lang.includes('zh') || v.lang.includes('Chinese')
      );
      setSelectedVoice(chineseVoice || availableVoices[0] || null);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [language]);

  const speak = useCallback(
    (text: string) => {
      if (!text?.trim()) return;
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = rate;
      utterance.pitch = pitch;
      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = (event) => {
        setIsSpeaking(false);
        onError?.('tts-error', event.error);
      };

      speechSynthesis.speak(utterance);
    },
    [language, rate, pitch, selectedVoice, onEnd, onError]
  );

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    isSpeaking,
    voices,
    selectedVoice,
    setSelectedVoice,
    speak,
    stop,
    isSupported: typeof speechSynthesis !== 'undefined',
  };
}

export type { BrowserTTSOptions, BrowserTTSResult };