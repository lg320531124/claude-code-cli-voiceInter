// src/components/VoiceStatusIndicator.jsx
//
// 语音状态指示器 - 显示详细的交互状态
// - 不同状态使用不同颜色和图标
// - 动态文字提示
// - 进度指示器

import React from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Loader,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Speaker
} from 'lucide-react';

// 状态类型定义
export const VoiceStatus = {
  // STT 状态
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  TRANSCRIBING: 'transcribing',

  // TTS 状态
  SPEAKING: 'speaking',
  INTERRUPTED: 'interrupted',

  // 连接状态
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',

  // 服务状态
  WHISPER_READY: 'whisper-ready',
  WHISPER_OFFLINE: 'whisper-offline',
  KOKORO_READY: 'kokoro-ready',
  KOKORO_OFFLINE: 'kokoro-offline',
  BROWSER_TTS: 'browser-tts'
};

// 状态配置
const statusConfig = {
  [VoiceStatus.IDLE]: {
    icon: Mic,
    color: 'gray',
    text: '准备就绪',
    bgColor: 'bg-gray-700'
  },
  [VoiceStatus.LISTENING]: {
    icon: Mic,
    color: 'red',
    text: '正在聆听...',
    bgColor: 'bg-red-500/20',
    animate: true
  },
  [VoiceStatus.PROCESSING]: {
    icon: Loader,
    color: 'purple',
    text: '处理中...',
    bgColor: 'bg-purple-500/20',
    animate: true
  },
  [VoiceStatus.TRANSCRIBING]: {
    icon: Loader,
    color: 'blue',
    text: '转录中...',
    bgColor: 'bg-blue-500/20',
    animate: true
  },
  [VoiceStatus.SPEAKING]: {
    icon: Volume2,
    color: 'pink',
    text: '正在朗读...',
    bgColor: 'bg-pink-500/20',
    animate: true
  },
  [VoiceStatus.INTERRUPTED]: {
    icon: AlertCircle,
    color: 'yellow',
    text: '已打断',
    bgColor: 'bg-yellow-500/20'
  },
  [VoiceStatus.CONNECTED]: {
    icon: Wifi,
    color: 'green',
    text: '已连接',
    bgColor: 'bg-green-500/20'
  },
  [VoiceStatus.DISCONNECTED]: {
    icon: WifiOff,
    color: 'red',
    text: '连接断开',
    bgColor: 'bg-red-500/20'
  },
  [VoiceStatus.RECONNECTING]: {
    icon: Loader,
    color: 'yellow',
    text: '重新连接...',
    bgColor: 'bg-yellow-500/20',
    animate: true
  },
  [VoiceStatus.WHISPER_READY]: {
    icon: CheckCircle,
    color: 'green',
    text: 'Whisper 就绪',
    bgColor: 'bg-green-500/20'
  },
  [VoiceStatus.WHISPER_OFFLINE]: {
    icon: AlertCircle,
    color: 'red',
    text: 'Whisper 离线',
    bgColor: 'bg-red-500/20'
  },
  [VoiceStatus.KOKORO_READY]: {
    icon: CheckCircle,
    color: 'green',
    text: 'Kokoro 就绪',
    bgColor: 'bg-green-500/20'
  },
  [VoiceStatus.KOKORO_OFFLINE]: {
    icon: AlertCircle,
    color: 'yellow',
    text: 'Kokoro 离线',
    bgColor: 'bg-yellow-500/20'
  },
  [VoiceStatus.BROWSER_TTS]: {
    icon: Speaker,
    color: 'blue',
    text: '浏览器 TTS',
    bgColor: 'bg-blue-500/20'
  }
};

// 获取颜色类名
function getColorClasses(color) {
  const colors = {
    gray: { text: 'text-gray-400', border: 'border-gray-400/30', bg: 'bg-gray-700' },
    red: { text: 'text-red-400', border: 'border-red-400/30', bg: 'bg-red-500/20' },
    purple: { text: 'text-purple-400', border: 'border-purple-400/30', bg: 'bg-purple-500/20' },
    blue: { text: 'text-blue-400', border: 'border-blue-400/30', bg: 'bg-blue-500/20' },
    pink: { text: 'text-pink-400', border: 'border-pink-400/30', bg: 'bg-pink-500/20' },
    yellow: { text: 'text-yellow-400', border: 'border-yellow-400/30', bg: 'bg-yellow-500/20' },
    green: { text: 'text-green-400', border: 'border-green-400/30', bg: 'bg-green-500/20' }
  };
  return colors[color] || colors.gray;
}

/**
 * 状态指示器组件
 */
function VoiceStatusIndicator({
  status,
  size = 'sm',
  showText = true,
  className = ''
}) {
  const config = statusConfig[status] || statusConfig[VoiceStatus.IDLE];
  const Icon = config.icon;
  const colorClasses = getColorClasses(config.color);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${config.bgColor} ${colorClasses.border} border backdrop-blur-sm`}>
        <Icon
          className={`${sizeClasses[size]} ${colorClasses.text} ${config.animate ? 'animate-pulse' : ''}`}
        />
        {showText && (
          <span className={`text-xs ${colorClasses.text}`}>
            {config.text}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 组合状态显示组件
 */
function VoiceStatusBar({
  sttStatus,
  ttsStatus,
  connectionStatus,
  currentSpeaker,
  interimText
}) {
  return (
    <div className="flex flex-wrap gap-2 p-2 bg-gray-900/50 rounded-lg">
      {/* 连接状态 */}
      <VoiceStatusIndicator status={connectionStatus} size="sm" />

      {/* STT 状态 */}
      <VoiceStatusIndicator status={sttStatus} size="sm" />

      {/* TTS 状态 */}
      <VoiceStatusIndicator status={ttsStatus} size="sm" />

      {/* 当前说话者 */}
      {currentSpeaker && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
          currentSpeaker === 'user'
            ? 'bg-purple-500/20 border-purple-400/30'
            : 'bg-pink-500/20 border-pink-400/30'
        } border`}>
          <span className={`text-xs ${
            currentSpeaker === 'user' ? 'text-purple-400' : 'text-pink-400'
          }`}>
            {currentSpeaker === 'user' ? '用户' : '助手'}
          </span>
        </div>
      )}

      {/* 中间文本 */}
      {interimText && (
        <div className="flex-1 text-sm text-gray-300 truncate max-w-[200px]">
          "{interimText}"
        </div>
      )}
    </div>
  );
}

/**
 * 进度指示器
 */
function VoiceProgressIndicator({
  progress,
  label,
  showPercentage = true
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-400">{label}</span>}
      <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
      )}
    </div>
  );
}

/**
 * 详细状态面板
 */
function VoiceDetailedStatus({
  whisperReady,
  kokoroReady,
  browserReady,
  ttsMode,
  connectionQuality,
  volumeLevel
}) {
  return (
    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-900/50 rounded-lg text-xs">
      {/* Whisper */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400">Whisper STT</span>
        <span className={whisperReady ? 'text-green-400' : 'text-red-400'}>
          {whisperReady ? '就绪' : '离线'}
        </span>
      </div>

      {/* TTS */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400">语音合成</span>
        <span className={kokoroReady || browserReady ? 'text-green-400' : 'text-yellow-400'}>
          {ttsMode === 'kokoro' ? 'Kokoro' : ttsMode === 'browser' ? '浏览器' : '检测中'}
        </span>
      </div>

      {/* 连接质量 */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400">连接质量</span>
        <span className={
          connectionQuality === '优秀' ? 'text-green-400' :
          connectionQuality === '良好' ? 'text-blue-400' :
          connectionQuality === '一般' ? 'text-yellow-400' :
          connectionQuality === '较差' ? 'text-red-400' :
          'text-gray-400'
        }>
          {connectionQuality || '未知'}
        </span>
      </div>

      {/* 音量 */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400">音量</span>
        <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500"
            style={{ width: `${volumeLevel}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export {
  VoiceStatusIndicator,
  VoiceStatusBar,
  VoiceProgressIndicator,
  VoiceDetailedStatus,
  statusConfig
};

export default VoiceStatusIndicator;