# Claude Voice 项目重构计划

## 目标
- 单文件代码行数 < 500 行
- 测试覆盖率 > 80%
- 降低代码复杂度，提高可维护性
- 统一使用 TypeScript

## 当前状态分析

### 需要重构的大文件 (>500行)

| 文件 | 行数 | 优先级 | 拆分策略 |
|------|------|--------|----------|
| `src/components/Chat.jsx` | 2110 | **P0** | 拆分为 ChatHeader, MessageList, ChatInput, VoiceControls, Modals 等 6 个组件 |
| `server/index.js` | 1089 | P1 | 拆分为 claudeInstance, websocket, api, skills 等模块 |
| `src/hooks/useEnhancedVoice.ts` | 731 | P2 | 拆分为 core, vad, audio 三部分 |
| `src/components/VoicePanel.tsx` | 579 | P2 | 拆分为 VoicePanelCore, VoiceControls, Waveform |
| `src/components/VoicePanel.jsx` | 542 | **删除** | 重复文件，保留 .tsx 版本 |
| `src/hooks/useVoiceRecognition.ts` | 484 | P3 | 接近上限，需精简 |

### JS → TS 迁移清单

需要迁移的 39 个文件：
- `src/components/*.jsx` → `.tsx`
- `src/config/*.js` → `.ts`
- `src/contexts/*.jsx` → `.tsx`
- `src/utils/*.js` → `.ts` (删除已有 .ts 版本的)

### Chat.jsx 拆分设计

将 Chat.jsx (2110行) 拆分为以下组件：

1. **ChatHeader.tsx** (~120行) - 顶部导航、状态指示器、工具栏按钮
2. **MessageList.tsx** (~150行) - 消息渲染、空状态、滚动管理
3. **MessageBubble.tsx** (~100行) - 单条消息渲染（已存在，需优化）
4. **ChatInput.tsx** (~200行) - 输入框、附件、命令面板
5. **VoiceControls.tsx** (~100行) - 语音按钮组（停止、对话模式、录音）
6. **ChatModals.tsx** (~150行) - 所有 Modal 的聚合组件
7. **useChatLogic.ts** (~200行) - Chat 的业务逻辑 hook
8. **useMessageHandler.ts** (~150行) - 消息处理 hook
9. **useKeyboardShortcuts.ts** (~100行) - 键盘快捷键 hook

### Server 拆分设计

将 server/index.js (1089行) 拆分为：

1. **claudeInstance.ts** (~200行) - Claude 进程管理
2. **websocketHandler.ts** (~150行) - WebSocket 连接处理
3. **apiRoutes.ts** (~100行) - Express API 路由
4. **skillManager.ts** (~150行) - Skill 管理逻辑
5. **voiceRoutes.ts** (~100行) - 语音 API 路由

## 测试策略

### 单元测试覆盖目标

1. **组件测试** (Vitest + Testing Library)
   - 所有 UI 组件的渲染测试
   - 用户交互测试（点击、输入）

2. **Hooks 测试**
   - useChatLogic
   - useMessageHandler
   - useVoiceRecognition
   - useHybridTTS

3. **Utils 测试**
   - conversationManager
   - ttsCache
   - logger
   - voiceCommands

4. **Server 测试**
   - API 路由测试
   - WebSocket 消息处理测试

### 测试文件组织

```
src/__tests__/
  components/
    ChatHeader.test.tsx
    MessageList.test.tsx
    VoiceControls.test.tsx
    ...
  hooks/
    useChatLogic.test.ts
    useMessageHandler.test.ts
    ...
  utils/
    conversationManager.test.ts
    ...
server/__tests__/
  api.test.ts
  websocket.test.ts
```

## 执行顺序

### Phase 1: 项目分析与规划 ✅
- 分析当前代码结构
- 创建重构计划文档

### Phase 2: Chat.jsx 拆分重构
1. 创建 useChatLogic.ts hook
2. 创建 useMessageHandler.ts hook
3. 创建 useKeyboardShortcuts.ts hook
4. 拆分 ChatHeader.tsx
5. 拆分 MessageList.tsx
6. 拆分 ChatInput.tsx (优化已有版本)
7. 拆分 VoiceControls.tsx
8. 创建 ChatModals.tsx
9. 重构主 Chat.tsx 为组合组件

### Phase 3: Hooks 模块化重构
1. 拆分 useEnhancedVoice.ts
2. 精简 useVoiceRecognition.ts
3. 重构 VoicePanel.tsx

### Phase 4: TypeScript 统一与代码清理
1. 迁移所有 .jsx → .tsx
2. 迁移所有 .js → .ts
3. 删除重复文件
4. 更新 import 路径

### Phase 5: 测试用例编写
1. 编写组件测试
2. 编写 hooks 测试
3. 编写 utils 测试
4. 编写 server 测试
5. 验证覆盖率 > 80%

## 验收标准

- ✅ 所有文件 < 500 行
- ✅ 测试覆盖率 > 80%
- ✅ 所有文件使用 TypeScript
- ✅ 无重复代码
- ✅ npm run build 成功
- ✅ npm run test 成功