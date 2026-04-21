# Claude Code CLI VoiceInter

A web UI for Claude Code CLI with voice interaction support.

## Features

- 🎤 Voice input using Web Speech API (Speech Recognition)
- 🔊 Voice output using Speech Synthesis
- 💬 Real-time chat interface with Claude
- 🔄 Persistent WebSocket connection (same Claude instance)
- 🇨🇳 Default Chinese language support (zh-CN)
- 🍎 Apple-style glassmorphism UI

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + WebSocket
- **AI**: Claude Code CLI (stream-json mode)
- **Voice**: Web Speech API (browser native)

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Claude Code CLI installed globally
- Chrome/Edge browser (for best voice support)

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
2. Click the microphone button to start voice input
3. Speak your message (Chinese by default)
4. Claude will respond and automatically speak the response

## Architecture

```
Frontend (React)                Backend (Node.js)
    ↓                               ↓
WebSocket Context    →    WebSocket Server
    ↓                               ↓
VoiceButton/Chat     →    Claude CLI (persistent)
    ↓                               ↓
Web Speech API       ←    stream-json output
```

## Key Design

### Persistent Connection
- Claude instance starts when server launches
- All messages go to same instance via stdin
- Context preserved across messages
- No new process spawn per message

### stream-json Mode
- Input: `{"type": "user", "message": {"role": "user", "content": "..."}}`
- Output: JSON lines parsed incrementally

## Project Structure

```
claude-code-cli-voiceInter/
├── package.json
├── vite.config.js
├── server/
│   └── index.js          # Express + WebSocket + persistent Claude
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css         # Apple-style animations
│   ├── contexts/
│   │   └── WebSocketContext.jsx
│   ├── components/
│   │   ├── Chat.jsx      # Apple-style chat UI
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