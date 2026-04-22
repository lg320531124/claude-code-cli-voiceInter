# 语音交互增强 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 用本地 Whisper/Kokoro 服务替换浏览器原生 Web Speech API，获得更高质量和离线能力

**架构:** 后端添加 HTTP 端点代理 Whisper/Kokoro API，前端创建新的 React hooks 调用这些端点

**技术栈:** Node.js Express, React Hooks, VoiceMode MCP (Whisper/Kokoro)

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/index.js` | 修改 | 添加 `/api/voice/stt`, `/api/voice/tts`, `/api/voice/status` 端点 |
| `src/hooks/useLocalVoice.js` | 创建 | 新的本地语音 hooks (useLocalWhisper, useLocalKokoro) |
| `src/utils/voiceErrors.js` | 创建 | 错误分类和提示信息 |
| `package.json` | 修改 | 添加 multer 依赖 |

---

## Task 1: 添加后端依赖 multer

**文件:**
- 修改: `package.json`

- [ ] **Step 1: 安装 multer 依赖**

```bash
cd /Users/lg/project/claude-code-cli-voiceInter
npm install multer
```

- [ ] **Step 2: 验证安装成功**

```bash
npm ls multer
```

期望输出: `multer@x.x.x`

- [ ] **Step 3: 提交**

```bash
git add package.json package-lock.json
git commit -m "chore: add multer for audio file upload"
```

---

## Task 2: 后端添加语音 API 端点

**文件:**
- 修改: `server/index.js` (在现有 app.use 和 wss.on 之间添加)

- [ ] **Step 1: 导入 multer**

在 `server/index.js` 第18行附近添加：

```javascript
import multer from 'multer';
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max
```

- [ ] **Step 2: 添加服务检测函数**

在导入后添加：

```javascript
// VoiceMode 服务端点
const WHISPER_ENDPOINT = process.env.WHISPER_ENDPOINT || 'http://127.0.0.1:2022/v1';
const KOKORO_ENDPOINT = process.env.KOKORO_ENDPOINT || 'http://127.0.0.1:8880/v1';

async function checkService(url) {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: 添加语音状态端点**

在 API ENDPOINTS 部分添加：

```javascript
// 语音服务状态
app.get('/api/voice/status', async (req, res) => {
  const whisperOk = await checkService(WHISPER_ENDPOINT);
  const kokoroOk = await checkService(KOKORO_ENDPOINT);

  res.json({
    whisper: whisperOk ? 'running' : 'offline',
    kokoro: kokoroOk ? 'running' : 'offline',
    ready: whisperOk && kokoroOk
  });
});
```

- [ ] **Step 4: 添加 STT 端点**

```javascript
// Whisper STT - 接收音频，返回转录文本
app.post('/api/voice/stt', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '需要音频文件' });
    }

    const audioBuffer = req.file.buffer;
    const language = req.body.language || 'auto';

    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer]), 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', language);

    const response = await fetch(`${WHISPER_ENDPOINT}/audio/transcriptions`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Whisper 服务响应错误: ${response.status}`);
    }

    const result = await response.json();
    res.json({ success: true, text: result.text });
  } catch (error) {
    console.error('[STT 错误]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

- [ ] **Step 5: 添加 TTS 端点**

```javascript
// Kokoro TTS - 接收文本，返回音频
app.post('/api/voice/tts', express.json(), async (req, res) => {
  try {
    const { text, voice = 'af_sky', speed = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: '需要文本内容' });
    }

    const response = await fetch(`${KOKORO_ENDPOINT}/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice,
        speed
      })
    });

    if (!response.ok) {
      throw new Error(`Kokoro 服务响应错误: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('[TTS 错误]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

- [ ] **Step 6: 测试端点**

```bash
curl http://localhost:3001/api/voice/status
```

期望输出: `{"whisper":"running","kokoro":"offline","ready":false}` 或类似

- [ ] **Step 7: 提交**

```bash
git add server/index.js
git commit -m "feat: add voice API endpoints for Whisper STT and Kokoro TTS"
```

---

## Task 3: 创建前端错误分类模块

**文件:**
- 创建: `src/utils/voiceErrors.js`

- [ ] **Step 1: 创建错误分类文件**

```javascript
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
      action: '打开浏览器设置 → 隐私和安全 → 麦克风',
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
```

- [ ] **Step 2: 提交**

```bash
git add src/utils/voiceErrors.js
git commit -m "feat: add voice error classification module"
```

---

## Task 4: 创建本地语音 Hooks

**文件:**
- 创建: `src/hooks/useLocalVoice.js`

- [ ] **Step 1: 创建文件头部**

```javascript
// src/hooks/useLocalVoice.js
//
// 本地语音 Hooks - 使用 Whisper/Kokoro 服务替代浏览器原生 API
//
// useLocalWhisper: Speech-to-Text (STT)
// useLocalKokoro: Text-to-Speech (TTS)
// useLocalVoice: 组合 hook

import { useState, useRef, useCallback, useEffect } from 'react';
import { getErrorInfo } from '../utils/voiceErrors';
```

- [ ] **Step 2: 添加 useLocalWhisper hook**

```javascript
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
```

- [ ] **Step 3: 添加 useLocalKokoro hook**

```javascript
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
```

- [ ] **Step 4: 添加组合 hook**

```javascript
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
```

- [ ] **Step 5: 提交**

```bash
git add src/hooks/useLocalVoice.js
git commit -m "feat: add local voice hooks for Whisper STT and Kokoro TTS"
```

---

## Task 5: 测试语音服务集成

**文件:**
- 无需修改，仅测试

- [ ] **Step 1: 启动 VoiceMode 服务**

```bash
# 启动 Whisper
claude mcp voicemode service whisper start

# 启动 Kokoro
claude mcp voicemode service kokoro start
```

或通过 MCP 工具：
```javascript
mcp__voicemode__service({ service_name: "whisper", action: "start" })
mcp__voicemode__service({ service_name: "kokoro", action: "start" })
```

- [ ] **Step 2: 验证服务状态**

```bash
curl http://localhost:3001/api/voice/status
```

期望输出: `{"whisper":"running","kokoro":"running","ready":true}`

- [ ] **Step 3: 测试 STT 端点**

创建测试音频文件并发送：
```bash
# 使用浏览器录音或创建测试文件
# 这里用 curl 测试（需要实际音频文件）
curl -X POST http://localhost:3001/api/voice/stt \
  -F "audio=@test.webm" \
  -F "language=zh"
```

期望输出: `{"success":true,"text":"测试文本"}`

- [ ] **Step 4: 测试 TTS 端点**

```bash
curl -X POST http://localhost:3001/api/voice/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好，这是一个测试"}' \
  --output test.mp3
```

期望: 生成 test.mp3 文件

---

## 成功标准

1. ✅ `/api/voice/status` 返回正确的服务状态
2. ✅ `/api/voice/stt` 能接收音频并返回转录文本
3. ✅ `/api/voice/tts` 能接收文本并返回音频
4. ✅ 前端 hooks 能正确调用端点
5. ✅ 错误处理正确显示中文提示

---

## 下一步

Phase 1 完成后，继续：
- Phase 2: 波形动画、错误 UI 反馈
- Phase 3: 局域网配置
- Phase 4: WebSocket 优化、IndexedDB 缓存