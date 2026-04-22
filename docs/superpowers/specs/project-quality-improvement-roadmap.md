---
name: 项目质量改进路线图
description: Claude Code CLI VoiceInter 项目质量改进和优化需求
type: project
---

# Claude Code CLI VoiceInter - 项目质量改进需求文档

> **文档版本:** v1.1  
> **创建日期:** 2026-04-22  
> **更新日期:** 2026-04-22  
> **当前状态:** Phase 1-3 已完成

---

## 一、项目现状分析

### 当前问题清单

| 类别 | 问题 | 严重程度 | 影响范围 |
|------|------|----------|----------|
| **代码质量** | 无测试代码 | ✅ 已解决 | 全项目 |
| **代码质量** | Chat.jsx 过大 (1684行) | ✅ 已解决 | 前端核心 |
| **可移植性** | 硬编码项目路径 | ✅ 已解决 | 服务端 |
| **类型安全** | 无 TypeScript 支持 | 🔴 高 | 全项目 |
| **代码规范** | 无 ESLint/Prettier | ✅ 已解决 | 全项目 |
| **自动化** | 无 CI/CD 配置 | ✅ 已解决 | 部署流程 |
| **部署** | 无 Docker 支持 | 🟡 中 | 部署流程 |
| **日志** | console.log 过多 | ✅ 已解决 | 性能 |
| **稳定性** | 无错误边界 | ✅ 已解决 | 前端 |
| **国际化** | 仅中英文支持 | 🟢 低 | UX |
| **主题** | 仅暗色模式 | 🟢 低 | UX |
| **离线** | 无离线支持 | 🟢 低 | 可用性 |

### 项目统计

```
代码行数: 11,094 行
组件数量: 20+ 个
Hooks数量: 7 个
Utils数量: 10 个
依赖数量: 14 个核心依赖
```

---

## 二、高优先级改进需求

### Phase 1: 测试框架搭建 ✅ 已完成

**目标:** 建立完整的测试体系，确保代码质量和稳定性

**预估时间:** 2 天

#### 1.1 单元测试框架

**需求描述:**
- 添加 Vitest 测试框架（与 Vite 集成更好）
- 配置测试环境和覆盖率报告
- 编写核心功能的单元测试

**任务清单:**

- [ ] **安装测试依赖**
  ```bash
  npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
  ```

- [ ] **配置 Vitest**
  - 创建 `vitest.config.js`
  - 配置 jsdom 环境
  - 设置覆盖率阈值 (目标: 80%)

- [ ] **编写测试文件结构**
  ```
  src/
  ├── __tests__/
  │   ├── setup.js              # 测试环境设置
  │   ├── utils/
  │   │   ├── ttsCache.test.js
  │   │   ├── voiceCommands.test.js
  │   │   ├── conversationManager.test.js
  │   │   └── memoryMonitor.test.js
  │   ├── hooks/
  │   │   ├── useHybridTTS.test.js
  │   │   ├── useAudioWorker.test.js
  │   │   └── useVoiceRecognition.test.js
  │   └── components/
  │       ├── VoiceButton.test.jsx
  │       ├── ConversationList.test.jsx
  │       └── ExportPanel.test.jsx
  ```

- [ ] **核心测试用例**

  **ttsCache.test.js:**
  ```javascript
  describe('TTSCache', () => {
    test('should cache audio data correctly', () => {
      // 测试缓存写入和读取
    });
    test('should expire old entries', () => {
      // 测试过期清理
    });
    test('should handle IndexedDB fallback', () => {
      // 测试 IndexedDB 存储
    });
  });
  ```

  **voiceCommands.test.js:**
  ```javascript
  describe('VoiceCommands', () => {
    test('should match Chinese commands', () => {
      expect(matchVoiceCommand('新建对话')).toBeTruthy();
    });
    test('should match English commands', () => {
      expect(matchVoiceCommand('new conversation')).toBeTruthy();
    });
    test('should not match non-command text', () => {
      expect(matchVoiceCommand('你好世界')).toBeNull();
    });
  });
  ```

- [ ] **添加测试脚本**
  ```json
  {
    "scripts": {
      "test": "vitest",
      "test:ui": "vitest --ui",
      "test:coverage": "vitest run --coverage"
    }
  }
  ```

**验收标准:**
- ✅ 测试框架运行正常
- ✅ 核心 utils 测试覆盖率 > 80%
- ✅ hooks 测试覆盖率 > 70%
- ✅ 关键组件测试覆盖率 > 60%

---

#### 1.2 集成测试

**需求描述:**
- 测试 WebSocket 连接流程
- 测试语音识别到响应的完整链路
- 测试对话管理功能

**任务清单:**

- [ ] **WebSocket 测试**
  - 创建 mock WebSocket server
  - 测试连接/断开/重连逻辑
  - 测试消息收发流程

- [ ] **语音流程测试**
  - 测试 STT → Claude → TTS 链路
  - 测试打断功能
  - 测试 TTS fallback 机制

- [ ] **对话管理测试**
  - 测试对话创建/切换/删除
  - 测试消息持久化
  - 测试导出功能

---

### Phase 2: Chat.jsx 组件拆分 ✅ 已完成

**目标:** 将过大的 Chat.jsx (1684行) 拆分为多个子组件，提高可维护性

**预估时间:** 1 天

#### 2.1 组件拆分计划

**当前问题:**
- Chat.jsx 包含了太多逻辑：消息渲染、输入处理、语音控制、对话管理、快捷键等
- 单文件过大，难以维护和测试
- 代码复用困难

**拆分策略:**

```
src/components/
├── Chat.jsx              # 主组件 (精简后约 200-300 行)
├── chat/
│   ├── ChatHeader.jsx    # 头部区域 (状态显示、工具栏按钮)
│   ├── ChatMessages.jsx  # 消息列表区域
│   ├── ChatInput.jsx     # 输入区域 (文本框、语音按钮、发送)
│   ├── ChatFooter.jsx    # 底部提示
│   ├── MessageBubble.jsx # 单条消息渲染
│   └── QuickActions.jsx  # 快速操作建议
├── voice/
│   ├── VoiceControls.jsx # 语音控制按钮组
│   ├── VoiceStatus.jsx   # 语音状态指示器
│   └── VoiceModal.jsx    # 语音对话面板
├── panels/
│   ├── SettingsPanel.jsx # 设置面板聚合
│   ├── StatsPanel.jsx    # 统计面板聚合
│   └── HelpPanel.jsx     # 帮助面板聚合
└── layout/
    ├── Sidebar.jsx       # 左侧对话列表
    ├── MainContent.jsx   # 主内容区
    └── Toolbar.jsx       # 工具栏
```

#### 2.2 拆分任务

- [ ] **拆分 ChatHeader**
  - 提取连接状态显示
  - 提取工具栏按钮组
  - 提取字幕控制
  
  **预计代码量:** ~100 行

- [ ] **拆分 ChatMessages**
  - 提取消息列表渲染逻辑
  - 提取空状态显示
  - 提取滚动处理
  
  **预计代码量:** ~150 行

- [ ] **拆分 ChatInput**
  - 提取文本输入框
  - 提取语音按钮组
  - 提取发送按钮
  - 提取处理中指示器
  
  **预计代码量:** ~200 行

- [ ] **拆分 MessageBubble**
  - 提取单条消息渲染
  - 提取用户/助手/错误样式
  - 提取朗读按钮
  
  **预计代码量:** ~100 行

- [ ] **拆分 VoiceControls**
  - 提取语音模式切换
  - 提取麦克风按钮
  - 提取语音状态
  
  **预计代码量:** ~80 行

- [ ] **提取 Context**
  - 创建 ChatContext.jsx 管理聊天状态
  - 创建 VoiceContext.jsx 管理语音状态
  
  **预计代码量:** 各 ~100 行

#### 2.3 重构后的 Chat.jsx 结构

```jsx
// Chat.jsx - 重构后约 250 行
function Chat() {
  return (
    <ChatProvider>
      <VoiceProvider>
        <div className="flex flex-col min-h-screen">
          <Sidebar />
          <MainContent>
            <ChatHeader />
            <ChatMessages />
            <ChatInput />
            <ChatFooter />
          </MainContent>
          {/* 模态面板 */}
          <SettingsPanel />
          <StatsPanel />
          <HelpPanel />
        </div>
      </VoiceProvider>
    </ChatProvider>
  );
}
```

**验收标准:**
- ✅ Chat.jsx 行数 < 300
- ✅ 每个子组件行数 < 200
- ✅ 功能无缺失，测试通过
- ✅ 组件可独立测试

---

### Phase 3: 硬编码路径修复 ✅ 已完成

**目标:** 移除硬编码路径，提高项目可移植性

**预估时间:** 0.5 天

#### 3.1 问题分析

**当前硬编码位置:**
```javascript
// server/index.js
const PROJECT_PATH = process.env.PROJECT_PATH || '/Users/lg/project/claude-code-cli-voiceInter';

// Chat.jsx  
sendMessage({ cwd: '/Users/lg/project/cloudCliVoice' });
```

**影响:**
- 在其他用户机器上无法运行
- 不同项目路径需要手动修改
- 不符合软件分发标准

#### 3.2 解决方案

- [ ] **服务端路径修复**
  
  **修改 server/index.js:**
  ```javascript
  // 方案1: 使用环境变量或默认当前目录
  const PROJECT_PATH = process.env.PROJECT_PATH || process.cwd();
  
  // 方案2: 使用用户配置文件
  import { loadConfig } from './config.js';
  const config = loadConfig();
  const PROJECT_PATH = config.projectPath || os.homedir();
  
  // 方案3: 让用户在连接时指定
  wss.on('connection', (ws, req) => {
    const projectPath = req.headers['x-project-path'] || process.cwd();
    // ...
  });
  ```

- [ ] **客户端路径修复**
  
  **修改 Chat.jsx:**
  ```javascript
  // 使用 WebSocket 传递的项目路径
  const { projectPath } = useWebSocket();
  
  sendMessage({
    type: 'claude-command',
    command: text.trim(),
    options: { cwd: projectPath || '.' }
  });
  ```

- [ ] **添加配置文件支持**
  
  **创建 config.js:**
  ```javascript
  // server/config.js
  import os from 'os';
  import path from 'path';
  import fs from 'fs';
  
  const CONFIG_FILE = path.join(os.homedir(), '.claude-voice', 'config.json');
  
  export function loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      }
    } catch (e) {
      console.warn('[Config] Failed to load config:', e);
    }
    return {
      projectPath: process.cwd(),
      whisperEndpoint: 'http://127.0.0.1:2022/v1',
      kokoroEndpoint: 'http://127.0.0.1:8880/v1'
    };
  }
  
  export function saveConfig(config) {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }
  ```

- [ ] **更新 .env.example**
  ```bash
  # 项目路径配置
  PROJECT_PATH=/path/to/your/project
  
  # 或使用相对路径
  PROJECT_PATH=.
  ```

**验收标准:**
- ✅ 无硬编码用户名或绝对路径
- ✅ 支持环境变量配置
- ✅ 支持配置文件配置
- ✅ 在任意机器可运行

---

### Phase 4: TypeScript 支持 🔴

**目标:** 添加 TypeScript 支持，提高类型安全和开发体验

**预估时间:** 2 天

#### 4.1 TypeScript 配置

- [ ] **安装 TypeScript 依赖**
  ```bash
  npm install -D typescript @types/react @types/react-dom @types/node @types/ws @types/express
  ```

- [ ] **创建 tsconfig.json**
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "useDefineForClassFields": true,
      "lib": ["ES2020", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true,
      "jsx": "react-jsx",
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noFallthroughCasesInSwitch": true,
      "baseUrl": ".",
      "paths": {
        "@/*": ["src/*"]
      }
    },
    "include": ["src"],
    "references": [{ "path": "./tsconfig.node.json" }]
  }
  ```

- [ ] **创建 tsconfig.node.json**
  ```json
  {
    "compilerOptions": {
      "composite": true,
      "skipLibCheck": true,
      "module": "ESNext",
      "moduleResolution": "bundler",
      "allowSyntheticDefaultImports": true
    },
    "include": ["server", "vite.config.ts"]
  }
  ```

- [ ] **更新 vite.config.ts**
  ```typescript
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import path from 'path';
  
  export default defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  });
  ```

#### 4.2 文件迁移计划

- [ ] **优先迁移 utils**
  - `src/utils/ttsCache.ts`
  - `src/utils/voiceCommands.ts`
  - `src/utils/memoryMonitor.ts`
  - `src/utils/conversationManager.ts`

- [ ] **定义类型文件**
  - `src/types/voice.ts` - 语音相关类型
  - `src/types/message.ts` - 消息类型
  - `src/types/config.ts` - 配置类型

  **示例 types/voice.ts:**
  ```typescript
  export interface VoiceState {
    isListening: boolean;
    isSpeaking: boolean;
    transcript: string;
    interimTranscript: string;
    error: string | null;
  }

  export interface VoiceCommand {
    id: string;
    patterns: string[];
    action: string;
    feedback: string;
    category: string;
  }

  export type VoiceLevel = 'normal' | 'warning' | 'critical';
  ```

- [ ] **迁移 hooks**
  - `src/hooks/useHybridTTS.ts`
  - `src/hooks/useAudioWorker.ts`

- [ ] **迁移关键组件**
  - `src/components/VoiceButton.tsx`
  - `src/components/ConversationList.tsx`
  - `src/components/Chat.tsx` (逐步迁移)

- [ ] **服务端迁移**
  - `server/index.ts`

**验收标准:**
- ✅ TypeScript 编译无错误
- ✅ 核心类型定义完整
- ✅ utils/hooks 完全类型化
- ✅ IDE 类型提示正常

---

## 三、中优先级改进需求

### Phase 5: ESLint + Prettier ✅ 已完成

**目标:** 统一代码风格，提高代码可读性

**预估时间:** 0.5 天

#### 5.1 ESLint 配置

- [ ] **安装 ESLint**
  ```bash
  npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react eslint-plugin-react-hooks
  ```

- [ ] **创建 eslint.config.js**
  ```javascript
  import js from '@eslint/js';
  import tseslint from 'typescript-eslint';
  import react from 'eslint-plugin-react';
  import reactHooks from 'eslint-plugin-react-hooks';

  export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ['**/*.{js,jsx,ts,tsx}'],
      plugins: {
        react,
        'react-hooks': reactHooks
      },
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'no-unused-vars': 'warn',
        'no-console': ['warn', { allow: ['warn', 'error'] }]
      }
    }
  ];
  ```

#### 5.2 Prettier 配置

- [ ] **安装 Prettier**
  ```bash
  npm install -D prettier eslint-config-prettier
  ```

- [ ] **创建 .prettierrc**
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "tabWidth": 2,
    "trailingComma": "es5",
    "printWidth": 100,
    "bracketSpacing": true
  }
  ```

- [ ] **添加脚本**
  ```json
  {
    "scripts": {
      "lint": "eslint src server",
      "lint:fix": "eslint src server --fix",
      "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx}\"",
      "format:check": "prettier --check \"src/**/*.{js,jsx,ts,tsx}\""
    }
  }
  ```

**验收标准:**
- ✅ ESLint 检查通过
- ✅ Prettier 格式统一
- ✅ 无代码风格警告

---

### Phase 6: CI/CD 配置 ✅ 已完成

**目标:** 自动化测试和部署流程

**预估时间:** 0.5 天

#### 6.1 GitHub Actions

- [ ] **创建 .github/workflows/ci.yml**
  ```yaml
  name: CI

  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]

  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '22'
        - run: npm ci
        - run: npm run lint
        - run: npm run test:coverage
        - run: npm run build

    deploy:
      needs: test
      runs-on: ubuntu-latest
      if: github.ref == 'refs/heads/main'
      steps:
        - uses: actions/checkout@v4
        - run: npm run build
        # 部署步骤根据实际需求配置
  ```

- [ ] **添加覆盖率报告**
  ```yaml
  - name: Upload coverage
    uses: codecov/codecov-action@v4
    with:
      files: ./coverage/lcov.info
  ```

- [ ] **添加依赖缓存**
  ```yaml
  - name: Cache dependencies
    uses: actions/cache@v4
    with:
      path: ~/.npm
      key: npm-${{ hashFiles('package-lock.json') }}
  ```

**验收标准:**
- ✅ CI 在 push 时自动运行
- ✅ 测试失败阻止合并
- ✅ Coverage 报告上传成功

---

### Phase 7: Docker 支持 🟡

**目标:** 提供 Docker 部署方案，简化环境配置

**预估时间:** 0.5 天

#### 7.1 Dockerfile

- [ ] **创建 Dockerfile**
  ```dockerfile
  FROM node:22-alpine

  WORKDIR /app

  # 安装依赖
  COPY package*.json ./
  RUN npm ci --only=production

  # 复制代码
  COPY . .

  # 构建
  RUN npm run build

  # 端口
  EXPOSE 3001

  # 启动
  CMD ["npm", "start"]
  ```

- [ ] **创建 docker-compose.yml**
  ```yaml
  version: '3.8'
  services:
    voiceInter:
      build: .
      ports:
        - "3001:3001"
        - "3000:3000"
      environment:
        - NODE_ENV=production
        - HOST=0.0.0.0
      volumes:
        - ./data:/app/data

    whisper:
      image: whisper-server
      ports:
        - "2022:2022"

    kokoro:
      image: kokoro-tts
      ports:
        - "8880:8880"
  ```

- [ ] **添加 Docker 脚本**
  ```json
  {
    "scripts": {
      "docker:build": "docker build -t claude-voiceInter .",
      "docker:run": "docker run -p 3001:3001 claude-voiceInter",
      "docker:up": "docker-compose up",
      "docker:down": "docker-compose down"
    }
  }
  ```

**验收标准:**
- ✅ Docker 构建成功
- ✅ 容器运行正常
- ✅ 服务可访问

---

### Phase 8: 日志系统优化 ✅ 已完成

**目标:** 替换 console.log，使用结构化日志

**预估时间:** 0.5 天

#### 8.1 Logger 工具

- [ ] **创建 src/utils/logger.js**
  ```javascript
  const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  class Logger {
    constructor(level = 'INFO') {
      this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
      this.context = '';
    }

    setContext(context) {
      this.context = context;
    }

    log(level, message, data = {}) {
      if (LOG_LEVELS[level] < this.level) return;

      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        context: this.context,
        message,
        ...data
      };

      if (level === 'ERROR') {
        console.error(JSON.stringify(logEntry));
      } else if (level === 'WARN') {
        console.warn(JSON.stringify(logEntry));
      } else {
        console.log(JSON.stringify(logEntry));
      }
    }

    debug(msg, data) { this.log('DEBUG', msg, data); }
    info(msg, data) { this.log('INFO', msg, data); }
    warn(msg, data) { this.log('WARN', msg, data); }
    error(msg, data) { this.log('ERROR', msg, data); }
  }

  export const logger = new Logger(process.env.LOG_LEVEL || 'INFO');
  export default logger;
  ```

- [ ] **替换 console.log**
  ```javascript
  // 之前
  console.log('[VoicePanel] 对话开始');

  // 之后
  import { logger } from '../utils/logger';
  logger.setContext('VoicePanel');
  logger.info('对话开始');
  ```

- [ ] **生产环境静默**
  ```javascript
  if (process.env.NODE_ENV === 'production') {
    logger.setLevel('WARN'); // 生产环境只输出警告和错误
  }
  ```

**验收标准:**
- ✅ 无 console.log/console.error
- ✅ 日志格式结构化
- ✅ 支持日志级别控制

---

### Phase 9: React Error Boundary ✅ 已完成

**目标:** 添加错误边界，防止组件错误导致整体崩溃

**预估时间:** 0.5 天

#### 9.1 Error Boundary 组件

- [ ] **创建 ErrorBoundary.jsx**
  ```jsx
  import React from 'react';
  import { AlertTriangle, RefreshCw } from 'lucide-react';

  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      console.error('[ErrorBoundary]', error, errorInfo);
    }

    handleRetry = () => {
      this.setState({ hasError: false, error: null });
    };

    render() {
      if (this.state.hasError) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="text-center p-8">
              <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
              <h2 className="text-xl text-white mb-2">出现错误</h2>
              <p className="text-gray-400 mb-4">
                {this.state.error?.message || '未知错误'}
              </p>
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 rounded-lg text-white"
              >
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
            </div>
          </div>
        );
      }

      return this.props.children;
    }
  }

  export default ErrorBoundary;
  ```

- [ ] **在 App.jsx 中使用**
  ```jsx
  import ErrorBoundary from './components/ErrorBoundary';

  function App() {
    return (
      <ErrorBoundary>
        <WebSocketProvider>
          <Chat />
        </WebSocketProvider>
      </ErrorBoundary>
    );
  }
  ```

- [ ] **在关键组件中使用**
  ```jsx
  <ErrorBoundary>
    <VoicePanel />
  </ErrorBoundary>

  <ErrorBoundary>
    <ConversationList />
  </ErrorBoundary>
  ```

**验收标准:**
- ✅ 组件错误不导致整体崩溃
- ✅ 显示友好错误提示
- ✅ 支持重试恢复

---

## 四、低优先级改进需求

### Phase 10: 国际化 (i18n) 🟢

**目标:** 完整的多语言支持

**预估时间:** 1 天

- [ ] 添加 i18next 库
- [ ] 创建语言文件 (zh-CN, en-US, ja-JP)
- [ ] 提取所有文本为翻译键
- [ ] 添加语言切换 UI

---

### Phase 11: 主题切换 🟢

**目标:** 支持亮色/暗色主题切换

**预估时间:** 0.5 天

- [ ] 创建主题 CSS 变量
- [ ] 添加 ThemeContext
- [ ] 实现主题切换按钮
- [ ] 保存主题偏好

---

### Phase 12: 离线支持 🟢

**目标:** Service Worker 离线缓存

**预估时间:** 1 天

- [ ] 创建 Service Worker
- [ ] 缓存静态资源
- [ ] 缓存 API 响应
- [ ] 显示离线状态

---

## 五、优先级排序

```
优先级矩阵:

🔴 高优先级 (必须完成):
├── Phase 1: 测试框架搭建 ──────────────────── ✅ 完成
├── Phase 2: Chat.jsx 组件拆分 ────────────── ✅ 完成
├── Phase 3: 硬编码路径修复 ────────────────── ✅ 完成
├── Phase 4: TypeScript 支持 ──────────────── 未开始

🟡 中优先级 (建议完成):
├── Phase 5: ESLint + Prettier ─────────────── ✅ 完成
├── Phase 6: CI/CD 配置 ───────────────────── ✅ 完成
├── Phase 7: Docker 支持 ──────────────────── 未开始
├── Phase 8: 日志系统优化 ─────────────────── ✅ 完成
├── Phase 9: Error Boundary ───────────────── ✅ 完成

🟢 低优先级 (可选):
├── Phase 10: 国际化 (i18n) ────────────────── 未开始
├── Phase 11: 主题切换 ────────────────────── 未开始
├── Phase 12: 离线支持 ─────────────────────── 未开始
```

---

## 六、实施建议

### 实施顺序

```
Week 1:
├── Day 1-2: Phase 1 (测试框架)
├── Day 3: Phase 2 (组件拆分)
├── Day 4: Phase 3 (路径修复)

Week 2:
├── Day 1-2: Phase 4 (TypeScript)
├── Day 3: Phase 5 (ESLint) + Phase 6 (CI/CD)
├── Day 4: Phase 7 (Docker) + Phase 8 (日志)
├── Day 5: Phase 9 (Error Boundary)

Week 3+ (可选):
├── Phase 10-12 (国际化/主题/离线)
```

### 依赖关系

```
Phase 1 (测试) ← Phase 2 (拆分) ← Phase 4 (TS)
     ↓
Phase 5 (Lint) ← Phase 6 (CI/CD)
     ↓
Phase 3 (路径) ← Phase 7 (Docker)
```

---

## 七、验收标准汇总

| Phase | 关键验收标准 |
|-------|-------------|
| **1** | 测试覆盖率 > 70% |
| **2** | Chat.jsx < 300 行 |
| **3** | 无硬编码路径 |
| **4** | TypeScript 编译通过 |
| **5** | Lint 检查通过 |
| **6** | CI 自动运行 |
| **7** | Docker 构建成功 |
| **8** | 无 console.log |
| **9** | 错误不崩溃 |

---

**文档维护:** 每完成一个 Phase 后更新状态标记

**下一步行动:** 开始 Phase 1 - 测试框架搭建