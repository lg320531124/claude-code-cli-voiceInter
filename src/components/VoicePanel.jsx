// src/components/VoicePanel.jsx
//
// 语音控制面板 - 集成所有语音功能
// - 波形动画显示
// - 双向对话模式切换
// - 混合 TTS (Kokoro + Browser Fallback)
// - 错误提示
// - 音量级别显示
// - 状态反馈优化

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Radio, Settings, X, RefreshCw, Loader2, CheckCircle, Zap } from 'lucide-react';
import { useBidirectionalVoice } from '../hooks/useEnhancedVoice';
import { useHybridTTS } from '../hooks/useHybridTTS';
import VoiceWaveform from './VoiceWaveform';
import ErrorToast from './ErrorToast';
import TTSSettings from './TTSSettings';
import LanguageSelector from './LanguageSelector';
import { getErrorInfo } from '../utils/voiceErrors';
import { getSTTLanguageCode, getTTSLanguageCode } from '../utils/languageDetection';
import { matchVoiceCommand, isPotentialCommand } from '../utils/voiceCommands';

function VoicePanel({
  onUserSpeech,
  onAssistantSpeech,
  onInterimTranscript,  // 中间转录文本回调
  onCommandExecute,     // 语音命令执行回调
  enabled = true,
  showWaveform = true,
  autoContinue = true,
  interruptionEnabled = true
}) {
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [ttsMode, setTtsMode] = useState(null); // 'kokoro' | 'browser'
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsVoice, setTtsVoice] = useState('af_sky');
  const [browserVoices, setBrowserVoices] = useState([]);
  const [language, setLanguage] = useState('auto');
  const [isStarting, setIsStarting] = useState(false); // 启动加载状态
  const [statusMessage, setStatusMessage] = useState(''); // 详细状态消息
  const [commandFeedback, setCommandFeedback] = useState(null); // 命令执行反馈
  const [commandEnabled, setCommandEnabled] = useState(true); // 是否启用语音命令

  // 处理用户语音 - 检查是否为命令
  const handleUserSpeechWithCommands = useCallback((text) => {
    // 检查是否为语音命令
    if (commandEnabled) {
      const command = matchVoiceCommand(text);

      if (command) {
        console.log('[VoicePanel] 识别到语音命令:', command.id, command.feedback);

        // 显示命令反馈
        setCommandFeedback({
          command: command.id,
          feedback: command.feedback,
          matchedText: text,
          timestamp: Date.now()
        });

        // 2秒后清除反馈
        setTimeout(() => setCommandFeedback(null), 2000);

        // 执行命令
        onCommandExecute?.(command.action, command.id);

        // 不传递给 Claude（命令不作为对话内容）
        return;
      }
    }

    // 不是命令，传递给父组件处理
    onUserSpeech?.(text);
  }, [commandEnabled, onCommandExecute, onUserSpeech]);

  // 双向对话 hook
  const voice = useBidirectionalVoice({
    language: getSTTLanguageCode(language),
    voice: ttsVoice,
    autoContinue,
    interruptionEnabled,
    silenceThreshold: 1500,
    onUserSpeech: handleUserSpeechWithCommands,
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

  // 加载浏览器声音列表
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setBrowserVoices(voices);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // 混合 TTS hook (Kokoro + Browser Fallback)
  const hybridTTS = useHybridTTS({
    voice: ttsVoice,
    speed: ttsSpeed,
    language: getTTSLanguageCode(language),
    preferKokoro: ttsMode !== 'browser',
    onModeChange: (mode) => {
      setTtsMode(mode);
      console.log('[VoicePanel] TTS 模式切换:', mode);
    }
  });

  // 处理语言变化
  const handleLanguageChange = useCallback((newLanguage) => {
    setLanguage(newLanguage);
    console.log('[VoicePanel] 语言切换:', newLanguage);
  }, []);

  // 传递中间转录文本到父组件
  useEffect(() => {
    if (onInterimTranscript && voice.interimTranscript) {
      onInterimTranscript(voice.interimTranscript);
    }
  }, [voice.interimTranscript, onInterimTranscript]);

  // 处理速度变化
  const handleSpeedChange = useCallback((newSpeed) => {
    setTtsSpeed(newSpeed);
  }, []);

  // 处理声音变化
  const handleVoiceChange = useCallback((newVoice) => {
    setTtsVoice(newVoice);
  }, []);

  // 处理测试语音
  const handleTestSpeak = useCallback((text) => {
    hybridTTS.speak(text);
  }, [hybridTTS]);

  // 处理错误 - 更智能的错误处理
  useEffect(() => {
    if (voice.sttReady === false && voice.isConversationActive) {
      setError('whisper-offline');
      setStatusMessage('语音识别服务离线');
    }
    // TTS 有了 fallback，不再显示 kokoro-offline 错误
  }, [voice.sttReady, voice.isConversationActive]);

  // 更新状态消息
  useEffect(() => {
    if (isStarting) {
      setStatusMessage('正在启动...');
    } else if (voice.isListening) {
      setStatusMessage('正在聆听你的声音...');
    } else if (voice.isSpeaking) {
      setStatusMessage('正在朗读回复...');
    } else if (voice.isConversationActive) {
      setStatusMessage('等待你的发言...');
    } else if (voice.sttReady === false) {
      setStatusMessage('语音服务未就绪');
    } else {
      setStatusMessage('点击按钮开始语音对话');
    }
  }, [isStarting, voice.isListening, voice.isSpeaking, voice.isConversationActive, voice.sttReady]);

  // 使用混合 TTS 播放响应
  const speakResponseWithFallback = useCallback(async (text) => {
    if (!text || !text.trim()) return;
    hybridTTS.speak(text);
    onAssistantSpeech?.(text);
  }, [hybridTTS, onAssistantSpeech]);

  // 开始对话 - 添加加载状态
  const handleStartConversation = useCallback(() => {
    setError(null);
    setIsStarting(true);
    setStatusMessage('正在启动语音对话...');

    // 模拟启动延迟，让用户看到加载状态
    setTimeout(() => {
      voice.startConversation();
      setIsStarting(false);
    }, 300);
  }, [voice]);

  // 结束对话
  const handleEndConversation = useCallback(() => {
    voice.endConversation();
    setStatusMessage('对话已结束');
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

        {/* 当前状态 - 改进状态显示 */}
        <div className="flex flex-col items-center justify-center gap-2 mb-3">
          {/* 状态图标 */}
          <div className={`flex items-center gap-2 ${
            voice.isListening ? 'text-green-400' :
            voice.isSpeaking ? 'text-pink-400' :
            isStarting ? 'text-yellow-400' :
            error ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {isStarting && <Loader2 className="w-4 h-4 animate-spin" />}
            {voice.isListening && <Mic className="w-4 h-4 animate-pulse" />}
            {voice.isSpeaking && <Volume2 className="w-4 h-4 animate-pulse" />}
            {!isStarting && !voice.isListening && !voice.isSpeaking && !error && (
              <CheckCircle className="w-4 h-4 opacity-50" />
            )}
            <span className="text-sm font-medium">{statusMessage}</span>
          </div>

          {/* 详细状态指示 */}
          {voice.isConversationActive && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className={`px-2 py-0.5 rounded ${
                voice.currentSpeaker === 'user'
                  ? 'bg-purple-500/20 text-purple-300'
                  : voice.currentSpeaker === 'assistant'
                  ? 'bg-pink-500/20 text-pink-300'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {voice.currentSpeaker === 'user' ? '用户发言' :
                 voice.currentSpeaker === 'assistant' ? 'Claude 回复' : '等待'}
              </span>
            </div>
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

        {/* 命令执行反馈 */}
        {commandFeedback && (
          <div className="mb-2 p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30 animate-fade-in">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-300 font-medium">
                命令执行: {commandFeedback.feedback}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              识别: "{commandFeedback.matchedText}"
            </div>
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex justify-center gap-4">
          {/* 主按钮：开始/结束对话 */}
          {!voice.isConversationActive ? (
            <button
              onClick={handleStartConversation}
              disabled={!enabled || !voice.isSupported || isStarting}
              className={`p-4 rounded-full transition-all duration-200 transform active:scale-95 ${
                isStarting
                  ? 'bg-yellow-500/50 text-yellow-200 cursor-wait'
                  : voice.isSupported
                  ? 'bg-purple-500 hover:bg-purple-600 hover:scale-105 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              title="开始对话"
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
              title="结束对话"
            >
              <X className="w-6 h-6" />
            </button>
          )}

          {/* 麦克风状态 */}
          <div className={`p-4 rounded-full transition-all duration-300 ${
            voice.isListening
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105'
              : 'bg-gray-700 text-gray-400'
          }`}>
            {voice.isListening ? (
              <Mic className="w-6 h-6 animate-pulse" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </div>

          {/* 播放状态 */}
          <div className={`p-4 rounded-full transition-all duration-300 ${
            voice.isSpeaking
              ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30 scale-105'
              : 'bg-gray-700 text-gray-400'
          }`}>
            {voice.isSpeaking ? (
              <Volume2 className="w-6 h-6 animate-pulse" />
            ) : (
              <VolumeX className="w-6 h-6" />
            )}
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">语音命令</span>
              <input
                type="checkbox"
                checked={commandEnabled}
                onChange={(e) => setCommandEnabled(e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
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

            {/* 语言选择 */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <LanguageSelector
                currentLanguage={language}
                onLanguageChange={handleLanguageChange}
                showAutoDetect={true}
                compact={false}
              />
            </div>

            {/* TTS 定制设置 */}
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