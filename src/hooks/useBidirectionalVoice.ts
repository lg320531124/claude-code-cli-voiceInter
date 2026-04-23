/**
 * useBidirectionalVoice - Bidirectional conversation mode
 * Combines STT and TTS for natural back-and-forth conversation
 */
import { useState, useCallback, useEffect } from 'react';
import { useStreamingWhisper } from './useStreamingWhisper';
import { useInterruptibleKokoro } from './useInterruptibleKokoro';
import logger from '../utils/logger';

logger.setContext('BidirectionalVoice');

type SpeakerType = 'user' | 'assistant' | null;

interface Options {
  language?: string;
  voice?: string;
  onUserSpeech?: (text: string) => void;
  onAssistantSpeech?: (text: string) => void;
  onConversationStart?: () => void;
  onConversationEnd?: () => void;
  autoContinue?: boolean;
  silenceThreshold?: number;
  interruptionEnabled?: boolean;
  accumulateTranscript?: boolean;
}

export type BidirectionalVoiceOptions = Options;

interface Result {
  isConversationActive: boolean;
  currentSpeaker: SpeakerType;
  isListening: boolean;
  isSpeaking: boolean;
  userTranscript: string;
  interimTranscript: string;
  accumulatedText: string;
  volumeLevel: number;
  sttReady: boolean | null;
  ttsReady: boolean | null;
  startConversation: () => Promise<void>;
  endConversation: () => void;
  speakResponse: (text: string) => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  stopSpeaking: () => void;
  clearAccumulated: () => void;
  setAutoContinue: (value: boolean) => void;
  setInterruptionEnabled: (value: boolean) => void;
  isSupported: boolean;
}

export type BidirectionalVoiceResult = Result;

export function useBidirectionalVoice(options: Options = {}): Result {
  const {
    language = 'auto',
    voice = 'af_sky',
    onUserSpeech,
    onAssistantSpeech,
    onConversationStart,
    onConversationEnd,
    autoContinue = true,
    silenceThreshold = 2000,
    interruptionEnabled = true,
    accumulateTranscript = false,
  } = options;

  const [isConversationActive, setIsConversationActive] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerType>(null);
  const [accumulatedText, setAccumulatedText] = useState('');
  const [autoContinueEnabled, setAutoContinue] = useState(autoContinue);
  const [interruptionEnabledState, setInterruptionEnabled] = useState(interruptionEnabled);

  // STT hook
  const stt = useStreamingWhisper({
    language,
    silenceThreshold,
    accumulateMode: accumulateTranscript,
    onResult: useCallback(
      (text: string) => {
        if (text.trim()) {
          setCurrentSpeaker('user');
          setAccumulatedText(prev => prev + ' ' + text);
          onUserSpeech?.(text);
        }
      },
      [onUserSpeech]
    ),
    onInterimResult: useCallback((text: string) => {
      // Show interim transcript
    }, []),
  });

  // TTS hook
  const tts = useInterruptibleKokoro({
    voice,
    onInterrupt: useCallback(() => {
      logger.info('User interrupted assistant');
      setCurrentSpeaker('user');
      stt.startListening();
    }, [stt]),
  });

  // Start conversation
  const startConversation = useCallback(async () => {
    setIsConversationActive(true);
    setCurrentSpeaker(null);
    onConversationStart?.();

    // Start listening for user input
    await stt.startListening();
    setCurrentSpeaker('user');
  }, [stt, onConversationStart]);

  // End conversation
  const endConversation = useCallback(() => {
    setIsConversationActive(false);
    setCurrentSpeaker(null);
    stt.stopListening();
    tts.stop();
    onConversationEnd?.();
  }, [stt, tts, onConversationEnd]);

  // Speak response (assistant)
  const speakResponse = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setCurrentSpeaker('assistant');
      stt.stopListening();

      // Enable interruption detection
      tts.setCanInterrupt(interruptionEnabledState);
      await tts.speak(text);

      onAssistantSpeech?.(text);

      // Auto-continue listening after speech ends
      if (autoContinueEnabled && isConversationActive) {
        setCurrentSpeaker('user');
        await stt.startListening();
      }
    },
    [
      stt,
      tts,
      interruptionEnabledState,
      autoContinueEnabled,
      isConversationActive,
      onAssistantSpeech,
    ]
  );

  // Clear accumulated text
  const clearAccumulated = useCallback(() => {
    setAccumulatedText('');
  }, []);

  // Handle speaker transitions
  useEffect(() => {
    if (!isConversationActive) return;

    // When STT finishes, transition to assistant if there's content
    if (!stt.isListening && stt.transcript && currentSpeaker === 'user') {
      // The parent component should call speakResponse
    }
  }, [isConversationActive, stt.isListening, stt.transcript, currentSpeaker]);

  return {
    isConversationActive,
    currentSpeaker,
    isListening: stt.isListening,
    isSpeaking: tts.isSpeaking,
    userTranscript: stt.transcript,
    interimTranscript: stt.interimTranscript,
    accumulatedText,
    volumeLevel: stt.volumeLevel,
    sttReady: stt.serviceReady,
    ttsReady: tts.serviceReady,
    startConversation,
    endConversation,
    speakResponse,
    startListening: stt.startListening,
    stopListening: stt.stopListening,
    stopSpeaking: tts.stop,
    clearAccumulated,
    setAutoContinue,
    setInterruptionEnabled,
    isSupported: stt.isSupported && tts.isSupported,
  };
}
