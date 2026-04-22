// src/components/VoicePanel.tsx
//
// Voice control panel - integrated voice functionality
// - Waveform animation
// - Bidirectional conversation mode
// - Hybrid TTS (Kokoro + Browser fallback)
// - Error display
// - Volume level display
// - Status feedback optimization

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Settings,
  X,
  RefreshCw,
  Loader2,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { useBidirectionalVoice } from '../hooks/useEnhancedVoice';
import { useHybridTTS } from '../hooks/useHybridTTS';
import VoiceWaveform from './VoiceWaveform';
import ErrorToast from './ErrorToast';
import TTSSettings from './TTSSettings';
import LanguageSelector from './LanguageSelector';
import { getErrorInfo, VoiceErrorDetail } from '../utils/voiceErrors';
import { getSTTLanguageCode, getTTSLanguageCode } from '../utils/languageDetection';
import { matchVoiceCommand } from '../utils/voiceCommands';
import logger from '../utils/logger';

// Set context for VoicePanel logs
logger.setContext('VoicePanel');

// Props interface
interface VoicePanelProps {
  onUserSpeech?: (text: string) => void;
  onAssistantSpeech?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onCommandExecute?: (action: string, commandId: string) => void;
  enabled?: boolean;
  showWaveform?: boolean;
  autoContinue?: boolean;
  interruptionEnabled?: boolean;
}

// Command feedback interface
interface CommandFeedback {
  command: string;
  feedback: string;
  matchedText: string;
  timestamp: number;
}

// Service indicator props
interface ServiceIndicatorProps {
  name: string;
  ready: boolean | null;
  mode?: string;
}

// TTS mode type
type TTSMode = 'kokoro' | 'browser' | null;

// Language type
type LanguageCode = 'auto' | 'zh-CN' | 'en-US' | 'ja-JP';

function VoicePanel({
  onUserSpeech,
  onAssistantSpeech,
  onInterimTranscript,
  onCommandExecute,
  enabled = true,
  showWaveform = true,
  autoContinue = true,
  interruptionEnabled = true,
}: VoicePanelProps): React.ReactElement {
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [ttsMode, setTtsMode] = useState<TTSMode>(null);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsVoice, setTtsVoice] = useState('af_sky');
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [language, setLanguage] = useState<LanguageCode>('auto');
  const [isStarting, setIsStarting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [commandFeedback, setCommandFeedback] = useState<CommandFeedback | null>(null);
  const [commandEnabled, setCommandEnabled] = useState(true);

  // Handle user speech - check for commands
  const handleUserSpeechWithCommands = useCallback(
    (text: string): void => {
      // Check if it's a voice command
      if (commandEnabled) {
        const command = matchVoiceCommand(text);

        if (command) {
          logger.debug('Voice command detected:', { id: command.id, feedback: command.feedback });

          // Show command feedback
          setCommandFeedback({
            command: command.id,
            feedback: command.feedback,
            matchedText: text,
            timestamp: Date.now(),
          });

          // Clear feedback after 2 seconds
          setTimeout(() => setCommandFeedback(null), 2000);

          // Execute command
          onCommandExecute?.(command.action, command.id);

          // Don't pass to Claude (commands aren't conversation content)
          return;
        }
      }

      // Not a command, pass to parent
      onUserSpeech?.(text);
    },
    [commandEnabled, onCommandExecute, onUserSpeech]
  );

  // Bidirectional voice hook
  const voice = useBidirectionalVoice({
    language: getSTTLanguageCode(language),
    voice: ttsVoice,
    autoContinue,
    interruptionEnabled,
    silenceThreshold: 3000,
    accumulateTranscript: true,
    onUserSpeech: handleUserSpeechWithCommands,
    onAssistantSpeech: (text: string) => {
      onAssistantSpeech?.(text);
    },
    onConversationStart: () => {
      logger.info('Conversation started');
    },
    onConversationEnd: () => {
      logger.info('Conversation ended');
    },
  });

  // Load browser voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = (): void => {
        const voices = window.speechSynthesis.getVoices();
        setBrowserVoices(voices);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Hybrid TTS hook
  const hybridTTS = useHybridTTS({
    voice: ttsVoice,
    speed: ttsSpeed,
    language: getTTSLanguageCode(language),
    preferKokoro: ttsMode !== 'browser',
    onModeChange: (mode: TTSMode) => {
      setTtsMode(mode);
      logger.info('TTS mode changed:', { mode });
    },
  });

  // Handle language change
  const handleLanguageChange = useCallback((newLanguage: LanguageCode): void => {
    setLanguage(newLanguage);
    logger.info('Language changed:', { language: newLanguage });
  }, []);

  // Pass interim transcript to parent
  useEffect(() => {
    if (onInterimTranscript && voice.interimTranscript) {
      onInterimTranscript(voice.interimTranscript);
    }
  }, [voice.interimTranscript, onInterimTranscript]);

  // Handle speed change
  const handleSpeedChange = useCallback((newSpeed: number): void => {
    setTtsSpeed(newSpeed);
  }, []);

  // Handle voice change
  const handleVoiceChange = useCallback((newVoice: string): void => {
    setTtsVoice(newVoice);
  }, []);

  // Handle test speech
  const handleTestSpeak = useCallback(
    (text: string): void => {
      hybridTTS.speak(text);
    },
    [hybridTTS]
  );

  // Handle errors
  useEffect(() => {
    if (voice.sttReady === false && voice.isConversationActive) {
      setError('whisper-offline');
      setStatusMessage('Speech recognition service offline');
    }
  }, [voice.sttReady, voice.isConversationActive]);

  // Update status message
  useEffect(() => {
    if (isStarting) {
      setStatusMessage('Starting...');
    } else if (voice.isListening) {
      setStatusMessage('Listening to your voice...');
    } else if (voice.isSpeaking) {
      setStatusMessage('Reading response...');
    } else if (voice.isConversationActive) {
      setStatusMessage('Waiting for your input...');
    } else if (voice.sttReady === false) {
      setStatusMessage('Voice service not ready');
    } else {
      setStatusMessage('Click button to start voice conversation');
    }
  }, [isStarting, voice.isListening, voice.isSpeaking, voice.isConversationActive, voice.sttReady]);

  // Speak response with fallback
  const speakResponseWithFallback = useCallback(
    (text: string): void => {
      if (!text?.trim()) return;
      hybridTTS.speak(text);
      onAssistantSpeech?.(text);
    },
    [hybridTTS, onAssistantSpeech]
  );

  // Start conversation
  const handleStartConversation = useCallback((): void => {
    setError(null);
    setIsStarting(true);
    setStatusMessage('Starting voice conversation...');

    setTimeout(() => {
      voice.startConversation();
      setIsStarting(false);
    }, 300);
  }, [voice]);

  // End conversation
  const handleEndConversation = useCallback((): void => {
    voice.endConversation();
    setStatusMessage('Conversation ended');
  }, [voice]);

  // Close error toast
  const handleCloseError = useCallback(
    (shouldRetry: boolean): void => {
      setError(null);
      if (shouldRetry) {
        handleStartConversation();
      }
    },
    [handleStartConversation]
  );

  // Speak response (external call)
  const speakResponse = useCallback(
    (text: string): void => {
      voice.speakResponse(text);
    },
    [voice]
  );

  // Service indicator component
  const ServiceIndicator: React.FC<ServiceIndicatorProps> = ({ name, ready, mode }) => (
    <div
      className={`flex items-center gap-1 text-xs ${ready ? 'text-green-400' : 'text-yellow-400'}`}
    >
      <span className={`w-2 h-2 rounded-full ${ready ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
      {name}
      {mode && <span className="text-gray-400 ml-1">({mode})</span>}
    </div>
  );

  // Volume bar component
  const VolumeBar: React.FC = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">Volume</span>
      <div className="w-32 h-2 bg-gray-700 rounded overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-50"
          style={{ width: `${voice.volumeLevel}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Error toast */}
      {error && (
        <ErrorToast
          errorType={error}
          category={error.includes('kokoro') ? 'TTS' : 'STT'}
          onClose={handleCloseError}
        />
      )}

      {/* Main control panel */}
      <div className="bg-gray-800/90 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
        {/* Service status */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-4">
            <ServiceIndicator name="Whisper" ready={voice.sttReady} />
            <ServiceIndicator
              name="TTS"
              ready={hybridTTS.isSupported}
              mode={
                ttsMode === 'kokoro' ? 'Kokoro' : ttsMode === 'browser' ? 'Browser' : 'Detecting'
              }
            />
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-gray-400 hover:text-white transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Waveform animation */}
        {showWaveform && voice.isListening && (
          <div className="mb-3 flex justify-center">
            <VoiceWaveform isListening={voice.isListening} />
          </div>
        )}

        {/* Volume bar */}
        {(voice.isListening || voice.isSpeaking) && (
          <div className="mb-3">
            <VolumeBar />
          </div>
        )}

        {/* Current status */}
        <div className="flex flex-col items-center justify-center gap-2 mb-3">
          {/* Status icon */}
          <div
            className={`flex items-center gap-2 ${
              voice.isListening
                ? 'text-green-400'
                : voice.isSpeaking
                  ? 'text-pink-400'
                  : isStarting
                    ? 'text-yellow-400'
                    : error
                      ? 'text-red-400'
                      : 'text-gray-400'
            }`}
          >
            {isStarting && <Loader2 className="w-4 h-4 animate-spin" />}
            {voice.isListening && <Mic className="w-4 h-4 animate-pulse" />}
            {voice.isSpeaking && <Volume2 className="w-4 h-4 animate-pulse" />}
            {!isStarting && !voice.isListening && !voice.isSpeaking && !error && (
              <CheckCircle className="w-4 h-4 opacity-50" />
            )}
            <span className="text-sm font-medium">{statusMessage}</span>
          </div>

          {/* Detailed status */}
          {voice.isConversationActive && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span
                className={`px-2 py-0.5 rounded ${
                  voice.currentSpeaker === 'user'
                    ? 'bg-purple-500/20 text-purple-300'
                    : voice.currentSpeaker === 'assistant'
                      ? 'bg-pink-500/20 text-pink-300'
                      : 'bg-gray-700 text-gray-400'
                }`}
              >
                {voice.currentSpeaker === 'user'
                  ? 'User speaking'
                  : voice.currentSpeaker === 'assistant'
                    ? 'Claude responding'
                    : 'Waiting'}
              </span>
            </div>
          )}
        </div>

        {/* Interim transcript */}
        {voice.interimTranscript && (
          <div className="text-gray-300 text-sm mb-2 p-2 bg-gray-900/50 rounded">
            {voice.interimTranscript}
          </div>
        )}

        {/* User transcript */}
        {voice.userTranscript && (
          <div className="text-white text-sm mb-2 p-2 bg-purple-900/30 rounded">
            {voice.userTranscript}
          </div>
        )}

        {/* Command feedback */}
        {commandFeedback && (
          <div className="mb-2 p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30 animate-fade-in">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-300 font-medium">
                Command: {commandFeedback.feedback}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Detected: "{commandFeedback.matchedText}"
            </div>
          </div>
        )}

        {/* Control buttons */}
        <div className="flex justify-center gap-4">
          {/* Main button: Start/End conversation */}
          {!voice.isConversationActive ? (
            <button
              onClick={handleStartConversation}
              disabled={!enabled || !voice.sttReady || !hybridTTS.isSupported || isStarting}
              className={`p-4 rounded-full transition-all duration-200 transform active:scale-95 ${
                isStarting
                  ? 'bg-yellow-500/50 text-yellow-200 cursor-wait'
                  : voice.sttReady && hybridTTS.isSupported
                    ? 'bg-purple-500 hover:bg-purple-600 hover:scale-105 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              title="Start conversation"
            >
              {isStarting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Radio className="w-6 h-6" />
              )}
            </button>
          ) : (
            <button
              onClick={handleEndConversation}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-red-500/30"
              title="End conversation"
            >
              <X className="w-6 h-6" />
            </button>
          )}

          {/* Mic status */}
          <div
            className={`p-4 rounded-full transition-all duration-300 ${
              voice.isListening
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {voice.isListening ? (
              <Mic className="w-6 h-6 animate-pulse" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </div>

          {/* Speaker status */}
          <div
            className={`p-4 rounded-full transition-all duration-300 ${
              voice.isSpeaking
                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30 scale-105'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {voice.isSpeaking ? (
              <Volume2 className="w-6 h-6 animate-pulse" />
            ) : (
              <VolumeX className="w-6 h-6" />
            )}
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Auto continue</span>
              <input
                type="checkbox"
                checked={autoContinue}
                onChange={e => voice.setAutoContinue?.(e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Allow interruption</span>
              <input
                type="checkbox"
                checked={interruptionEnabled}
                onChange={e => voice.setInterruptionEnabled?.(e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Voice commands</span>
              <input
                type="checkbox"
                checked={commandEnabled}
                onChange={e => setCommandEnabled(e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Show waveform</span>
              <input
                type="checkbox"
                checked={showWaveform}
                onChange={() => {}}
                className="w-4 h-4 accent-purple-500"
              />
            </div>

            {/* Language selector */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <LanguageSelector
                currentLanguage={language}
                onLanguageChange={handleLanguageChange}
                showAutoDetect={true}
                compact={false}
              />
            </div>

            {/* TTS settings */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <TTSSettings
                speed={ttsSpeed}
                voice={ttsVoice}
                voices={browserVoices}
                onSpeedChange={handleSpeedChange}
                onVoiceChange={handleVoiceChange}
                ttsMode={ttsMode}
                kokoroReady={hybridTTS.kokoroReady}
                browserReady={hybridTTS.browserReady}
                onTestSpeak={handleTestSpeak}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export ref hook for external use
interface VoicePanelRef {
  setSpeakResponse: (fn: (text: string) => void) => void;
  speak: (text: string) => void;
}

export function useVoicePanelRef(): VoicePanelRef {
  const speakResponseRef = useRef<((text: string) => void) | null>(null);

  const setSpeakResponse = useCallback((fn: (text: string) => void): void => {
    speakResponseRef.current = fn;
  }, []);

  const speak = useCallback((text: string): void => {
    if (speakResponseRef.current) {
      speakResponseRef.current(text);
    }
  }, []);

  return { setSpeakResponse, speak };
}

export default VoicePanel;
