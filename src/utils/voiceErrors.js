// src/utils/voiceErrors.js

export const VoiceErrors = {
  STT_ERRORS: {
    'whisper-offline': {
      title: '语音识别服务离线',
      description: 'Whisper 服务未启动，请先启动 VoiceMode 服务',
      action: '运行: mcp__voicemode__service whisper start',
      autoRetry: true,
      retryDelay: 3000
    },
    'network-error': {
      title: '网络连接失败',
      description: '无法连接到语音服务',
      action: '检查网络连接',
      autoRetry: false
    },
    'microphone-access-denied': {
      title: '麦克风权限被拒绝',
      description: '请在浏览器设置中允许麦克风访问',
      action: '打开浏览器设置 -> 隐私和安全 -> 麦克风',
      autoRetry: false
    },
    'no-speech': {
      title: '未检测到语音',
      description: '没有检测到语音输入',
      action: '请说话后再试',
      autoRetry: false
    },
    'audio-capture': {
      title: '音频捕获失败',
      description: '麦克风无法正常工作',
      action: '检查麦克风设备',
      autoRetry: false
    }
  },

  TTS_ERRORS: {
    'kokoro-offline': {
      title: '语音合成服务离线',
      description: 'Kokoro 服务未启动',
      action: '运行: mcp__voicemode__service kokoro start',
      autoRetry: true,
      retryDelay: 3000
    },
    'text-empty': {
      title: '文本内容为空',
      description: '没有需要朗读的内容',
      action: '重新发送消息',
      autoRetry: false
    }
  }
};

export function getErrorInfo(errorType, category = 'STT') {
  const errors = category === 'STT' ? VoiceErrors.STT_ERRORS : VoiceErrors.TTS_ERRORS;
  return errors[errorType] || {
    title: '未知错误',
    description: errorType,
    action: '请重试',
    autoRetry: false
  };
}

export function getErrorMessage(error) {
  const info = getErrorInfo(error, 'STT');
  return `${info.title}: ${info.description}`;
}