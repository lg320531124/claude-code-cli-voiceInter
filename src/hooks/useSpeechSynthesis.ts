// src/hooks/useSpeechSynthesis.ts
//
// Speech Synthesis Hook (TTS)
// Uses Web Speech API SpeechSynthesis for text-to-speech

import { useState, useEffect, useCallback } from 'react';

interface SpeechSynthesisOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface SpeechSynthesisResult {
  isSpeaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
  voices: SpeechSynthesisVoice[];
  isSupported: boolean;
}

export function useSpeechSynthesis(
  options: SpeechSynthesisOptions = {}
): SpeechSynthesisResult {
  const { language = 'zh-CN', rate = 1.0, pitch = 1.0, volume = 1.0 } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!window.speechSynthesis) {
      console.warn('[SpeechSynthesis] Not supported');
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const findVoice = useCallback(
    (lang: string): SpeechSynthesisVoice | undefined => {
      const matchingVoices = voices.filter(v => v.lang.startsWith(lang));
      const localVoice = matchingVoices.find(v => v.localService);
      return localVoice || matchingVoices[0] || voices[0];
    },
    [voices]
  );

  const speak = useCallback(
    (text: string): void => {
      if (!window.speechSynthesis || !text) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      const voice = findVoice(language);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [language, rate, pitch, volume, findVoice]
  );

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isSpeaking,
    speak,
    stop,
    voices,
    isSupported: Boolean(window.speechSynthesis),
  };
}

export type { SpeechSynthesisOptions, SpeechSynthesisResult };