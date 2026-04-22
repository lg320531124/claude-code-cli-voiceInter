// src/hooks/useLocalVoice.js
//
// 本地语音 Hooks - 使用 Whisper/Kokoro 服务替代浏览器原生 API
//
// useLocalWhisper: Speech-to-Text (STT)
// useLocalKokoro: Text-to-Speech (TTS)
// useLocalVoice: 组合 hook

import { useState, useRef, useCallback, useEffect } from 'react';
import { getErrorInfo } from '../utils/voiceErrors';

/**
 * 本地 Whisper STT Hook
 */
export function useLocalWhisper(options = {}) {
  const {
    language = 'auto',
    onResult,
    onError,
    autoStop = true,           // VAD 自动停止
    silenceThreshold = 1000    // 1秒静音阈值
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [serviceReady, setServiceReady] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const lastSpeechTimeRef = useRef(Date.now());

  // 检查服务状态
  useEffect(() => {
    fetch('/api/voice/status')
      .then(res => res.json())
      .then(data => setServiceReady(data.ready))
      .catch(() => setServiceReady(false));
  }, []);

  // VAD 语音活动检测
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

      const now = Date.now();

      if (maxVolume > 0.01) {
        // 有语音活动
        lastSpeechTimeRef.current = now;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (autoStop && !silenceTimerRef.current) {
        // 检测静音
        const silenceDuration = now - lastSpeechTimeRef.current;
        if (silenceDuration >= silenceThreshold) {
          silenceTimerRef.current = setTimeout(() => {
            if (isListening) {
              stopListening();
            }
          }, silenceThreshold);
        }
      }
    };

    const vadInterval = setInterval(checkActivity, 100);
    return () => {
      clearInterval(vadInterval);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [autoStop, silenceThreshold, isListening]);

  // 开始录音
  const startListening = useCallback(async () => {
    try {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      audioChunksRef.current = [];
      lastSpeechTimeRef.current = Date.now();

      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000
        }
      });

      streamRef.current = stream;

      // 创建 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendToWhisper(blob);
        cleanup();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // 每100ms收集数据
      setIsListening(true);

      // 启动 VAD
      startVAD(stream);

    } catch (err) {
      console.error('[Whisper] 启动失败:', err);
      const errorType = err.name === 'NotAllowedError'
        ? 'microphone-access-denied'
        : 'audio-capture';
      setError(errorType);
      const errorInfo = getErrorInfo(errorType);
      onError?.(errorType, errorInfo);
    }
  }, [language, onResult, onError, startVAD]);

  // 停止录音
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
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
  }, []);

  // 发送音频到 Whisper
  const sendToWhisper = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('language', language);

      const response = await fetch('/api/voice/stt', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setTranscript(result.text);
        onResult?.(result.text);
      } else {
        const errorType = result.error?.includes('Whisper') ? 'whisper-offline' : 'network-error';
        setError(errorType);
        onError?.(errorType, getErrorInfo(errorType));
      }
    } catch (err) {
      console.error('[Whisper] 发送失败:', err);
      setError('network-error');
      onError?.('network-error', getErrorInfo('network-error'));
    }
  };

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
    startListening,
    stopListening,
    isSupported: serviceReady !== false // 服务就绪时支持
  };
}

/**
 * 本地 Kokoro TTS Hook
 */
export function useLocalKokoro(options = {}) {
  const {
    voice = 'af_sky',
    speed = 1.0
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [serviceReady, setServiceReady] = useState(null);

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);

  // 检查服务状态
  useEffect(() => {
    fetch('/api/voice/status')
      .then(res => res.json())
      .then(data => setServiceReady(data.kokoro === 'running'))
      .catch(() => setServiceReady(false));
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
      };

      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audioRef.current.play();

    } catch (err) {
      console.error('[Kokoro] 播放失败:', err);
      setIsSpeaking(false);
    }
  }, [voice, speed]);

  // 停止播放
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
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
    serviceReady,
    speak,
    stop,
    isSupported: serviceReady !== false
  };
}

/**
 * 组合语音 Hook - 同时提供 STT 和 TTS
 */
export function useLocalVoice(options = {}) {
  const {
    language = 'auto',
    voice = 'af_sky',
    onSpeechResult,
    autoSpeakResponse = true
  } = options;

  // STT
  const stt = useLocalWhisper({
    language,
    onResult: onSpeechResult
  });

  // TTS
  const tts = useLocalKokoro({
    voice
  });

  // 自动朗读响应
  const speakResponse = useCallback((text) => {
    if (autoSpeakResponse && text && tts.serviceReady) {
      tts.speak(text);
    }
  }, [autoSpeakResponse, tts]);

  return {
    // STT
    isListening: stt.isListening,
    transcript: stt.transcript,
    interimTranscript: stt.interimTranscript,
    sttError: stt.error,
    sttReady: stt.serviceReady,
    startListening: stt.startListening,
    stopListening: stt.stopListening,

    // TTS
    isSpeaking: tts.isSpeaking,
    ttsReady: tts.serviceReady,
    speak: tts.speak,
    stopSpeaking: tts.stop,
    speakResponse,

    // 组合状态
    isSupported: stt.serviceReady && tts.serviceReady,
    isActive: stt.isListening || tts.isSpeaking
  };
}