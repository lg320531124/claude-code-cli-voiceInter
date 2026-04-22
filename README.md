# Claude Code CLI VoiceInter

A web UI for Claude Code CLI with comprehensive voice interaction support.

## ✨ Features

### Core Features
- 🎤 **Voice Input** - Speech-to-Text using Whisper.cpp (local) or Web Speech API
- 🔊 **Voice Output** - Text-to-Speech using Kokoro (local) or Browser SpeechSynthesis
- 💬 **Real-time Chat** - Streaming chat interface with Claude
- 🔄 **Persistent Connection** - WebSocket maintains same Claude instance

### Voice Features
- 🗣️ **Bidirectional Conversation** - Automatic continuous voice dialogue
- ⚡ **Interruptible TTS** - Stop speaking when you start talking
- 📊 **Voice Waveform** - Real-time audio visualization
- 🌐 **Multi-language Support** - Chinese, English, Japanese, Korean, etc.
- ⚙️ **TTS Customization** - Adjustable speed (0.5x-2.0x) and voice selection
- 📝 **Real-time Subtitles** - Floating caption display for voice interactions

### Conversation Management
- 📋 **Conversation List** - Left sidebar with multiple conversations
- 🔍 **Search Conversations** - Find by title or content
- 💾 **Export Conversations** - JSON, Markdown, or TXT format
- 🔄 **Auto-save** - Messages saved to IndexedDB

### User Experience
- ⌨️ **Keyboard Shortcuts** - Full keyboard navigation support
- 🎨 **Glassmorphism UI** - Apple-style modern design
- 📱 **Responsive Layout** - Adapts to different screen sizes
- 🔔 **Error Notifications** - Friendly Chinese error messages
- 🌙 **Dark Theme** - Elegant dark color scheme

### Technical Features
- 🔌 **Hybrid TTS** - Auto-switch between Kokoro and Browser TTS
- 💾 **Audio Caching** - TTS audio cached in IndexedDB
- 🔄 **Service Recovery** - Auto-reconnect with exponential backoff
- 🌐 **Browser Compatibility** - Detection and adaptation for different browsers
- 📊 **Network Monitor** - Connection quality detection

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express + WebSocket |
| AI | Claude Code CLI (stream-json mode) |
| STT | Whisper.cpp (port 2022) / Web Speech API |
| TTS | Kokoro (port 8880) / Browser SpeechSynthesis |
| Storage | IndexedDB (messages, TTS cache) |

## 📋 Prerequisites

- Node.js 18+ installed
- Claude Code CLI installed globally (`npm install -g @anthropic-ai/claude-code`)
- Chrome/Edge browser (recommended for voice support)
- VoiceMode MCP (optional, for local STT/TTS)

### VoiceMode Setup (Recommended)

VoiceMode provides high-quality local voice processing:

```bash
# Install VoiceMode MCP
npm install -g @anthropic-ai/voicemode

# Start services
voicemode service whisper start  # STT on port 2022
voicemode service kokoro start   # TTS on port 8880
```

Or use Claude Code's VoiceMode MCP:
```
# In Claude Code, use MCP tools:
mcp__voicemode__service whisper start
mcp__voicemode__service kokoro start
```

## 🚀 Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/lg320531124/claude-code-cli-voiceInter.git
cd claude-code-cli-voiceInter

# Install dependencies
npm install

# Start development server
npm run dev
```

### Usage

1. Open http://localhost:3000 in your browser
2. (Optional) Start VoiceMode services for local voice processing
3. Click the microphone button or press `Ctrl+V` for voice input
4. Claude will respond and can automatically speak the response

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (frontend + backend) |
| `npm run dev:lan` | Start with LAN access (0.0.0.0) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run restart` | Kill existing servers and restart |

## 🎮 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+V` | Toggle voice input |
| `Ctrl+Shift+V` | Toggle bidirectional conversation |
| `Ctrl+Shift+S` | Stop all voice/TTS |
| `Ctrl+N` | New session |
| `Ctrl+/` | Open command palette |
| `Ctrl+T` | View token stats |
| `Ctrl+S` | Export conversation |
| `Esc` | Close panels / Stop voice |

See full shortcuts by pressing `Ctrl+?` in the app.

## 📁 Project Structure

```
claude-code-cli-voiceInter/
├── server/
│   └── index.js              # Express + WebSocket + Claude CLI
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css             # Animations + Glassmorphism
│   ├── contexts/
│   │   └── WebSocketContext.jsx
│   ├── components/
│   │   ├── Chat.jsx          # Main chat UI
│   │   ├── VoicePanel.jsx    # Voice control panel
│   │   ├── ConversationList.jsx  # Left sidebar
│   │   ├── RealtimeSubtitles.jsx # Floating captions
│   │   ├── ExportPanel.jsx   # Export dialog
│   │   ├── TTSSettings.jsx    # TTS customization
│   │   ├── LanguageSelector.jsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useEnhancedVoice.js  # Bidirectional voice
│   │   ├── useHybridTTS.js      # Kokoro + Browser TTS
│   │   └── ...
│   ├── utils/
│   │   ├── conversationManager.js  # Multi-conversation
│   │   ├── conversationExport.js   # Export formats
│   │   ├── ttsCache.js             # Audio caching
│   │   ├── languageDetection.js    # Language support
│   │   ├── serviceRecovery.js      # Auto-reconnect
│   │   └── ...
│   └── config/
│       └── shortcuts.js      # Keyboard shortcuts
└── docs/
    └── superpowers/specs/
        └── voice-enhancement-roadmap.md
```

## 🔧 Configuration

### Environment Variables

Create `.env` file (optional):

```bash
# Server
PORT=3001
HOST=localhost

# VoiceMode Services
WHISPER_ENDPOINT=http://127.0.0.1:2022/v1
KOKORO_ENDPOINT=http://127.0.0.1:8880/v1

# Claude CLI
CLAUDE_PATH=claude
PROJECT_PATH=/path/to/your/project
```

### Voice Settings

Adjust in the VoicePanel settings:
- **Speed**: 0.5x to 2.0x
- **Voice**: Kokoro voices (Sky, Bella, Adam...) or Browser voices
- **Language**: Auto-detect or manual selection
- **Auto-continue**: Automatic conversation mode

## 🌐 Browser Support

| Browser | Voice Support | Notes |
|---------|---------------|-------|
| Chrome 33+ | ✅ Full | Recommended |
| Edge 79+ | ✅ Full | Recommended |
| Safari 14.1+ | ⚠️ Partial | Requires user interaction for mic |
| Firefox | ❌ Limited | No SpeechRecognition, use Whisper |

The app automatically detects browser capabilities and adapts.

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser                              │
├─────────────────────────────────────────────────────────┤
│  React App                                              │
│  ├── WebSocketContext (connection management)           │
│  ├── Chat (main UI)                                     │
│  │   ├── ConversationList (sidebar)                     │
│  │   ├── VoicePanel (voice control)                     │
│  │   └── RealtimeSubtitles (captions)                   │
│  └── Hooks                                              │
│      ├── useHybridTTS (Kokoro + Browser)                │
│      ├── useBidirectionalVoice (continuous dialogue)   │
│      └── IndexedDB (messages, cache)                    │
└─────────────────────────────────────────────────────────┘
                          │
                          │ WebSocket
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Node.js Server                         │
├─────────────────────────────────────────────────────────┤
│  Express + WebSocket Server                             │
│  ├── /api/voice/status (service health)                 │
│  ├── /api/voice/stt (Whisper transcription)             │
│  ├── /api/voice/tts (Kokoro synthesis)                  │
│  └── Claude CLI (persistent stream-json)                │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Whisper  │    │  Kokoro  │    │  Claude  │
    │ :2022    │    │  :8880   │    │   CLI    │
    │ (STT)    │    │  (TTS)   │    │          │
    └──────────┘    └──────────┘    └──────────┘
```

## 🐛 Troubleshooting

### Voice not working?
1. Check browser compatibility (Chrome/Edge recommended)
2. Grant microphone permissions
3. Verify VoiceMode services are running:
   ```bash
   curl http://127.0.0.1:2022/health  # Whisper
   curl http://127.0.0.1:8880/health  # Kokoro
   ```

### Connection issues?
1. Check WebSocket connection (green indicator in header)
2. Server restart: `npm run restart`
3. Check server logs: `npm run logs`

### Claude not responding?
1. Verify Claude CLI is installed: `claude --version`
2. Check PROJECT_PATH in environment
3. Review server console for errors

## 📝 License

MIT

## 🙏 Credits

- Claude Code CLI by Anthropic
- VoiceMode MCP for local STT/TTS
- Lucide React for icons