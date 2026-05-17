// src/hooks/useHybridTTS.ts
//
// Hybrid TTS Hook - Smart TTS mode switching
// - Priority: Kokoro (local service, high quality)
// - Fallback: Browser SpeechSynthesis

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBrowserTTS } from './useBrowserTTS';
import { useKokoroTTS } from './useKokoroTTS';
import { clearAllCache, getCacheStats } from '../utils/ttsCache';

type TTSMode = 'kokoro' | 'browser' | null;

interface HybridTTSOptions {
  voice?: string;
  speed?: number;
  language?: string;
  kokoroEndpoint?: string;
  onModeChange?: (mode: TTSMode) => void;
  onEnd?: () => void;
  onError?: (type: string, error: unknown) => void;
  preferKokoro?: boolean;
  enableCache?: boolean;
}

interface HybridTTSResult {
  isSpeaking: boolean;
  currentMode: TTSMode;
  kokoroReady: boolean | null;
  browserReady: boolean | null;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  switchMode: (mode: 'kokoro' | 'browser') => void;
  isSupported: boolean;
  clearCache: () => Promise<boolean>;
  getCacheStats: () => Promise<{
    count: number;
    totalSize: number;
    memoryCacheCount: number;
    oldestTimestamp: number | null;
  }>;
  enableCache: boolean;
}

export function useHybridTTS(options: HybridTTSOptions = {}): HybridTTSResult {
  const {
    voice = 'af_sky',
    speed = 1.0,
    language = 'zh-CN',
    kokoroEndpoint = '/api/voice/tts',
    onModeChange,
    onEnd,
    onError,
    preferKokoro = true,
    enableCache = true,
  } = options;

  const [currentMode, setCurrentMode] = useState<TTSMode>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const browserTTS = useBrowserTTS({
    language,
    rate: speed,
    onEnd,
    onError: (type, error) => {
      setIsSpeaking(false);
      onError?.(type, error);
    },
  });

  const kokoroTTS = useKokoroTTS({
    voice,
    speed,
    endpoint: kokoroEndpoint,
    enableCache,
    onEnd,
    onError: (type, error) => {
      setIsSpeaking(false);
      // Fallback to browser on Kokoro failure
      if (browserTTS.isSupported) {
        setCurrentMode('browser');
        onModeChange?.('browser');
      } else {
        onError?.(type, error);
      }
    },
  });

  // Use refs to avoid recreating stop/speak when child hook objects change
  const kokoroStopRef = useRef(kokoroTTS.stop);
  const browserStopRef = useRef(browserTTS.stop);
  const kokoroSpeakRef = useRef(kokoroTTS.speak);
  const browserSpeakRef = useRef(browserTTS.speak);

  useEffect(() => {
    kokoroStopRef.current = kokoroTTS.stop;
    browserStopRef.current = browserTTS.stop;
    kokoroSpeakRef.current = kokoroTTS.speak;
    browserSpeakRef.current = browserTTS.speak;
  }, [kokoroTTS.stop, browserTTS.stop, kokoroTTS.speak, browserTTS.speak]);

  // Determine mode - use functional update to avoid self-dependency
  useEffect(() => {
    let mode: TTSMode = null;
    if (preferKokoro && kokoroTTS.isReady) {
      mode = 'kokoro';
    } else if (browserTTS.isSupported) {
      mode = 'browser';
    }

    setCurrentMode(prev => {
      if (mode !== prev) {
        onModeChange?.(mode);
        return mode;
      }
      return prev;
    });
  }, [kokoroTTS.isReady, browserTTS.isSupported, preferKokoro, onModeChange]);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!text?.trim()) return;

      setIsSpeaking(true);

      if (currentMode === 'kokoro') {
        await kokoroSpeakRef.current(text);
      } else if (currentMode === 'browser') {
        browserSpeakRef.current(text);
      } else {
        onError?.('tts-unavailable', '无可用 TTS 服务');
      }
    },
    [currentMode, onError]
  );

  const stop = useCallback(() => {
    kokoroStopRef.current();
    browserStopRef.current();
    setIsSpeaking(false);
  }, []);

  const switchMode = useCallback(
    (mode: 'kokoro' | 'browser'): void => {
      if (mode === 'kokoro' && kokoroTTS.isReady) {
        setCurrentMode('kokoro');
        onModeChange?.('kokoro');
      } else if (mode === 'browser' && browserTTS.isSupported) {
        setCurrentMode('browser');
        onModeChange?.('browser');
      }
    },
    [kokoroTTS.isReady, browserTTS.isSupported, onModeChange]
  );

  // Stable cleanup - stop ref is never recreated
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    isSpeaking,
    currentMode,
    kokoroReady: kokoroTTS.isReady,
    browserReady: browserTTS.isSupported,
    voices: browserTTS.voices,
    selectedVoice: browserTTS.selectedVoice,
    setSelectedVoice: browserTTS.setSelectedVoice,
    speak,
    stop,
    switchMode,
    isSupported: Boolean(kokoroTTS.isReady || browserTTS.isSupported),
    clearCache: clearAllCache,
    getCacheStats,
    enableCache,
  };
}

export type { HybridTTSOptions, HybridTTSResult, TTSMode };
