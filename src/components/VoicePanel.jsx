// src/components/VoicePanel.jsx
//
// 语音控制面板 - 集成所有语音功能
// - 波形动画显示
// - 双向对话模式切换
// - 混合 TTS (Kokoro + Browser Fallback)
// - 错误提示
// - 音量级别显示

import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Radio, Settings, X, RefreshCw, Speaker } from 'lucide-react';
import { useBidirectionalVoice } from '../hooks/useEnhancedVoice';
import { useHybridTTS } from '../hooks/useHybridTTS';
import VoiceWaveform from './VoiceWaveform';
import ErrorToast from './ErrorToast';
import { getErrorInfo } from '../utils/voiceErrors';

function VoicePanel({
  onUserSpeech,
  onAssistantSpeech,
  enabled = true,
  showWaveform = true,
  autoContinue = true,
  interruptionEnabled = true
}) {
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [ttsMode, setTtsMode] = useState(null); // 'kokoro' | 'browser'

  // 双向对话 hook
  const voice = useBidirectionalVoice({
    language: 'auto',
    voice: 'af_sky',
    autoContinue,
    interruptionEnabled,
    silenceThreshold: 1500,
    onUserSpeech: (text) => {
      onUserSpeech?.(text);
    },
    onAssistantSpeech: (text) => {
      onAssistantSpeech?.(text);
    },
    onConversationStart: () => {
      console.log('[VoicePanel] 对话开始');
    },
    onConversationEnd: () => {
      console.log('[VoicePanel] 对话结束');
    }
  });

  // 混合 TTS hook (Kokoro + Browser Fallback)
  const hybridTTS = useHybridTTS({
    voice: 'af_sky',
    speed: 1.0,
    language: 'zh-CN',
    preferKokoro: true,
    onModeChange: (mode) => {
      setTtsMode(mode);
      console.log('[VoicePanel] TTS 模式切换:', mode);
    }
  });

  // 处理错误 - 更智能的错误处理
  useEffect(() => {
    if (voice.sttReady === false && voice.isConversationActive) {
      setError('whisper-offline');
    }
    // TTS 有了 fallback，不再显示 kokoro-offline 错误
  }, [voice.sttReady, voice.isConversationActive]);

  // 使用混合 TTS 播放响应
  const speakResponseWithFallback = useCallback(async (text) => {
    if (!text || !text.trim()) return;
    hybridTTS.speak(text);
    onAssistantSpeech?.(text);
  }, [hybridTTS, onAssistantSpeech]);

  // 开始对话
  const handleStartConversation = useCallback(() => {
    setError(null);
    voice.startConversation();
  }, [voice]);

  // 结束对话
  const handleEndConversation = useCallback(() => {
    voice.endConversation();
  }, [voice]);

  // 关闭错误提示
  const handleCloseError = useCallback((shouldRetry) => {
    setError(null);
    if (shouldRetry) {
      handleStartConversation();
    }
  }, [handleStartConversation]);

  // 播放响应（外部调用）
  const speakResponse = useCallback((text) => {
    voice.speakResponse(text);
  }, [voice]);

  // 服务状态指示器
  const ServiceIndicator = ({ name, ready, mode }) => (
    <div className={`flex items-center gap-1 text-xs ${ready ? 'text-green-400' : 'text-yellow-400'}`}>
      <span className={`w-2 h-2 rounded-full ${ready ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
      {name}
      {mode && <span className="text-gray-400 ml-1">({mode})</span>}
    </div>
  );

  // 音量级别条
  const VolumeBar = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">音量</span>
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
      {/* 错误提示 */}
      {error && (
        <ErrorToast
          errorType={error}
          category={error.includes('kokoro') ? 'TTS' : 'STT'}
          onClose={handleCloseError}
        />
      )}

      {/* 主控制面板 */}
      <div className="bg-gray-800/90 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
        {/* 服务状态 */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-4">
            <ServiceIndicator name="Whisper" ready={voice.sttReady} />
            <ServiceIndicator
              name="TTS"
              ready={hybridTTS.isSupported}
              mode={ttsMode === 'kokoro' ? 'Kokoro' : ttsMode === 'browser' ? '浏览器' : '检测中'}
            />
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-gray-400 hover:text-white transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* 波形动画 */}
        {showWaveform && voice.isListening && (
          <div className="mb-3 flex justify-center">
            <VoiceWaveform isListening={voice.isListening} />
          </div>
        )}

        {/* 音量条 */}
        {(voice.isListening || voice.isSpeaking) && (
          <div className="mb-3">
            <VolumeBar />
          </div>
        )}

        {/* 当前状态 */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {voice.currentSpeaker === 'user' && (
            <span className="text-purple-400 text-sm animate-pulse">正在听...</span>
          )}
          {voice.currentSpeaker === 'assistant' && (
            <span className="text-pink-400 text-sm animate-pulse">正在说...</span>
          )}
          {!voice.isConversationActive && (
            <span className="text-gray-400 text-sm">点击开始对话</span>
          )}
        </div>

        {/* 中间转录文本 */}
        {voice.interimTranscript && (
          <div className="text-gray-300 text-sm mb-2 p-2 bg-gray-900/50 rounded">
            {voice.interimTranscript}
          </div>
        )}

        {/* 用户转录文本 */}
        {voice.userTranscript && (
          <div className="text-white text-sm mb-2 p-2 bg-purple-900/30 rounded">
            {voice.userTranscript}
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex justify-center gap-4">
          {/* 主按钮：开始/结束对话 */}
          {!voice.isConversationActive ? (
            <button
              onClick={handleStartConversation}
              disabled={!enabled || !voice.isSupported}
              className={`p-4 rounded-full transition ${
                voice.isSupported
                  ? 'bg-purple-500 hover:bg-purple-600 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              title="开始对话"
            >
              <Radio className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={handleEndConversation}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition"
              title="结束对话"
            >
              <X className="w-6 h-6" />
            </button>
          )}

          {/* 麦克风状态 */}
          <div className={`p-4 rounded-full ${
            voice.isListening
              ? 'bg-green-500 text-white animate-pulse'
              : 'bg-gray-700 text-gray-400'
          }`}>
            {voice.isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </div>

          {/* 播放状态 */}
          <div className={`p-4 rounded-full ${
            voice.isSpeaking
              ? 'bg-pink-500 text-white animate-pulse'
              : 'bg-gray-700 text-gray-400'
          }`}>
            {voice.isSpeaking ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </div>
        </div>

        {/* 设置面板 */}
        {showSettings && (
          <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">自动继续对话</span>
              <input
                type="checkbox"
                checked={autoContinue}
                onChange={(e) => voice.setAutoContinue?.(e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">允许打断</span>
              <input
                type="checkbox"
                checked={interruptionEnabled}
                onChange={(e) => voice.setInterruptionEnabled?.(e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">显示波形</span>
              <input
                type="checkbox"
                checked={showWaveform}
                onChange={() => {}}
                className="w-4 h-4 accent-purple-500"
              />
            </div>

            {/* TTS 模式选择 */}
            <div className="mt-3 pt-2 border-t border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Speaker className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">语音合成模式</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => hybridTTS.switchMode('kokoro')}
                  disabled={!hybridTTS.kokoroReady}
                  className={`flex-1 py-1 px-2 rounded text-xs ${
                    ttsMode === 'kokoro'
                      ? 'bg-purple-500 text-white'
                      : hybridTTS.kokoroReady
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Kokoro {hybridTTS.kokoroReady ? '' : '(离线)'}
                </button>
                <button
                  onClick={() => hybridTTS.switchMode('browser')}
                  disabled={!hybridTTS.browserReady}
                  className={`flex-1 py-1 px-2 rounded text-xs ${
                    ttsMode === 'browser'
                      ? 'bg-purple-500 text-white'
                      : hybridTTS.browserReady
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  浏览器
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 导出方法供外部使用 */}
      {/* 通过 ref 或 callback 暴露 speakResponse */}
    </div>
  );
}

// 导出 speakResponse 供外部使用
export function useVoicePanelRef() {
  const speakResponseRef = React.useRef(null);

  const setSpeakResponse = useCallback((fn) => {
    speakResponseRef.current = fn;
  }, []);

  const speak = useCallback((text) => {
    if (speakResponseRef.current) {
      speakResponseRef.current(text);
    }
  }, []);

  return { setSpeakResponse, speak };
}

export default VoicePanel;