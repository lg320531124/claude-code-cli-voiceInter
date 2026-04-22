---
name: 语音交互增强路线图
description: Claude Code CLI VoiceInter 后续完善需求和优化方向
type: project
---

# Claude Code CLI VoiceInter - 完善需求文档

> **文档版本:** v1.0  
> **更新日期:** 2026-04-22  
> **当前状态:** Phase 1-5 已完成，进入优化迭代阶段

---

## 一、当前已完成功能

### 核心功能

| 模块 | 功能 | 状态 | 说明 |
|------|------|------|------|
| **语音输入** | Whisper STT | ✅ 可用 | 本地 Whisper.cpp 服务，端口 2022 |
| **语音输出** | Kokoro TTS | ⚠️ 部分可用 | 服务未启动，模型文件缺失 |
| **双向对话** | 连续语音交互 | ✅ 已实现 | VoicePanel 支持自动连续对话 |
| **流式转录** | 边说边显示 | ✅ 已实现 | useStreamingWhisper hook |
| **打断功能** | 用户说话停止 TTS | ✅ 已实现 | useInterruptibleKokoro hook |
| **波形动画** | 音量可视化 | ✅ 已实现 | VoiceWaveform 组件 |
| **错误提示** | 中文友好提示 | ✅ 已实现 | ErrorToast + voiceErrors |
| **WebSocket** | 连接稳定性 | ✅ 已实现 | 心跳、质量检测、自适应重连 |
| **消息缓存** | IndexedDB 持久化 | ✅ 已实现 | messageCache.js |
| **局域网访问** | dev:lan 脳本 | ✅ 已实现 | HOST=0.0.0.0 |

### 文件结构

```
新增文件 (Phase 1-5):
├── server/index.js           - 添加 /api/voice/* 端点
├── src/hooks/
│   ├── useLocalVoice.js      - 本地语音 hooks (STT/TTS)
│   └── useEnhancedVoice.js   - 增强版 hooks (流式/打断/双向)
├── src/components/
│   ├── VoiceWaveform.jsx     - 波形动画
│   ├── ErrorToast.jsx        - 错误提示
│   └── VoicePanel.jsx        - 语音控制面板
├── src/utils/
│   ├── voiceErrors.js        - 错误分类
│   └── messageCache.js       - IndexedDB 缓存
├── src/contexts/
│   └── WebSocketContext.jsx  - 增强 WebSocket
└── package.json              - multer, dev:lan 腊本
```

---

## 二、已识别问题和阻塞点

### 高优先级阻塞

| 问题 | 影响 | 状态 | 解决方案 |
|------|------|------|----------|
| **Kokoro 模型缺失** | TTS 不可用，双向对话不完整 | 🔴 阻塞 | 重新下载模型或使用 fallback |
| **音频格式兼容性** | 不同浏览器可能有差异 | 🟡 需验证 | 添加格式检测和转换 |

### 中优先级问题

| 问题 | 影响 | 状态 | 解决方案 |
|------|------|------|----------|
| **转录延迟** | 流式转录间隔 2s，可能不够实时 | 🟡 可优化 | 调整 streamingInterval |
| **打断灵敏度** | 音量阈值可能需要调整 | 🟡 可优化 | 提供用户配置选项 |
| **移动端兼容** | 未测试移动浏览器 | 🟡 需验证 | 添加移动端适配 |

---

## 三、待完善需求清单

### Phase 6: Kokoro TTS 修复 (高优先级)

**目标:** 恢复 TTS 功能，实现完整的双向对话

**任务:**
- [ ] 重新下载 Kokoro 模型文件
- [ ] 验证 Kokoro 服务启动流程
- [ ] 添加 TTS fallback 机制 (浏览器 SpeechSynthesis)
- [ ] 测试完整的双向对话流程

**预估时间:** 1 天

---

### Phase 7: 前端体验优化 (中优先级)

**目标:** 提升用户交互体验，增强可用性

**任务:**

#### 7.1 状态提示增强
- [ ] 添加更详细的状态文字提示
- [ ] 不同状态使用不同颜色/图标
- [ ] 添加处理进度指示器

#### 7.2 快捷键支持
- [ ] Ctrl+V / Cmd+V 启动语音输入
- [ ] Escape 停止当前操作
- [ ] Space (对话模式) 快速切换

#### 7.3 交互优化
- [ ] 历史消息点击朗读
- [ ] 语音模式切换动画
- [ ] 音量可视化增强 (圆形波形)
- [ ] 暗色/亮色主题适配

**预估时间:** 2 天

---

### Phase 8: 稳定性增强 (中优先级)

**目标:** 提高系统可靠性，减少故障影响

**任务:**

#### 8.1 网络层优化
- [ ] API 调用超时配置
- [ ] 失败自动重试机制
- [ ] 网络状态实时监控

#### 8.2 错误处理增强
- [ ] 错误分类细化
- [ ] 自动恢复策略
- [ ] 错误日志上报

#### 8.3 浏览器兼容性
- [ ] Chrome/Safari/Edge/Firefox 测试
- [ ] 音频格式自动检测
- [ ] Polyfill 适配方案

**预估时间:** 2 天

---

### Phase 9: 性能优化 (低优先级)

**目标:** 提升响应速度，减少资源消耗

**任务:**

#### 9.1 音频处理优化
- [ ] 音频流压缩传输
- [ ] WebWorker 音频处理
- [ ] 采样率动态调整

#### 9.2 缓存策略
- [ ] TTS 音频预缓存
- [ ] 常用短语缓存
- [ ] 缓存过期策略

#### 9.3 资源管理
- [ ] 内存使用监控
- [ ] 长时间运行稳定性
- [ ] 资源自动释放

**预估时间:** 1 天

---

### Phase 10: 功能扩展 (低优先级)

**目标:** 提供更多定制选项和高级功能

**任务:**

#### 10.1 语言支持
- [ ] 多语言自动检测
- [ ] 中英文混合处理
- [ ] 语言切换 UI

#### 10.2 TTS 定制
- [ ] 语音速度调节
- [ ] 音调调节
- [ ] 多声音选择

#### 10.3 高级功能
- [ ] 实时字幕模式
- [ ] 语音命令支持
- [ ] 对话历史回放
- [ ] 导出对话记录

**预估时间:** 3 天

---

## 四、优先级排序

```
优先级矩阵:

高优先级 (必须修复):
├── Phase 6: Kokoro TTS 修复 ───────────────────── 🔴 阻塞

中优先级 (显著提升体验):
├── Phase 7: 前端体验优化 ──────────────────────── 🟡 重要
├── Phase 8: 稳定性增强 ────────────────────────── 🟡 重要

低优先级 (锦上添花):
├── Phase 9: 性能优化 ──────────────────────────── 🟢 可选
├── Phase 10: 功能扩展 ─────────────────────────── 🟢 可选
```

---

## 五、实施建议

### 短期目标 (本周)
1. **修复 Kokoro TTS** - 这是当前最大阻塞点
2. **验证完整对话流程** - 确保 STT → Claude → TTS 完整链路
3. **基础快捷键支持** - 提升操作便捷性

### 中期目标 (下周)
1. **前端状态提示优化** - 更清晰的交互反馈
2. **错误处理增强** - 减少故障影响
3. **浏览器兼容性验证** - 扩大适用范围

### 长期目标 (后续迭代)
1. **性能优化** - 提升响应速度
2. **功能扩展** - 多语言、定制化
3. **部署优化** - 自启动、生产配置

---

## 六、成功标准

### Phase 6 完成标准
- ✅ Kokoro 服务正常启动
- ✅ TTS 端点返回音频文件
- ✅ 双向对话完整流程可用
- ✅ 用户说话可打断 TTS

### Phase 7 完成标准
- ✅ 状态提示清晰无歧义
- ✅ 快捷键功能正常工作
- ✅ UI 动画流畅自然

### Phase 8 完成标准
- ✅ 网络故障自动恢复
- ✅ 错误提示准确有效
- ✅ 主流浏览器全部支持

---

## 七、风险和依赖

### 技术风险
| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| Kokoro 模型无法修复 | 中 | 高 | 使用浏览器 TTS 作为 fallback |
| 浏览器音频兼容问题 | 中 | 中 | 添加格式检测和转换 |
| WebSocket 连接不稳定 | 低 | 高 | 已有重连机制，继续优化 |

### 外部依赖
| 依赖 | 状态 | 说明 |
|------|------|------|
| Whisper.cpp 服务 | ✅ 正常 | 端口 2022，Metal GPU |
| Kokoro TTS 服务 | ❌ 异常 | 需要修复 |
| Node.js 18+ | ✅ 已安装 | v22.22.0 |
| React 18+ | ✅ 已安装 | v18.2.0 |

---

## 八、附录

### A. 当前配置参数

```javascript
// 语音参数
WHISPER_PORT: 2022
KOKORO_PORT: 8880
SAMPLE_RATE: 24000
SILENCE_THRESHOLD: 1500ms
STREAMING_INTERVAL: 2000ms

// WebSocket 参数
HEARTBEAT_INTERVAL: 30000ms
MAX_RECONNECT_ATTEMPTS: 5
RECONNECT_BASE_DELAY: 1000ms
RECONNECT_MAX_DELAY: 30000ms

// 缓存参数
MAX_MESSAGES: 1000
DB_NAME: 'claude-voiceinter'
```

### B. 错误类型清单

```javascript
STT_ERRORS:
- whisper-offline      // Whisper 服务离线
- network-error        // 网络连接失败
- microphone-access-denied  // 麦克风权限被拒绝
- no-speech            // 未检测到语音
- audio-capture        // 音频捕获失败

TTS_ERRORS:
- kokoro-offline       // Kokoro 服务离线
- text-empty           // 文本内容为空
```

### C. 相关文档

- [语音增强设计文档](./2026-04-22-voice-enhancement-design.md)
- [实施计划文档](../plans/2026-04-22-voice-enhancement-impl.md)
- [VoiceMode MCP 文档](https://github.com/anthropics/voicemode)

---

**文档维护:** 每完成一个 Phase 后更新状态标记

**下一步行动:** 开始 Phase 6 - Kokoro TTS 修复