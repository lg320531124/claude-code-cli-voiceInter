// src/hooks/useKokoroTTS.ts
//
// Kokoro TTS Hook
// Uses Kokoro service for high-quality text-to-speech with caching

import { useState, useRef, useCallback, useEffect } from 'react';
import { getCachedAudio, cacheAudio } from '../utils/ttsCache';

interface KokoroTTSOptions {
  voice?: string;
  speed?: number;
  endpoint?: string;
  enableCache?: boolean;
  onEnd?: () => void;
  onError?: (type: string, error: unknown) => void;
}

interface KokoroTTSResult {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isReady: boolean | null;
}

export function useKokoroTTS(
  options: KokoroTTSOptions = {}
): KokoroTTSResult {
  const {
    voice = 'af_sky',
    speed = 1.0,
    endpoint = '/api/voice/tts',
    enableCache = true,
    onEnd,
    onError,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReady, setIsReady] = useState<boolean | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/voice/status')
      .then(res => res.json())
      .then(data => setIsReady(data.kokoro === 'running'))
      .catch(() => setIsReady(false));
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!text?.trim()) return;
      stop();

      try {
        setIsSpeaking(true);

        // Check cache
        if (enableCache) {
          const cachedAudio = await getCachedAudio(text, voice, speed);
          if (cachedAudio) {
            const audioUrl = URL.createObjectURL(cachedAudio);
            audioRef.current = new Audio(audioUrl);

            audioRef.current.onended = () => {
              setIsSpeaking(false);
              URL.revokeObjectURL(audioUrl);
              audioRef.current = null;
              onEnd?.();
            };

            audioRef.current.onerror = () => {
              setIsSpeaking(false);
              URL.revokeObjectURL(audioUrl);
              audioRef.current = null;
              onError?.('kokoro-error', '音频播放失败');
            };

            await audioRef.current.play();
            return;
          }
        }

        // Fetch from Kokoro service
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice, speed }),
        });

        if (!response.ok) {
          throw new Error(`Kokoro 服务响应错误: ${response.status}`);
        }

        const audioBlob = await response.blob();

        // Cache audio
        if (enableCache) {
          await cacheAudio(text, audioBlob, voice, speed);
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current = new Audio(audioUrl);

        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          onEnd?.();
        };

        audioRef.current.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          onError?.('kokoro-error', '音频播放失败');
        };

        await audioRef.current.play();
      } catch (err) {
        setIsSpeaking(false);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        onError?.('kokoro-error', errorMessage);
      }
    },
    [voice, speed, endpoint, enableCache, stop, onEnd, onError]
  );

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    isSpeaking,
    speak,
    stop,
    isReady,
  };
}

export type { KokoroTTSOptions, KokoroTTSResult };