// src/hooks/useHybridTTS.js
//
// 混合 TTS Hook - 自动选择最佳 TTS 服务
// - 优先使用 Kokoro (本地服务，高质量)
// - Fallback 到浏览器 SpeechSynthesis (总是可用)
//
// useHybridTTS: 智能选择 TTS 后端
// useBrowserTTS: 浏览器原生 TTS (fallback)

import { useState, useRef, useCallback, useEffect } from 'react';
import { getErrorInfo } from '../utils/voiceErrors';
import { getCachedAudio, cacheAudio, clearAllCache, getCacheStats } from '../utils/ttsCache';

/**
 * 浏览器原生 TTS Hook (Fallback)
 * 使用 Web Speech API SpeechSynthesis
 */
export function useBrowserTTS(options = {}) {
  const {
    language = 'zh-CN',
    rate = 1.0,
    pitch = 1.0,
    onEnd,
    onError
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  // 获取可用声音列表
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);

      // 选择中文声音（优先）
      const chineseVoice = availableVoices.find(v =>
        v.lang.includes('zh') || v.lang.includes('Chinese')
      );
      if (chineseVoice) {
        setSelectedVoice(chineseVoice);
      } else {
        // 使用默认声音
        setSelectedVoice(availableVoices[0]);
      }
    };

    // 立即加载
    loadVoices();

    // Chrome 需要等待 voiceschanged 事件
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [language]);

  // 播放文本
  const speak = useCallback((text) => {
    if (!text || !text.trim()) return;

    // 停止当前播放
    stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = rate;
    utterance.pitch = pitch;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };

    utterance.onerror = (event) => {
      console.error('[BrowserTTS] 错误:', event.error);
      setIsSpeaking(false);
      onError?.('tts-error', event.error);
    };

    speechSynthesis.speak(utterance);
  }, [language, rate, pitch, selectedVoice, onEnd, onError]);

  // 停止播放
  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isSpeaking,
    voices,
    selectedVoice,
    setSelectedVoice,
    speak,
    stop,
    isSupported: typeof speechSynthesis !== 'undefined'
  };
}

/**
 * 混合 TTS Hook
 * - 自动检测 Kokoro 服务状态
 * - Kokoro 可用时使用本地服务
 * - Kokoro 不可用时 fallback 到浏览器 SpeechSynthesis
 */
export function useHybridTTS(options = {}) {
  const {
    voice = 'af_sky',
    speed = 1.0,
    language = 'zh-CN',
    kokoroEndpoint = '/api/voice/tts',
    onModeChange,
    onEnd,
    onError,
    preferKokoro = true,  // 优先使用 Kokoro
    enableCache = true    // 启用缓存
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMode, setCurrentMode] = useState(null); // 'kokoro' | 'browser' | null
  const [kokoroReady, setKokoroReady] = useState(null);
  const [browserReady, setBrowserReady] = useState(null);

  const kokoroAudioRef = useRef(null);
  const browserTTSRef = useRef(null);

  // 浏览器 TTS hook
  const browserTTS = useBrowserTTS({
    language,
    rate: speed,
    onEnd: () => {
      setIsSpeaking(false);
      onEnd?.();
    },
    onError: (type, error) => {
      setIsSpeaking(false);
      onError?.(type, error);
    }
  });

  // 检查 Kokoro 服务状态
  useEffect(() => {
    const checkKokoroStatus = async () => {
      try {
        const response = await fetch('/api/voice/status');
        const data = await response.json();
        setKokoroReady(data.kokoro === 'running');
      } catch {
        setKokoroReady(false);
      }
    };

    checkKokoroStatus();
    // 每 30 秒检查一次
    const interval = setInterval(checkKokoroStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // 检查浏览器 TTS 支持状态
  useEffect(() => {
    setBrowserReady(browserTTS.isSupported);
  }, [browserTTS.isSupported]);

  // 确定当前使用的 TTS 模式
  useEffect(() => {
    let mode = null;

    if (preferKokoro && kokoroReady) {
      mode = 'kokoro';
    } else if (browserReady) {
      mode = 'browser';
    }

    if (mode !== currentMode) {
      setCurrentMode(mode);
      onModeChange?.(mode);
    }
  }, [kokoroReady, browserReady, preferKokoro, currentMode, onModeChange]);

  // 使用 Kokoro 播放 (支持缓存)
  const speakWithKokoro = async (text) => {
    try {
      setIsSpeaking(true);

      // 检查缓存 (如果启用)
      if (enableCache) {
        const cachedAudio = await getCachedAudio(text, voice, speed);
        if (cachedAudio) {
          console.log('[HybridTTS] 使用缓存音频');
          const audioUrl = URL.createObjectURL(cachedAudio);
          kokoroAudioRef.current = new Audio(audioUrl);

          kokoroAudioRef.current.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            kokoroAudioRef.current = null;
            onEnd?.();
          };

          kokoroAudioRef.current.onerror = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            kokoroAudioRef.current = null;
            onError?.('kokoro-error', '音频播放失败');
          };

          await kokoroAudioRef.current.play();
          return;
        }
      }

      // 未缓存，从 Kokoro 服务获取
      const response = await fetch(kokoroEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed })
      });

      if (!response.ok) {
        throw new Error(`Kokoro 服务响应错误: ${response.status}`);
      }

      const audioBlob = await response.blob();

      // 缓存音频 (如果启用)
      if (enableCache) {
        await cacheAudio(text, audioBlob, voice, speed);
      }

      const audioUrl = URL.createObjectURL(audioBlob);

      kokoroAudioRef.current = new Audio(audioUrl);

      kokoroAudioRef.current.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        kokoroAudioRef.current = null;
        onEnd?.();
      };

      kokoroAudioRef.current.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        kokoroAudioRef.current = null;
        onError?.('kokoro-error', '音频播放失败');
      };

      await kokoroAudioRef.current.play();

    } catch (err) {
      console.error('[KokoroTTS] 播放失败:', err);
      setIsSpeaking(false);

      // Kokoro 失败，尝试 fallback 到浏览器 TTS
      if (browserReady) {
        console.log('[HybridTTS] Kokoro 失败，切换到浏览器 TTS');
        setCurrentMode('browser');
        onModeChange?.('browser');
        browserTTS.speak(text);
      } else {
        onError?.('tts-error', err.message);
      }
    }
  };

  // 使用浏览器 TTS 播放
  const speakWithBrowser = (text) => {
    browserTTS.speak(text);
  };

  // 智能播放
  const speak = useCallback(async (text) => {
    if (!text || !text.trim()) return;

    // 停止当前播放
    stop();

    // 根据当前模式选择 TTS 后端
    if (preferKokoro && kokoroReady) {
      await speakWithKokoro(text);
    } else if (browserReady) {
      speakWithBrowser(text);
    } else {
      onError?.('tts-unavailable', '无可用 TTS 服务');
    }
  }, [preferKokoro, kokoroReady, browserReady, voice, speed, language]);

  // 停止播放
  const stop = useCallback(() => {
    // 停止 Kokoro
    if (kokoroAudioRef.current) {
      kokoroAudioRef.current.pause();
      kokoroAudioRef.current.currentTime = 0;
      URL.revokeObjectURL(kokoroAudioRef.current.src);
      kokoroAudioRef.current = null;
    }

    // 停止浏览器 TTS
    browserTTS.stop();

    setIsSpeaking(false);
  }, [browserTTS]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // 切换到指定模式
  const switchMode = useCallback((mode) => {
    if (mode === 'kokoro' && kokoroReady) {
      setCurrentMode('kokoro');
      onModeChange?.('kokoro');
    } else if (mode === 'browser' && browserReady) {
      setCurrentMode('browser');
      onModeChange?.('browser');
    }
  }, [kokoroReady, browserReady, onModeChange]);

  return {
    isSpeaking,
    currentMode,
    kokoroReady,
    browserReady,
    voices: browserTTS.voices,
    selectedVoice: browserTTS.selectedVoice,
    setSelectedVoice: browserTTS.setSelectedVoice,
    speak,
    stop,
    switchMode,
    isSupported: kokoroReady || browserReady,
    // 缓存相关
    clearCache: clearAllCache,
    getCacheStats,
    enableCache
  };
}

export default useHybridTTS;