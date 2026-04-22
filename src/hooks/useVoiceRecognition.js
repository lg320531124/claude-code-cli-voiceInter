import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Voice Recognition Hook
 *
 * Uses Web Speech API for Speech-to-Text and Speech Synthesis for TTS.
 * Default language is Chinese (zh-CN) as per user preference.
 */

// Check if browser supports speech recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesis = window.speechSynthesis;

/**
 * Hook for voice recognition (STT)
 */
export function useVoiceRecognition(options = {}) {
  const {
    language = 'zh-CN', // Default Chinese
    continuous = true,  // 改为 true，持续录音直到用户手动停止
    onResult,
    onError,
    onEnd
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!SpeechRecognition) {
      console.warn('[Voice] Speech Recognition not supported');
      setError('browser-not-supported');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('[Voice] Recognition started');
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
          console.log('[Voice] Interim:', interim);
        }

        if (final) {
          setTranscript(final);
          console.log('[Voice] Final:', final);
          if (onResult) {
            onResult(final);
          }
        }
      };

      recognition.onerror = (event) => {
        console.error('[Voice] Error:', event.error);
        setIsListening(false);

        // Handle specific errors
        const errorMessages = {
          'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许访问',
          'no-speech': '没有检测到语音，请说话后再试',
          'audio-capture': '无法捕获音频，请检查麦克风是否正常',
          'network': '网络错误，语音识别需要网络连接',
          'aborted': '语音识别被中断',
          'service-not-allowed': '语音服务不可用',
          'browser-not-supported': '浏览器不支持语音识别'
        };

        setError(event.error);
        if (onError) {
          onError(event.error, errorMessages[event.error] || '未知错误');
        }
      };

      recognition.onend = () => {
        console.log('[Voice] Recognition ended');
        setIsListening(false);
        if (onEnd) {
          onEnd();
        }
      };

      recognitionRef.current = recognition;
      setIsInitialized(true);
      console.log('[Voice] Initialized successfully');

      return () => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // Ignore stop errors
          }
        }
      };
    } catch (initError) {
      console.error('[Voice] Init error:', initError);
      setError('init-failed');
    }
  }, [language, continuous, onResult, onError, onEnd]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.error('[Voice] Recognition not initialized');
      setError('not-initialized');
      return;
    }

    if (isListening) {
      console.log('[Voice] Already listening');
      return;
    }

    setTranscript('');
    setInterimTranscript('');
    setError(null);

    try {
      recognitionRef.current.start();
      console.log('[Voice] Starting recognition...');
    } catch (startError) {
      console.error('[Voice] Start error:', startError);

      // Handle the case where recognition is already running
      if (startError.name === 'InvalidStateError') {
        // Recognition is already running, stop first then start
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (e) {
              setError('start-failed');
            }
          }, 100);
        } catch (e) {
          setError('restart-failed');
        }
      } else {
        setError('start-failed');
      }
    }
  }, [isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        console.log('[Voice] Stopped recognition');
      } catch (stopError) {
        console.error('[Voice] Stop error:', stopError);
      }
    }
  }, [isListening]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    console.log('[Voice] Toggle - current state:', isListening);
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isInitialized,
    startListening,
    stopListening,
    toggleListening,
    isSupported: Boolean(SpeechRecognition)
  };
}

/**
 * Hook for speech synthesis (TTS)
 */
export function useSpeechSynthesis(options = {}) {
  const {
    language = 'zh-CN',
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);

  // Load voices
  useEffect(() => {
    if (!speechSynthesis) {
      console.warn('[Voice] Speech Synthesis not supported');
      return;
    }

    // Voices might not be loaded immediately
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Find best voice for the language
  const findVoice = useCallback((lang) => {
    // Try to find a voice for the specific language
    const matchingVoices = voices.filter(voice => voice.lang.startsWith(lang));

    // Prefer local voices
    const localVoice = matchingVoices.find(voice => voice.localService);
    if (localVoice) return localVoice;

    // Otherwise use first matching voice
    return matchingVoices[0] || voices[0];
  }, [voices]);

  // Speak text
  const speak = useCallback((text) => {
    if (!speechSynthesis || !text) return;

    // Stop any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Set voice
    const voice = findVoice(language);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      console.log('[Voice] Speaking started');
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log('[Voice] Speaking ended');
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('[Voice] Synthesis error:', event.error);
      setIsSpeaking(false);
    };

    speechSynthesis.speak(utterance);
  }, [language, rate, pitch, volume, findVoice]);

  // Stop speaking
  const stop = useCallback(() => {
    if (speechSynthesis) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isSpeaking,
    speak,
    stop,
    voices,
    isSupported: Boolean(speechSynthesis)
  };
}

/**
 * Combined hook for full voice interaction
 */
export function useVoiceInteraction(options = {}) {
  const {
    language = 'zh-CN',
    onSpeechResult,
    autoSpeakResponse = true
  } = options;

  // Handle STT error with user-friendly message
  const handleSttError = useCallback((errorType, message) => {
    console.warn('[VoiceInteraction] STT Error:', errorType, message);
  }, []);

  // STT
  const stt = useVoiceRecognition({
    language,
    onResult: onSpeechResult,
    onError: handleSttError
  });

  // TTS
  const tts = useSpeechSynthesis({
    language
  });

  // Speak response (auto or manual)
  const speakResponse = useCallback((text) => {
    if (autoSpeakResponse && text) {
      tts.speak(text);
    }
  }, [autoSpeakResponse, tts]);

  // Get error message for display
  const getErrorMessage = useCallback(() => {
    if (!stt.isSupported) {
      return '浏览器不支持语音识别，请使用 Chrome 或 Safari';
    }
    if (stt.error) {
      const errorMessages = {
        'not-allowed': '请允许麦克风权限',
        'no-speech': '没有检测到语音',
        'audio-capture': '麦克风无法使用',
        'network': '网络错误',
        'browser-not-supported': '浏览器不支持',
        'not-initialized': '语音未初始化',
        'start-failed': '启动失败'
      };
      return errorMessages[stt.error] || '语音错误';
    }
    return null;
  }, [stt.isSupported, stt.error]);

  return {
    // STT
    isListening: stt.isListening,
    transcript: stt.transcript,
    interimTranscript: stt.interimTranscript,
    error: stt.error,
    errorMessage: getErrorMessage(),
    startListening: stt.startListening,
    stopListening: stt.stopListening,
    toggleListening: stt.toggleListening,

    // TTS
    isSpeaking: tts.isSpeaking,
    speak: tts.speak,
    stopSpeaking: tts.stop,
    speakResponse,

    // Combined
    isSupported: stt.isSupported && tts.isSupported,
    isInitialized: stt.isInitialized,
    isActive: stt.isListening || tts.isSpeaking
  };
}
