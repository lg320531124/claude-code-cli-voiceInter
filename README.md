# CloudCLI Voice

A simplified web UI for Claude Code CLI with voice interaction support.

## Features

- 🎤 Voice input using Web Speech API (Speech Recognition)
- 🔊 Voice output using Speech Synthesis
- 💬 Real-time chat interface with Claude
- 🔄 WebSocket-based streaming responses
- 🇨🇳 Default Chinese language support (zh-CN)

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express + WebSocket
- **AI**: @anthropic-ai/claude-agent-sdk
- **Voice**: Web Speech API (browser native)

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Anthropic API key or Claude subscription
- Chrome/Edge browser (for best voice support)

### Installation

```bash
# Clone repository
git clone https://github.com/forrestchang/cloudcli-voice.git
cd cloudcli-voice

# Install dependencies
npm install

# Start development server
npm run dev
```

### Usage

1. Open http://localhost:3000 in your browser
2. Click the microphone button to start voice input
3. Speak your message (Chinese by default)
4. Claude will respond and automatically speak the response

## Architecture

```
Frontend (React)          Backend (Node.js)
    ↓                         ↓
WebSocket Context  →  WebSocket Server
    ↓                         ↓
VoiceButton/Chat   →  Claude SDK
    ↓                         ↓
Web Speech API    ←  Streaming Response
```

## Project Structure

```
cloudcli-voice/
├── package.json
├── vite.config.js
├── server/
│   ├── index.js          # Express + WebSocket server
│   └── claude-sdk.js     # Claude SDK integration
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── contexts/
│   │   └── WebSocketContext.jsx
│   ├── components/
│   │   ├── Chat.jsx
│   │   └── VoiceButton.jsx
│   └── hooks/
│   │   └── useVoiceRecognition.js
```

## Voice Features

### Speech-to-Text (STT)
- Uses browser's native SpeechRecognition API
- Real-time interim results display
- Supports Chinese (zh-CN) and other languages

### Text-to-Speech (TTS)
- Uses browser's native SpeechSynthesis API
- Auto-speaks Claude responses
- Adjustable rate, pitch, and volume

## Browser Support

Voice features require browser support:
- Chrome 33+ ✅
- Edge 79+ ✅
- Safari 14.1+ ✅ (partial)
- Firefox ❌ (no SpeechRecognition)

## License

MIT

## Credits

Inspired by [CloudCLI (claudecodeui)](https://github.com/siteboon/claudecodeui)