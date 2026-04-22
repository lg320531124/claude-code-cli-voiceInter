// src/hooks/useEnhancedVoice.js
//
// 增强版语音 Hooks - 支持流式 STT、TTS 打断、双向对话
//
// useStreamingWhisper: 流式 STT (边说边转录)
// useInterruptibleKokoro: 可打断的 TTS
// useBidirectionalVoice: 双向对话模式

import { useState, useRef, useCallback, useEffect } from 'react';
import { getErrorInfo } from '../utils/voiceErrors';

/**
 * 流式 Whisper STT Hook
 * - 实时转录：每隔一定时间发送音频片段获取部分结果
 * - VAD 自动停止
 * - 显示中间转录结果
 */
export function useStreamingWhisper(options = {}) {
  const {
    language = 'auto',
    onResult,
    onInterimResult,
    onError,
    autoStop = true,
    silenceThreshold = 1500,     // 1.5秒静音阈值
    streamingInterval = 2000,    // 每2秒发送一次片段
    minChunkDuration = 500       // 最小音频片段长度
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [serviceReady, setServiceReady] = useState(null);
  const [volumeLevel, setVolumeLevel] = useState(0);  // 用于波形显示

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamingChunksRef = useRef([]);
  const streamRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const streamingTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const lastSpeechTimeRef = useRef(Date.now());
  const recordingStartTimeRef = useRef(0);
  const accumulatedTranscriptRef = useRef('');

  // 检查服务状态
  useEffect(() => {
    fetch('/api/voice/status')
      .then(res => res.json())
      .then(data => setServiceReady(data.whisper === 'running'))
      .catch(() => setServiceReady(false));
  }, []);

  // 发送音频片段获取转录
  const sendChunkToWhisper = async (audioBlob, isInterim = true) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch('/api/voice/stt', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success && result.text) {
        if (isInterim) {
          // 中间结果，追加到累积转录
          setInterimTranscript(result.text);
          onInterimResult?.(result.text);
        } else {
          // 最终结果
          setTranscript(result.text);
          onResult?.(result.text);
        }
      }
    } catch (err) {
      console.error('[Whisper] 发送失败:', err);
      if (!isInterim) {
        const errorType = 'network-error';
        setError(errorType);
        onError?.(errorType, getErrorInfo(errorType));
      }
    }
  };

  // VAD 和音量检测
  const startVAD = useCallback((stream) => {
    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 512;
    source.connect(analyserRef.current);

    const dataArray = new Float32Array(analyserRef.current.frequencyBinCount);

    const checkActivity = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getFloatTimeDomainData(dataArray);

      let maxVolume = 0;
      for (let i = 0; i < dataArray.length; i++) {
        maxVolume = Math.max(maxVolume, Math.abs(dataArray[i]));
      }

      // 更新音量级别 (0-100)
      setVolumeLevel(Math.round(maxVolume * 100));

      const now = Date.now();

      if (maxVolume > 0.01) {
        // 有语音活动
        lastSpeechTimeRef.current = now;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (autoStop && !silenceTimerRef.current && isListening) {
        // 检测静音
        const silenceDuration = now - lastSpeechTimeRef.current;
        if (silenceDuration >= silenceThreshold) {
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current && isListening) {
              stopListening();
            }
          }, silenceThreshold);
        }
      }
    };

    const vadInterval = setInterval(checkActivity, 50);
    return () => {
      clearInterval(vadInterval);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [autoStop, silenceThreshold, isListening]);

  // 流式发送定时器
  const startStreamingTimer = useCallback(() => {
    streamingTimerRef.current = setInterval(() => {
      if (streamingChunksRef.current.length > 0) {
        const blob = new Blob(streamingChunksRef.current, { type: 'audio/webm' });
        // 发送片段获取中间结果
        sendChunkToWhisper(blob, true);
        // 清空片段缓存，但保留完整音频
        streamingChunksRef.current = [];
      }
    }, streamingInterval);
  }, [streamingInterval]);

  // 开始录音
  const startListening = useCallback(async () => {
    try {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      audioChunksRef.current = [];
      streamingChunksRef.current = [];
      accumulatedTranscriptRef.current = '';
      lastSpeechTimeRef.current = Date.now();
      recordingStartTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000
        }
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // 保存到完整音频
          audioChunksRef.current.push(event.data);
          // 保存到流式片段
          streamingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // 停止流式定时器
        if (streamingTimerRef.current) {
          clearInterval(streamingTimerRef.current);
          streamingTimerRef.current = null;
        }

        // 发送完整音频获取最终结果
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendChunkToWhisper(blob, false);

        cleanup();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // 每100ms收集数据
      setIsListening(true);

      // 启动 VAD
      startVAD(stream);

      // 启动流式发送
      startStreamingTimer();

    } catch (err) {
      console.error('[Whisper] 启动失败:', err);
      const errorType = err.name === 'NotAllowedError'
        ? 'microphone-access-denied'
        : 'audio-capture';
      setError(errorType);
      const errorInfo = getErrorInfo(errorType);
      onError?.(errorType, errorInfo);
    }
  }, [language, onResult, onInterimResult, onError, startVAD, startStreamingTimer]);

  // 停止录音
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      setVolumeLevel(0);
    }
  }, [isListening]);

  // 清理资源
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [cleanup]);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    serviceReady,
    volumeLevel,
    startListening,
    stopListening,
    isSupported: serviceReady !== false
  };
}

/**
 * 可打断的 Kokoro TTS Hook
 * - 用户说话时自动停止播放
 * - 提供打断检测回调
 */
export function useInterruptibleKokoro(options = {}) {
  const {
    voice = 'af_sky',
    speed = 1.0,
    onInterrupt,
    interruptionVolumeThreshold = 0.02  // 音量阈值触发打断
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [serviceReady, setServiceReady] = useState(null);
  const [canInterrupt, setCanInterrupt] = useState(true);

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const interruptCheckIntervalRef = useRef(null);

  // 检查服务状态
  useEffect(() => {
    fetch('/api/voice/status')
      .then(res => res.json())
      .then(data => setServiceReady(data.kokoro === 'running'))
      .catch(() => setServiceReady(false));
  }, []);

  // 启动打断检测（监听麦克风）
  const startInterruptDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      source.connect(analyserRef.current);

      const dataArray = new Float32Array(analyserRef.current.frequencyBinCount);

      // 定期检查是否有用户说话
      interruptCheckIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !isSpeaking) return;

        analyserRef.current.getFloatTimeDomainData(dataArray);

        let maxVolume = 0;
        for (let i = 0; i < dataArray.length; i++) {
          maxVolume = Math.max(maxVolume, Math.abs(dataArray[i]));
        }

        // 检测到用户说话，打断 TTS
        if (maxVolume > interruptionVolumeThreshold && canInterrupt) {
          console.log('[Kokoro] 检测到用户说话，打断播放');
          stop();
          onInterrupt?.();
          stopInterruptDetection();
        }
      }, 100);

    } catch (err) {
      console.error('[Kokoro] 打断检测启动失败:', err);
    }
  }, [isSpeaking, canInterrupt, interruptionVolumeThreshold, onInterrupt]);

  // 停止打断检测
  const stopInterruptDetection = useCallback(() => {
    if (interruptCheckIntervalRef.current) {
      clearInterval(interruptCheckIntervalRef.current);
      interruptCheckIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // 播放文本
  const speak = useCallback(async (text) => {
    if (!text || !text.trim()) return;

    // 停止当前播放
    stop();

    try {
      setIsSpeaking(true);

      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed })
      });

      if (!response.ok) {
        throw new Error(`TTS 服务响应错误: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      audioRef.current = new Audio(audioUrl);

      audioRef.current.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        stopInterruptDetection();
      };

      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        stopInterruptDetection();
      };

      await audioRef.current.play();

      // 启动打断检测
      if (canInterrupt) {
        startInterruptDetection();
      }

    } catch (err) {
      console.error('[Kokoro] 播放失败:', err);
      setIsSpeaking(false);
      stopInterruptDetection();
    }
  }, [voice, speed, canInterrupt, startInterruptDetection, stopInterruptDetection]);

  // 停止播放
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setIsSpeaking(false);
    stopInterruptDetection();
  }, [stopInterruptDetection]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isSpeaking,
    serviceReady,
    canInterrupt,
    speak,
    stop,
    setCanInterrupt,
    isSupported: serviceReady !== false
  };
}

/**
 * 双向对话模式 Hook
 * - 自动连续交互：TTS 结束后自动启动 STT
 * - 用户说话时打断 TTS
 * - 完整对话循环
 */
export function useBidirectionalVoice(options = {}) {
  const {
    language = 'auto',
    voice = 'af_sky',
    onUserSpeech,
    onAssistantSpeech,
    onConversationStart,
    onConversationEnd,
    autoContinue = true,           // TTS 结束后自动启动 STT
    silenceThreshold = 1500,
    interruptionEnabled = true
  } = options;

  const [isConversationActive, setIsConversationActive] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState(null); // 'user' | 'assistant' | null
  const [userTranscript, setUserTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);

  // STT hook
  const stt = useStreamingWhisper({
    language,
    silenceThreshold,
    onResult: (text) => {
      setUserTranscript(text);
      setCurrentSpeaker(null);
      onUserSpeech?.(text);

      // 如果启用自动继续，停止对话循环等待响应
      if (autoContinue) {
        // 等待外部处理（发送到 Claude 等）
      }
    },
    onInterimResult: (text) => {
      setInterimTranscript(text);
    }
  });

  // TTS hook
  const tts = useInterruptibleKokoro({
    voice,
    onInterrupt: () => {
      console.log('[Bidirectional] 用户打断，切换到听模式');
      setCurrentSpeaker('user');
      stt.startListening();
    }
  });

  // 开始对话
  const startConversation = useCallback(async () => {
    setIsConversationActive(true);
    setCurrentSpeaker('user');
    onConversationStart?.();

    tts.setCanInterrupt(interruptionEnabled);
    await stt.startListening();
  }, [stt, tts, interruptionEnabled, onConversationStart]);

  // 结束对话
  const endConversation = useCallback(() => {
    setIsConversationActive(false);
    setCurrentSpeaker(null);
    stt.stopListening();
    tts.stop();
    onConversationEnd?.();
  }, [stt, tts, onConversationEnd]);

  // 用户说完后，播放响应
  const speakResponse = useCallback(async (text) => {
    if (!text || !text.trim()) return;

    setUserTranscript('');
    setInterimTranscript('');
    setCurrentSpeaker('assistant');

    await tts.speak(text);
    onAssistantSpeech?.(text);
  }, [tts, onAssistantSpeech]);

  // TTS 结束后，自动启动 STT 继续对话
  useEffect(() => {
    if (autoContinue && !tts.isSpeaking && isConversationActive && currentSpeaker === null) {
      // TTS 结束，重新启动 STT
      const timer = setTimeout(() => {
        if (isConversationActive) {
          setCurrentSpeaker('user');
          stt.startListening();
        }
      }, 500); // 稍等一下再启动

      return () => clearTimeout(timer);
    }
  }, [tts.isSpeaking, isConversationActive, currentSpeaker, autoContinue, stt]);

  // 同步音量级别
  useEffect(() => {
    setVolumeLevel(stt.volumeLevel);
  }, [stt.volumeLevel]);

  return {
    // 对话状态
    isConversationActive,
    currentSpeaker,
    isListening: stt.isListening,
    isSpeaking: tts.isSpeaking,

    // 文本状态
    userTranscript,
    interimTranscript,
    volumeLevel,

    // 服务状态
    sttReady: stt.serviceReady,
    ttsReady: tts.serviceReady,

    // 操作
    startConversation,
    endConversation,
    speakResponse,
    startListening: stt.startListening,
    stopListening: stt.stopListening,
    stopSpeaking: tts.stop,

    // 配置
    setAutoContinue: (value) => { autoContinue = value; },
    setInterruptionEnabled: (value) => tts.setCanInterrupt(value),

    // 综合支持
    isSupported: stt.serviceReady && tts.serviceReady
  };
}

export default {
  useStreamingWhisper,
  useInterruptibleKokoro,
  useBidirectionalVoice
};