/**
 * VoicePanel - Voice control panel UI component
 * Uses useVoicePanelLogic for core functionality
 */
import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Radio, Settings, X, Loader2, CheckCircle } from 'lucide-react';
import { useVoicePanelLogic } from '../hooks/useVoicePanelLogic';
import VoiceWaveform from './VoiceWaveform';
import ErrorToast from './ErrorToast';
import TTSSettings from './TTSSettings';
import LanguageSelector from './LanguageSelector';

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

export default function VoicePanel({
  onUserSpeech,
  onAssistantSpeech,
  onInterimTranscript,
  onCommandExecute,
  enabled = true,
  showWaveform = true,
  autoContinue = true,
  interruptionEnabled = true,
}: VoicePanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const voiceLogic = useVoicePanelLogic({
    language: 'zh-CN',
    onUserSpeech,
    onAssistantSpeech,
    onInterimTranscript,
    onCommandExecute,
    enabled,
    autoContinue,
    interruptionEnabled,
  });

  const {
    isActive,
    isListening,
    isSpeaking,
    currentSpeaker,
    interimTranscript,
    lastUserText,
    lastAssistantText,
    error,
    start,
    stop,
    speak,
    language,
    setLanguage,
    sttReady,
    ttsReady,
  } = voiceLogic;

  // Don't render if not enabled
  if (!enabled) return null;

  return (
    <div className="relative bg-gradient-to-r from-purple-900/90 to-pink-900/90 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Radio
            className={`w-5 h-5 ${isActive ? 'text-green-400 animate-pulse' : 'text-white/50'}`}
          />
          <span className="text-white font-medium">{isActive ? '对话模式' : '点击开始'}</span>
          {sttReady === null || ttsReady === null ? (
            <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
          ) : sttReady && ttsReady ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <span className="text-xs text-red-400">服务未就绪</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
            title="语言设置"
          >
            🌐
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
            title="TTS设置"
          >
            <Settings className="w-4 h-4" />
          </button>
          {isActive && (
            <button
              onClick={stop}
              className="p-2 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-red-400"
              title="停止"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Waveform */}
      {showWaveform && isActive && (
        <VoiceWaveform
          isActive={isListening || isSpeaking}
          volumeLevel={isListening ? 50 : 30}
          speakerType={currentSpeaker}
        />
      )}

      {/* Status */}
      <div className="flex items-center justify-center gap-4 py-3">
        {isActive ? (
          <>
            {/* User indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-full ${
                currentSpeaker === 'user' ? 'bg-red-500/30 animate-pulse' : 'bg-white/10'
              }`}
            >
              {isListening ? (
                <Mic className="w-4 h-4 text-red-400" />
              ) : (
                <MicOff className="w-4 h-4 text-white/50" />
              )}
              <span className="text-sm text-white/70">用户</span>
            </div>

            {/* Assistant indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-full ${
                currentSpeaker === 'assistant' ? 'bg-purple-500/30 animate-pulse' : 'bg-white/10'
              }`}
            >
              {isSpeaking ? (
                <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
              ) : (
                <Volume2 className="w-4 h-4 text-white/50" />
              )}
              <span className="text-sm text-white/70">助手</span>
            </div>
          </>
        ) : (
          <button
            onClick={start}
            disabled={!sttReady || !ttsReady}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-medium hover:from-green-600 hover:to-teal-600 transition-all disabled:opacity-50"
          >
            开始对话
          </button>
        )}
      </div>

      {/* Transcript display */}
      {interimTranscript && (
        <div className="mt-3 p-2 bg-white/10 rounded-lg text-white/80 text-sm">
          "{interimTranscript}"
        </div>
      )}

      {/* Error toast */}
      {error && <ErrorToast message={error.message} type="error" onClose={() => {}} />}

      {/* Settings modal */}
      {showSettings && <TTSSettings onClose={() => setShowSettings(false)} />}

      {/* Language selector */}
      {showLanguageSelector && (
        <LanguageSelector
          currentLanguage={language}
          onLanguageChange={setLanguage}
          onClose={() => setShowLanguageSelector(false)}
        />
      )}
    </div>
  );
}

// Export hook for external use
export { useVoicePanelLogic } from '../hooks/useVoicePanelLogic';

// Create a ref hook for external use
export function useVoicePanelRef() {
  return { current: null };
}
