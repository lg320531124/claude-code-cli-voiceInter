/**
 * useVoicePanelLogic - Core logic for voice panel
 * Handles conversation state, commands, and transitions
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useBidirectionalVoice } from '../hooks/useEnhancedVoice';
import { useHybridTTS } from '../hooks/useHybridTTS';
import { matchVoiceCommand } from '../utils/voiceCommands';
import { getSTTLanguageCode, getTTSLanguageCode } from '../utils/languageDetection';
import logger from '../utils/logger';

logger.setContext('VoicePanelLogic');

interface Options {
  language?: string;
  onUserSpeech?: (text: string) => void;
  onAssistantSpeech?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onCommandExecute?: (action: string, commandId: string) => void;
  enabled?: boolean;
  autoContinue?: boolean;
  interruptionEnabled?: boolean;
}

interface Result {
  // State
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  currentSpeaker: 'user' | 'assistant' | null;
  interimTranscript: string;
  lastUserText: string;
  lastAssistantText: string;
  error: { type: string; message: string } | null;

  // Actions
  start: () => void;
  stop: () => void;
  speak: (text: string) => void;

  // Config
  language: string;
  setLanguage: (lang: string) => void;

  // Services
  sttReady: boolean | null;
  ttsReady: boolean | null;
}

export function useVoicePanelLogic(options: Options): Result {
  const {
    language = 'zh-CN',
    onUserSpeech,
    onAssistantSpeech,
    onInterimTranscript,
    onCommandExecute,
    enabled = true,
    autoContinue = true,
    interruptionEnabled = true,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [lastUserText, setLastUserText] = useState('');
  const [lastAssistantText, setLastAssistantText] = useState('');
  const [error, setError] = useState<{ type: string; message: string } | null>(null);
  const pendingAssistantTextRef = useRef('');

  // Hybrid TTS for assistant speech
  const tts = useHybridTTS({
    voice: getTTSLanguageCode(currentLanguage, 'kokoro'),
    speed: 1.0,
    language: currentLanguage,
    preferKokoro: true,
  });

  // Bidirectional voice for conversation mode
  const voice = useBidirectionalVoice({
    language: getSTTLanguageCode(currentLanguage),
    voice: getTTSLanguageCode(currentLanguage, 'kokoro'),
    autoContinue,
    interruptionEnabled,
    silenceThreshold: 2000,
    accumulateTranscript: true,
    onUserSpeech: useCallback((text: string) => {
      setLastUserText(text);

      // Check for voice commands
      const commandMatch = matchVoiceCommand(text);
      if (commandMatch) {
        logger.info('Voice command matched:', { action: commandMatch.action });
        onCommandExecute?.(commandMatch.action, commandMatch.id);
        return;
      }

      onUserSpeech?.(text);
    }, [onUserSpeech, onCommandExecute]),
    onAssistantSpeech: useCallback((text: string) => {
      setLastAssistantText(text);
      onAssistantSpeech?.(text);
    }, [onAssistantSpeech]),
  });

  // Start conversation
  const start = useCallback(() => {
    if (!enabled) return;
    setError(null);
    setIsActive(true);
    voice.startConversation();
  }, [enabled, voice]);

  // Stop conversation
  const stop = useCallback(() => {
    setIsActive(false);
    voice.endConversation();
    tts.stop();
    setLastUserText('');
    setLastAssistantText('');
  }, [voice, tts]);

  // Speak assistant response
  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    voice.speakResponse(text);
  }, [voice]);

  // Handle interim transcript
  useEffect(() => {
    if (voice.interimTranscript) {
      onInterimTranscript?.(voice.interimTranscript);
    }
  }, [voice.interimTranscript, onInterimTranscript]);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    isActive,
    isListening: voice.isListening,
    isSpeaking: voice.isSpeaking,
    currentSpeaker: voice.currentSpeaker,
    interimTranscript: voice.interimTranscript,
    lastUserText,
    lastAssistantText,
    error,

    start,
    stop,
    speak,

    language: currentLanguage,
    setLanguage: setCurrentLanguage,

    sttReady: voice.sttReady,
    ttsReady: voice.ttsReady,
  };
}