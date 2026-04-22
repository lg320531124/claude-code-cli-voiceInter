// src/utils/languageDetection.ts
//
// 语言检测和切换工具
// - 自动检测文本语言 (中文/英文)
// - 支持手动语言切换
// - 语言配置管理

import logger from './logger';

logger.setContext('Language');

interface LanguageInfo {
  id: string;
  name: string;
  code: string;
  sttCode: string;
  ttsCode: string;
}

interface BrowserVoicePrefs {
  langContains: string;
  prefer: string;
}

interface RecommendedVoices {
  kokoro: string[];
  browser: BrowserVoicePrefs;
}

/**
 * 支持的语言列表
 */
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { id: 'auto', name: '自动检测', code: 'auto', sttCode: 'auto', ttsCode: 'zh-CN' },
  { id: 'zh-CN', name: '中文 (简体)', code: 'zh-CN', sttCode: 'zh', ttsCode: 'zh-CN' },
  { id: 'zh-TW', name: '中文 (繁体)', code: 'zh-TW', sttCode: 'zh', ttsCode: 'zh-TW' },
  { id: 'en-US', name: '英语 (美国)', code: 'en-US', sttCode: 'en', ttsCode: 'en-US' },
  { id: 'en-GB', name: '英语 (英国)', code: 'en-GB', sttCode: 'en', ttsCode: 'en-GB' },
  { id: 'ja-JP', name: '日语', code: 'ja-JP', sttCode: 'ja', ttsCode: 'ja-JP' },
  { id: 'ko-KR', name: '韩语', code: 'ko-KR', sttCode: 'ko', ttsCode: 'ko-KR' },
  { id: 'fr-FR', name: '法语', code: 'fr-FR', sttCode: 'fr', ttsCode: 'fr-FR' },
  { id: 'de-DE', name: '德语', code: 'de-DE', sttCode: 'de', ttsCode: 'de-DE' },
  { id: 'es-ES', name: '西班牙语', code: 'es-ES', sttCode: 'es', ttsCode: 'es-ES' },
];

/**
 * 默认语言
 */
export const DEFAULT_LANGUAGE: LanguageInfo = SUPPORTED_LANGUAGES[0]; // auto

/**
 * 检测文本语言
 * 基于字符特征进行简单判断
 */
export function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'auto';
  }

  const chineseChars = /[一-鿿㐀-䶿]/g;
  const japaneseChars = /[぀-ヿㇰ-ㇿ]/g;
  const koreanChars = /[가-힯]/g;
  const englishChars = /[a-zA-Z]/g;

  const chineseCount = (text.match(chineseChars) || []).length;
  const japaneseCount = (text.match(japaneseChars) || []).length;
  const koreanCount = (text.match(koreanChars) || []).length;
  const englishCount = (text.match(englishChars) || []).length;

  const total = chineseCount + japaneseCount + koreanCount + englishCount;

  if (total === 0) {
    return 'auto';
  }

  // 判断主要语言
  const ratios: Record<string, number> = {
    zh: chineseCount / total,
    ja: japaneseCount / total,
    ko: koreanCount / total,
    en: englishCount / total,
  };

  // 找出占比最高的语言
  let maxLang = 'en';
  let maxRatio = ratios.en;

  for (const [lang, ratio] of Object.entries(ratios)) {
    if (ratio > maxRatio) {
      maxLang = lang;
      maxRatio = ratio;
    }
  }

  // 如果中文占比超过 30%，判定为中文
  if (ratios.zh > 0.3) {
    return 'zh-CN';
  }

  // 如果日语占比超过 20%，判定为日语
  if (ratios.ja > 0.2) {
    return 'ja-JP';
  }

  // 如果韩语占比超过 20%，判定为韩语
  if (ratios.ko > 0.2) {
    return 'ko-KR';
  }

  // 否则判定为英语
  return 'en-US';
}

/**
 * 获取 STT 语言代码
 */
export function getSTTLanguageCode(languageId: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.id === languageId);
  if (!lang) return 'auto';

  // 如果是自动检测，返回 auto
  if (lang.id === 'auto') return 'auto';

  return lang.sttCode;
}

/**
 * 获取 TTS 语言代码
 */
export function getTTSLanguageCode(languageId: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.id === languageId);
  if (!lang) return 'zh-CN';

  return lang.ttsCode;
}

/**
 * 根据检测结果获取合适的 TTS 语言代码
 */
export function getAdaptiveTTSLanguage(detectedLanguage: string): string {
  if (detectedLanguage === 'auto') {
    return 'zh-CN'; // 默认中文
  }

  // 查找匹配的语言
  const lang = SUPPORTED_LANGUAGES.find(l => l.id === detectedLanguage);
  return lang ? lang.ttsCode : 'zh-CN';
}

/**
 * 检查是否为中英文混合文本
 */
export function isMixedLanguage(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  const hasChinese = /[一-鿿]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);

  return hasChinese && hasEnglish;
}

/**
 * 保存语言设置到 localStorage
 */
export function saveLanguageSetting(languageId: string): boolean {
  try {
    localStorage.setItem('claude-voice-language', languageId);
    return true;
  } catch (e) {
    logger.warn('保存语言设置失败', { error: e });
    return false;
  }
}

/**
 * 加载语言设置
 */
export function loadLanguageSetting(): LanguageInfo {
  try {
    const saved = localStorage.getItem('claude-voice-language');
    if (saved) {
      const lang = SUPPORTED_LANGUAGES.find(l => l.id === saved);
      return lang || DEFAULT_LANGUAGE;
    }
  } catch (e) {
    logger.warn('加载语言设置失败', { error: e });
  }
  return DEFAULT_LANGUAGE;
}

/**
 * 获取语言显示名称
 */
export function getLanguageName(languageId: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.id === languageId);
  return lang ? lang.name : '未知';
}

/**
 * 获取常用语言的语音推荐
 */
export function getRecommendedVoices(languageId: string): RecommendedVoices {
  // Kokoro 推荐声音
  const kokoroVoices: Record<string, string[]> = {
    'zh-CN': ['af_sky'], // Sky 支持多语言
    'en-US': ['af_bella', 'af_sarah', 'am_adam'],
    'en-GB': ['bf_emma', 'bm_george'],
    'ja-JP': [], // Kokoro 目前不支持日语
    'ko-KR': [], // Kokoro 目前不支持韩语
  };

  // 浏览器 TTS 推荐声音特征
  const browserVoicePrefs: Record<string, BrowserVoicePrefs> = {
    'zh-CN': { langContains: 'zh', prefer: 'Google 中文' },
    'en-US': { langContains: 'en-US', prefer: 'Google US English' },
    'en-GB': { langContains: 'en-GB', prefer: 'Google UK English' },
    'ja-JP': { langContains: 'ja', prefer: 'Google 日本語' },
    'ko-KR': { langContains: 'ko', prefer: 'Google 한국어' },
  };

  const kokoro = kokoroVoices[languageId] || kokoroVoices['zh-CN'];
  const browser = browserVoicePrefs[languageId] || browserVoicePrefs['zh-CN'];

  return { kokoro, browser };
}

export type { LanguageInfo, BrowserVoicePrefs, RecommendedVoices };
export default {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  detectLanguage,
  getSTTLanguageCode,
  getTTSLanguageCode,
  getAdaptiveTTSLanguage,
  isMixedLanguage,
  saveLanguageSetting,
  loadLanguageSetting,
  getLanguageName,
  getRecommendedVoices,
};