// src/hooks/useLocalKokoro.ts
//
// Local Kokoro TTS Hook
// Uses Kokoro service for Text-to-Speech

import { useState, useRef, useCallback, useEffect } from 'react';

interface LocalKokoroOptions {
  voice?: string;
  speed?: number;
}

interface LocalKokoroResult {
  isSpeaking: boolean;
  serviceReady: boolean | null;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSupported: boolean;
}

export function useLocalKokoro(
  options: LocalKokoroOptions = {}
): LocalKokoroResult {
  const { voice = 'af_sky', speed = 1.0 } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [serviceReady, setServiceReady] = useState<boolean | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/voice/status')
      .then(res => res.json())
      .then(data => setServiceReady(data.kokoro === 'running'))
      .catch(() => setServiceReady(false));
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

        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice, speed }),
        });

        if (!response.ok) {
          throw new Error(`TTS 服务响应错误: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current = new Audio(audioUrl);

        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audioRef.current.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        await audioRef.current.play();
      } catch {
        setIsSpeaking(false);
      }
    },
    [voice, speed, stop]
  );

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    isSpeaking,
    serviceReady,
    speak,
    stop,
    isSupported: serviceReady !== false,
  };
}

export type { LocalKokoroOptions, LocalKokoroResult };