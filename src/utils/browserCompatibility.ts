// src/utils/browserCompatibility.ts
//
// 浏览器兼容性检测和适配
// - 音频格式检测
// - 浏览器特性检测
// - Polyfill 建议

interface BrowserSupportInfo {
  // Web Speech API (语音识别/合成)
  speechRecognition: boolean;
  speechSynthesis: boolean;

  // 音频格式
  webmOpus: boolean;
  mp3: boolean;
  wav: boolean;
  ogg: boolean;
  webm: boolean;

  // 其他特性
  mediaDevices: boolean;
  mediaRecorder: boolean;
  audioContext: boolean;
  indexedDB: boolean;
  webWorkers: boolean;
  webSocket: boolean;

  // 浏览器信息
  browser: string;
  browserVersion: string;
  platform: string;
  isMobile: boolean;
}

interface AudioFormat {
  type: string;
  name: string;
  quality: 'best' | 'good' | 'medium' | 'low' | 'unknown';
}

interface CompatibilityReport {
  browser: string;
  version: string;
  platform: string;
  isMobile: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
  overallScore: number;
}

interface AdaptedAudioConfig {
  mimeType: string;
  audioBitsPerSecond: number;
  constraints: {
    audio: {
      echoCancellation: boolean;
      noiseSuppression: boolean;
      autoGainControl: boolean;
      sampleRate: number;
    };
  };
}

interface CompatibilityWarning {
  severity: 'error' | 'warning';
  title: string;
  message: string;
  score: number;
}

/**
 * 检测浏览器支持
 */
const browserSupport: BrowserSupportInfo = {
  // Web Speech API (语音识别/合成)
  speechRecognition: false,
  speechSynthesis: false,

  // 音频格式
  webmOpus: false,
  mp3: false,
  wav: false,
  ogg: false,
  webm: false,

  // 其他特性
  mediaDevices: false,
  mediaRecorder: false,
  audioContext: false,
  indexedDB: false,
  webWorkers: false,
  webSocket: false,

  // 浏览器信息
  browser: 'unknown',
  browserVersion: 'unknown',
  platform: 'unknown',
  isMobile: false,
};

/**
 * 初始化检测
 */
function detectBrowserSupport(): BrowserSupportInfo {
  // 浏览器识别
  const ua = navigator.userAgent;
  browserSupport.platform = navigator.platform;

  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browserSupport.browser = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    browserSupport.browserVersion = match?.[1] || 'unknown';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browserSupport.browser = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    browserSupport.browserVersion = match?.[1] || 'unknown';
  } else if (ua.includes('Firefox')) {
    browserSupport.browser = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    browserSupport.browserVersion = match?.[1] || 'unknown';
  } else if (ua.includes('Edg')) {
    browserSupport.browser = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    browserSupport.browserVersion = match?.[1] || 'unknown';
  }

  // 移动端检测
  browserSupport.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);

  // Web Speech API
  browserSupport.speechRecognition =
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  browserSupport.speechSynthesis = 'speechSynthesis' in window;

  // 媒体设备
  browserSupport.mediaDevices =
    'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

  // MediaRecorder
  browserSupport.mediaRecorder = 'MediaRecorder' in window;

  // AudioContext
  browserSupport.audioContext = 'AudioContext' in window || 'webkitAudioContext' in window;

  // IndexedDB
  browserSupport.indexedDB = 'indexedDB' in window;

  // Web Workers
  browserSupport.webWorkers = 'Worker' in window;

  // WebSocket
  browserSupport.webSocket = 'WebSocket' in window;

  // 音频格式检测 (通过 MediaRecorder)
  if (browserSupport.mediaRecorder) {
    browserSupport.webmOpus = MediaRecorder.isTypeSupported('audio/webm;codecs=opus');
    browserSupport.webm = MediaRecorder.isTypeSupported('audio/webm');
    browserSupport.mp3 = MediaRecorder.isTypeSupported('audio/mp3');
    browserSupport.wav = MediaRecorder.isTypeSupported('audio/wav');
  }

  return browserSupport;
}

/**
 * 获取最佳音频格式
 */
function getBestAudioFormat(): AudioFormat {
  // 优先级顺序
  const formats: AudioFormat[] = [
    { type: 'audio/webm;codecs=opus', name: 'webm-opus', quality: 'best' },
    { type: 'audio/webm', name: 'webm', quality: 'good' },
    { type: 'audio/mp4', name: 'mp4', quality: 'medium' },
    { type: 'audio/wav', name: 'wav', quality: 'low' }, // WAV 不压缩，体积大
  ];

  for (const format of formats) {
    if (MediaRecorder.isTypeSupported(format.type)) {
      return format;
    }
  }

  // 默认返回 webm (大多数现代浏览器支持)
  return { type: 'audio/webm', name: 'webm', quality: 'unknown' };
}

/**
 * 获取兼容性报告
 */
function getCompatibilityReport(): CompatibilityReport {
  detectBrowserSupport();

  const issues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // 关键功能检测
  if (!browserSupport.mediaDevices) {
    issues.push('浏览器不支持媒体设备访问 (无法录音)');
    recommendations.push('请使用 Chrome、Safari 或 Edge 浏览器');
  }

  if (!browserSupport.mediaRecorder) {
    issues.push('浏览器不支持 MediaRecorder (无法录制音频)');
    recommendations.push('请使用现代浏览器');
  }

  if (!browserSupport.webmOpus && !browserSupport.webm) {
    warnings.push('浏览器可能不支持 WebM 格式，音频质量可能降低');
    recommendations.push('建议使用 Chrome 或 Edge 获得最佳音频质量');
  }

  if (!browserSupport.speechSynthesis) {
    warnings.push('浏览器不支持语音合成 (无法朗读)');
    recommendations.push('将使用 Kokoro 服务替代');
  }

  if (!browserSupport.indexedDB) {
    warnings.push('浏览器不支持 IndexedDB (无法缓存消息)');
  }

  // Firefox 特殊处理
  if (browserSupport.browser === 'Firefox') {
    warnings.push('Firefox 对 Web Speech API 支持有限');
    recommendations.push('语音识别将使用本地 Whisper 服务');
  }

  // Safari 特殊处理
  if (browserSupport.browser === 'Safari') {
    warnings.push('Safari 需要用户交互才能访问麦克风');
    recommendations.push('请点击语音按钮开始录音');
  }

  // 移动端特殊处理
  if (browserSupport.isMobile) {
    warnings.push('移动设备可能有限制');
    recommendations.push('建议使用最新版本的移动浏览器');
  }

  return {
    browser: browserSupport.browser,
    version: browserSupport.browserVersion,
    platform: browserSupport.platform,
    isMobile: browserSupport.isMobile,
    issues,
    warnings,
    recommendations,
    overallScore: calculateCompatibilityScore(),
  };
}

/**
 * 计算兼容性分数
 */
function calculateCompatibilityScore(): number {
  const weights: Record<string, number> = {
    mediaDevices: 30,
    mediaRecorder: 25,
    webmOpus: 15,
    speechSynthesis: 10,
    indexedDB: 10,
    audioContext: 10,
  };

  let score = 0;
  for (const [feature, weight] of Object.entries(weights)) {
    const key = feature as keyof BrowserSupportInfo;
    if (browserSupport[key]) {
      score += weight;
    }
  }

  return score;
}

/**
 * 获取适配后的音频配置
 */
function getAdaptedAudioConfig(): AdaptedAudioConfig {
  const bestFormat = getBestAudioFormat();

  return {
    mimeType: bestFormat.type,
    audioBitsPerSecond: browserSupport.webmOpus ? 128000 : 64000, // Opus 更高效
    constraints: {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: browserSupport.webmOpus ? 24000 : 16000,
      },
    },
  };
}

/**
 * 显示兼容性警告 UI
 */
function showCompatibilityWarning(report: CompatibilityReport): CompatibilityWarning | null {
  if (report.issues.length === 0 && report.warnings.length === 0) {
    return null;
  }

  const severity: 'error' | 'warning' = report.issues.length > 0 ? 'error' : 'warning';

  const messages: string[] = [];
  if (report.issues.length > 0) {
    messages.push(`❌ 问题:\n${report.issues.map(i => `- ${i}`).join('\n')}`);
  }
  if (report.warnings.length > 0) {
    messages.push(`⚠️ 警告:\n${report.warnings.map(w => `- ${w}`).join('\n')}`);
  }
  if (report.recommendations.length > 0) {
    messages.push(`💡 建议:\n${report.recommendations.map(r => `- ${r}`).join('\n')}`);
  }

  return {
    severity,
    title: '浏览器兼容性',
    message: messages.join('\n\n'),
    score: report.overallScore,
  };
}

// 初始化检测
detectBrowserSupport();

export {
  browserSupport,
  detectBrowserSupport,
  getBestAudioFormat,
  getCompatibilityReport,
  getAdaptedAudioConfig,
  showCompatibilityWarning,
  calculateCompatibilityScore,
};

export type {
  BrowserSupportInfo,
  AudioFormat,
  CompatibilityReport,
  AdaptedAudioConfig,
  CompatibilityWarning,
};

export default {
  browserSupport,
  getCompatibilityReport,
  getAdaptedAudioConfig,
};