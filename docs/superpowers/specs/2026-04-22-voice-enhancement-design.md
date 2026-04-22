---
name: 语音交互增强
description: Claude Code CLI VoiceInter 增量升级计划 - 语音体验、用户体验、部署和性能优化
type: project
---

# Claude Code CLI VoiceInter - 增强设计

## 概述

本文档描述 Claude Code CLI VoiceInter 项目的增量升级计划，聚焦四个关键领域：

1. **语音体验升级** - 更好的 STT/TTS、打断功能、实时流式
2. **用户体验优化** - 更好的反馈、错误处理、中文支持
3. **本地部署方案** - PM2 后台运行、局域网访问
4. **性能与稳定性** - WebSocket 优化、缓存、内存管理

## 当前架构

### 现有组件

```
前端 (React + Vite + Tailwind)
├── Chat.jsx - 主聊天界面
├── VoiceButton.jsx - 语音输入按钮
├── WebSocketContext.jsx - WebSocket 连接管理
├── useVoiceRecognition.js - Web Speech API hooks (STT/TTS)

后端 (Node.js + Express + WebSocket)
├── server/index.js - WebSocket 服务器 + 持久化 Claude CLI
├── stream-json mode - JSON 流式通信

语音 (浏览器原生)
├── SpeechRecognition API - STT (云端依赖，中等准确率)
├── SpeechSynthesis API - TTS (浏览器内置，基础质量)
```

### 当前语音流程

```
用户点击麦克风 → Web Speech API 启动 → 用户说话 → 获取转录文本
→ 发送给 Claude → 收到回复 → 浏览器 TTS 朗读 → 完成
```

### 已识别的限制

| 方面 | 当前状态 | 限制 |
|------|----------|------|
| STT | Web Speech API | 云端依赖，中等准确率，无离线支持 |
| TTS | Browser SpeechSynthesis | 机械声音，无情感，有限声音选项 |
| 打断 | 无 | 无法在用户说话时打断 TTS |
| 流式 | 无 | 必须等待完整转录文本才能发送 |
| 中文 | 基础支持 | 无语言检测，有限声音 |
| 反馈 | 仅文字 | 无视觉波形，无能量指示器 |

---

## Phase 1: 语音服务集成

### 目标

用本地 Whisper/Kokoro 服务替换浏览器原生 Web Speech API，获得更高质量和离线能力。

### 已有基础设施

VoiceMode MCP 已安装并配置：

```
Whisper STT:
  端点: http://127.0.0.1:2022/v1/audio/transcriptions
  模型: base
  语言: auto

Kokoro TTS:
  端点: http://127.0.0.1:8880/v1/audio/speech
  默认声音: af_sky
  格式: PCM

音频设置:
  采样率: 24000 Hz
  声道: 1 (单声道)
  VAD 激进度: 3
```

### 后端变更

#### 新增 API 端点

```javascript
// server/index.js 新增

import multer from 'multer';
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB 最大

// STT 端点 - 接收音频，返回转录文本
app.post('/api/voice/stt', upload.single('audio'), async (req, res) => {
  try {
    const audioBuffer = req.file.buffer;
    const language = req.body.language || 'auto';

    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer]), 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', language);

    const response = await fetch('http://127.0.0.1:2022/v1/audio/transcriptions', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    res.json({ success: true, text: result.text });
  } catch (error) {
    console.error('[STT 错误]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// TTS 端点 - 接收文本，返回音频
app.post('/api/voice/tts', express.json(), async (req, res) => {
  try {
    const { text, voice = 'af_sky', speed = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: '需要文本内容' });
    }

    const response = await fetch('http://127.0.0.1:8880/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice,
        speed
      })
    });

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('[TTS 错误]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 语音服务状态端点
app.get('/api/voice/status', async (req, res) => {
  const whisperOk = await checkService('http://127.0.0.1:2022/v1');
  const kokoroOk = await checkService('http://127.0.0.1:8880/v1');

  res.json({
    whisper: whisperOk ? '运行中' : '离线',
    kokoro: kokoroOk ? '运行中' : '离线',
    ready: whisperOk && kokoroOk
  });
});

async function checkService(url) {
  try {
    const response = await fetch(url, { method: 'GET', timeout: 2000 });
    return response.ok;
  } catch {
    return false;
  }
}
```

### 前端变更

#### 新增语音 Hook

```javascript
// src/hooks/useLocalVoice.js

import { useState, useRef, useCallback } from 'react';

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
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // 语音活动检测 (VAD)
  const startVAD = useCallback((stream) => {
    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 512;
    source.connect(analyserRef.current);

    const dataArray = new Float32Array(analyserRef.current.frequencyBinCount);
    let lastSpeechTime = Date.now();

    const checkActivity = () => {
      analyserRef.current.getFloatTimeDomainData(dataArray);

      let maxVolume = 0;
      for (let i = 0; i < dataArray.length; i++) {
        maxVolume = Math.max(maxVolume, Math.abs(dataArray[i]));
      }

      const now = Date.now();
      if (maxVolume > 0.01) {
        lastSpeechTime = now;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (autoStop && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          if (now - lastSpeechTime >= silenceThreshold) {
            stopListening();
          }
        }, silenceThreshold);
      }
    };

    const vadInterval = setInterval(checkActivity, 100);
    return () => clearInterval(vadInterval);
  }, [autoStop, silenceThreshold]);

  const startListening = useCallback(async () => {
    try {
      setTranscript('');
      setError(null);
      audioChunksRef.current = [];

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
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendToWhisper(blob);
        cleanup();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // 每100ms收集数据块
      setIsListening(true);

      // 启动 VAD 监控
      startVAD(stream);

    } catch (err) {
      setError('microphone-access-denied');
      onError?.('microphone-access-denied', '请允许麦克风访问');
    }
  }, [language, onResult, onError, startVAD]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
  }, []);

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
        setError(result.error);
        onError?.('stt-error', result.error);
      }
    } catch (err) {
      setError('network-error');
      onError?.('network-error', '无法连接到语音服务');
    }
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported: true // 使用本地 Whisper 时始终支持
  };
}

export function useLocalKokoro(options = {}) {
  const {
    voice = 'af_sky',
    speed = 1.0
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const speak = useCallback(async (text) => {
    if (!text) return;

    // 停止当前播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      setIsSpeaking(true);

      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed })
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audioRef.current.play();

    } catch (err) {
      console.error('[TTS 错误]', err);
      setIsSpeaking(false);
    }
  }, [voice, speed]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
    }
  }, []);

  return {
    isSpeaking,
    speak,
    stop
  };
}
```

---

## Phase 2: 用户体验增强

### 语音反馈动画

录音时添加视觉波形：

```javascript
// src/components/VoiceWaveform.jsx

import React, { useRef, useEffect } from 'react';

function VoiceWaveform({ isListening }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    if (!isListening) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // 连接音频流
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;

          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#8b5cf6');
          gradient.addColorStop(1, '#ec4899');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      };

      draw();
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={50}
      className="rounded-xl bg-purple-500/10"
    />
  );
}
```

### 错误分类

```javascript
// src/utils/voiceErrors.js

export const VoiceErrors = {
  STT_ERRORS: {
    'whisper-offline': {
      title: '语音识别服务离线',
      description: 'Whisper 服务未启动',
      action: '启动 Whisper 服务',
      autoRetry: true
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
      action: '打开浏览器设置',
      autoRetry: false
    },
    'no-speech': {
      title: '未检测到语音',
      description: '请说话后再试',
      action: '重新开始录音',
      autoRetry: false
    }
  },

  TTS_ERRORS: {
    'kokoro-offline': {
      title: '语音合成服务离线',
      description: 'Kokoro 服务未启动',
      action: '启动 Kokoro 服务',
      autoRetry: true
    }
  }
};
```

---

## Phase 3: 本地部署方案

### PM2 后台运行（已实现）

项目已有 PM2 相关脚本：

```bash
# 启动后台服务
npm run start:daemon

# 停止服务
npm run stop:daemon

# 重启服务
npm run restart:daemon

# 查看日志
npm run logs
```

### 局域网访问配置

修改 `server/index.js` 或通过环境变量：

```bash
# 允许局域网访问
HOST=0.0.0.0 npm run dev

# 或在 package.json 中修改
"scripts": {
  "dev:lan": "HOST=0.0.0.0 concurrently \"node server/index.js\" \"vite\"",
}
```

然后其他设备访问 `http://你的电脑IP:3001`

### 自启动配置（macOS）

创建 launchd 服务：

```xml
<!-- ~/Library/LaunchAgents/com.voiceinter.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.voiceinter</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/lg/project/claude-code-cli-voiceInter/server/index.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/Users/lg/project/claude-code-cli-voiceInter</string>
</dict>
</plist>
```

加载服务：

```bash
launchctl load ~/Library/LaunchAgents/com.voiceinter.plist
```

---

## Phase 4: 性能优化

### WebSocket 稳定性增强

```javascript
// 增强的 WebSocket 心跳

function useEnhancedWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('良好');

  const pingLatencies = useRef([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // 测量延迟
  const measureLatency = useCallback(() => {
    const startTime = Date.now();
    wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: startTime }));

    wsRef.current.once('message', (msg) => {
      const data = JSON.parse(msg);
      if (data.type === 'pong') {
        const latency = Date.now() - startTime;
        pingLatencies.current.push(latency);

        // 保持最近10次测量
        if (pingLatencies.current.length > 10) {
          pingLatencies.current.shift();
        }

        // 计算连接质量
        const avgLatency = pingLatencies.current.reduce((a, b) => a + b) / pingLatencies.current.length;
        setConnectionQuality(
          avgLatency < 50 ? '优秀' :
          avgLatency < 100 ? '良好' :
          avgLatency < 200 ? '一般' : '较差'
        );
      }
    });
  }, []);

  // 自适应重连
  const reconnect = useCallback(() => {
    reconnectAttempts.current++;
    const delay = Math.min(
      1000 * Math.pow(2, reconnectAttempts.current), // 指数退避
      30000 // 最大30秒
    );

    setTimeout(() => {
      connect();
    }, delay);
  }, []);
}
```

### IndexedDB 消息缓存

```javascript
// src/utils/messageCache.js

const DB_NAME = 'claude-voiceinter';
const STORE_NAME = 'messages';
const MAX_MESSAGES = 1000;

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export async function saveMessages(messages) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  // 先清除旧消息
  await store.clear();

  // 添加所有消息
  for (const msg of messages) {
    store.add(msg);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadMessages() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

---

## 实施时间表

| 阶段 | 预估时间 | 关键交付物 |
|------|----------|------------|
| **Phase 1** | 1-2天 | Whisper/Kokoro HTTP 端点、新语音 hooks |
| **Phase 2** | 1-2天 | 波形动画、错误处理、中文优化 |
| **Phase 3** | 半天 | 局域网配置、自启动设置 |
| **Phase 4** | 1天 | WebSocket 优化、IndexedDB 缓存 |
| **Phase 5** | 2-3天 | 实时流式、打断功能、双向对话 |

---

## 成功标准

1. **语音质量**: 中文 STT 准确率 > 95%，TTS 自然流畅
2. **延迟**: 完整语音交互周期 < 3秒
3. **可靠性**: WebSocket 稳定率 > 99%，自动重连 < 5秒
4. **用户体验**: 清晰视觉反馈，直观错误恢复
5. **部署**: 本地运行稳定，局域网可访问

---

## 依赖项

- VoiceMode MCP（已安装）
- Whisper.cpp 本地服务（端口 2022）
- Kokoro TTS 服务（端口 8880）
- Node.js 18+ with Express
- React 18+ with WebSocket 支持

---

## 下一步

1. 实施 Phase 1 后端端点
2. 更新前端语音 hooks
3. 测试语音质量改进
4. 逐步推进 Phase 2-4