/**
 * useInterruptibleKokoro - Interruptible TTS Hook
 * Supports interruption during speech
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import logger from '../utils/logger';

logger.setContext('InterruptibleKokoro');

interface Options {
  voice?: string;
  speed?: number;
  onInterrupt?: () => void;
  interruptionVolumeThreshold?: number;
}

export type InterruptibleKokoroOptions = Options;

interface Result {
  isSpeaking: boolean;
  serviceReady: boolean | null;
  canInterrupt: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  setCanInterrupt: (value: boolean) => void;
  isSupported: boolean;
}

export type InterruptibleKokoroResult = Result;

export function useInterruptibleKokoro(options: Options = {}): Result {
  const { voice = 'af_sky', speed = 1.0, onInterrupt, interruptionVolumeThreshold = 0.1 } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [serviceReady, setServiceReady] = useState<boolean | null>(null);
  const [canInterrupt, setCanInterrupt] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const interruptionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check service status
  useEffect(() => {
    fetch('/api/voice/status')
      .then(res => res.json())
      .then(data => setServiceReady(data.kokoro === 'running'))
      .catch(() => setServiceReady(false));
  }, []);

  // Stop speaking
  const stop = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (interruptionCheckRef.current) {
      clearInterval(interruptionCheckRef.current);
      interruptionCheckRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Start interruption detection
  const startInterruptionDetection = useCallback(() => {
    if (!canInterrupt) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        mediaStreamRef.current = stream;
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        audioAnalyserRef.current = analyser;

        const dataArray = new Float32Array(analyser.frequencyBinCount);

        interruptionCheckRef.current = setInterval(() => {
          if (!audioAnalyserRef.current || !isSpeaking) return;

          analyser.getFloatTimeDomainData(dataArray);

          let maxVolume = 0;
          for (let i = 0; i < dataArray.length; i++) {
            maxVolume = Math.max(maxVolume, Math.abs(dataArray[i]));
          }

          if (maxVolume > interruptionVolumeThreshold) {
            logger.info('Interruption detected');
            stop();
            onInterrupt?.();
          }
        }, 100);
      })
      .catch(err => logger.warn('Could not start interruption detection:', { error: err }));
  }, [canInterrupt, isSpeaking, interruptionVolumeThreshold, stop, onInterrupt]);

  // Speak text
  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Stop any current speech
      stop();

      try {
        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice, speed }),
        });

        if (!response.ok) {
          throw new Error(`TTS API error: ${response.status}`);
        }

        const audioBuffer = await response.arrayBuffer();

        // Create audio context and play
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;

        const decodedBuffer = await audioCtx.decodeAudioData(audioBuffer);
        const source = audioCtx.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(audioCtx.destination);

        source.onended = () => {
          stop();
        };

        audioSourceRef.current = source;
        setIsSpeaking(true);
        source.start(0);

        // Start interruption detection if enabled
        startInterruptionDetection();
      } catch (err) {
        logger.error('TTS error:', { error: err instanceof Error ? err.message : 'Unknown' });
        stop();
      }
    },
    [voice, speed, stop, startInterruptionDetection]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [stop]);

  return {
    isSpeaking,
    serviceReady,
    canInterrupt,
    speak,
    stop,
    setCanInterrupt,
    isSupported: typeof window !== 'undefined' && !!window.AudioContext,
  };
}
