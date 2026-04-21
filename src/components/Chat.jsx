import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useVoiceInteraction } from '../hooks/useVoiceRecognition';
import { Send, Sparkles, User, Mic, Volume2, MoreHorizontal, RefreshCw, FileText, Settings } from 'lucide-react';
import SkillManager from './SkillManager';
import CommandPalette from './CommandPalette';

function Chat() {
  const { isConnected, sendMessage, latestMessage } = useWebSocket();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [claudeReady, setClaudeReady] = useState(false);
  const [isComposing, setIsComposing] = useState(false); // Input method composition state
  const [showSkillManager, setShowSkillManager] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const handleVoiceResult = useCallback((text) => {
    if (text.trim()) {
      sendToClaude(text);
    }
  }, []);

  const voice = useVoiceInteraction({
    language: 'zh-CN',
    onSpeechResult: handleVoiceResult,
    autoSpeakResponse: true
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!latestMessage) return;

    const { type, data, error, message, sessionId: newSessionId, claudeReady: ready } = latestMessage;

    if (type === 'connected') {
      setClaudeReady(true);
      if (newSessionId) setSessionId(newSessionId);
    }

    if (type === 'session-reset' && newSessionId) {
      setSessionId(newSessionId);
      setMessages([]);
    }

    if (type === 'status' && message === 'Processing...') {
      setIsProcessing(true);
    }

    if (type === 'claude-response' && data) {
      setIsProcessing(false);
      const content = data.content || '';
      if (content.trim()) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant' && lastMsg.content === content) {
            return prev;
          }
          return [...prev, { role: 'assistant', content }];
        });
        if (voice.isSupported) {
          voice.speak(content);
        }
      }
    }

    if (type === 'complete') {
      setIsProcessing(false);
    }

    if (type === 'error') {
      setIsProcessing(false);
      setMessages(prev => [...prev, { role: 'error', content: error || 'Unknown error' }]);
    }

  }, [latestMessage, voice]);

  const sendToClaude = useCallback((text) => {
    if (!text.trim() || !isConnected || isProcessing) return;

    setMessages(prev => [...prev, { role: 'user', content: text.trim() }]);
    setInputText('');
    setIsProcessing(true);

    if (voice.stopSpeaking) {
      voice.stopSpeaking();
    }

    sendMessage({
      type: 'claude-command',
      command: text.trim(),
      options: { cwd: '/Users/lg/project/cloudCliVoice' }
    });

    inputRef.current?.focus();
  }, [isConnected, isProcessing, sendMessage, voice]);

  const startNewSession = useCallback(() => {
    sendMessage({ type: 'new-session' });
    setMessages([]);
  }, [sendMessage]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    sendToClaude(inputText);
  };

  const handleKeyDown = (e) => {
    // Don't send if input method is composing (e.g., typing Chinese)
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle input method composition events (for Chinese/Japanese/Korean input)
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleVoiceClick = () => {
    if (voice.isSpeaking && voice.stopSpeaking) {
      voice.stopSpeaking();
    } else if (voice.toggleListening) {
      voice.toggleListening();
    }
  };

  // Handle command palette selection
  const handleCommandSelect = (command) => {
    setInputText('');
    setShowCommandPalette(false);

    switch (command.action) {
      case 'open-skill-manager':
        setShowSkillManager(true);
        break;
      case 'new-session':
        startNewSession();
        break;
      case 'clear-messages':
        setMessages([]);
        break;
      case 'export-chat':
        exportChat();
        break;
      case 'show-help':
        showHelp();
        break;
      case 'terminal-mode':
        sendToClaude('I want to run terminal/shell commands. Help me execute commands in this project.');
        break;
      default:
        console.log('Unknown command:', command.action);
    }
  };

  // Handle input change - show command palette on '/'
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputText(value);

    if (value.startsWith('/')) {
      setShowCommandPalette(true);
    } else {
      setShowCommandPalette(false);
    }
  };

  // Export chat as markdown
  const exportChat = () => {
    const content = messages.map(m =>
      m.role === 'user' ? `## User\n${m.content}` : `## Claude\n${m.content}`
    ).join('\n\n---\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show help message
  const showHelp = () => {
    const helpContent = `**Available Commands:**

- \`/skill\` - Open Skill Manager (import/create skills)
- \`/new\` - Start new session
- \`/clear\` - Clear messages
- \`/export\` - Export chat as markdown
- \`/terminal\` - Terminal mode
- \`/help\` - Show this help

**Voice Features:**
- Click mic button to start voice input
- Response will be spoken automatically

**Tips:**
- Messages go to the same Claude instance (context preserved)
- Use Shift+Enter for new lines`;

    setMessages(prev => [...prev, { role: 'assistant', content: helpContent }]);
  };

  // Format message content (basic markdown-like formatting)
  const formatContent = (content) => {
    // Split by code blocks
    const parts = content.split(/```(\w*)\n?/g);

    return parts.map((part, i) => {
      if (i % 2 === 1) {
        // This is a code block language indicator, skip
        return null;
      }
      if (i % 2 === 2) {
        // This is code content
        return (
          <pre key={i} className="bg-black/30 rounded-xl p-4 my-3 overflow-x-auto text-sm font-mono">
            <code>{part.trim()}</code>
          </pre>
        );
      }
      // Regular text
      return (
        <span key={i}>
          {part.split('\n').map((line, j) => (
            <React.Fragment key={j}>
              {line}
              {j < part.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </span>
      );
    });
  };

  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    const isError = msg.role === 'error';
    const isLast = index === messages.length - 1;

    return (
      <div
        key={index}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Avatar */}
        {!isUser && !isError && (
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 mr-3 shadow-lg shadow-purple-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`max-w-[75%] px-5 py-4 leading-relaxed ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-3xl rounded-tr-xl shadow-lg shadow-blue-500/20'
              : isError
              ? 'bg-red-500/10 text-red-400 border border-red-500/20 rounded-3xl'
              : 'bg-white/10 backdrop-blur-xl text-white/90 rounded-3xl rounded-tl-xl border border-white/10 shadow-xl'
          }`}
        >
          <div className="text-[15px] whitespace-pre-wrap">
            {formatContent(msg.content)}
          </div>

          {/* Typing indicator for last assistant message if processing */}
          {isLast && !isUser && !isError && isProcessing && (
            <div className="flex gap-1 mt-2">
              <span className="w-2 h-2 bg-white/50 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>

        {/* User Avatar */}
        {isUser && (
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shrink-0 ml-3 shadow-lg">
            <User className="w-4 h-4 text-white/70" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Claude Voice</h1>
            <p className="text-sm text-white/50 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                {isConnected ? 'Connected' : 'Offline'}
              </span>
              {claudeReady && (
                <span className="text-white/30">•</span>
              )}
              {claudeReady && (
                <span className="text-purple-400">Session Active</span>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Voice status indicators */}
          {voice.isListening && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 animate-pulse">
              <Mic className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Listening...</span>
            </div>
          )}

          {voice.isSpeaking && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30">
              <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-sm text-purple-400">Speaking...</span>
            </div>
          )}

          {/* New session button */}
          <button
            onClick={startNewSession}
            disabled={!isConnected}
            className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
            title="Start new session"
          >
            <RefreshCw className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          </button>

          {/* Skill Manager button */}
          <button
            onClick={() => setShowSkillManager(true)}
            disabled={!isConnected}
            className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
            title="Open Skill Manager"
          >
            <FileText className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          </button>
        </div>
      </header>

      {/* Messages Container */}
      <main className="relative flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Empty state */}
          {messages.length === 0 && !isProcessing && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-white/10 flex items-center justify-center mb-6 shadow-xl">
                <Sparkles className="w-10 h-10 text-purple-400" />
              </div>

              <h2 className="text-2xl font-medium text-white mb-3">
                How can I help you today?
              </h2>

              <p className="text-white/50 max-w-md">
                Type a message or click the microphone to speak.
                I'll remember our conversation context.
              </p>

              {/* Quick action suggestions */}
              <div className="flex gap-3 mt-8">
                {['What can you do?', 'Explain this code', 'Help me debug'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendToClaude(suggestion)}
                    className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-sm text-white/70 hover:bg-white/20 hover:text-white transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map(renderMessage)}

          {/* Invisible scroll anchor */}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* Input Area */}
      <footer className="relative px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-end gap-4">
            {/* Text Input with Voice Button inside */}
            <div className="flex-1 relative flex items-end">
              {/* Command Palette */}
              <CommandPalette
                inputText={inputText}
                onSelectCommand={handleCommandSelect}
                visible={showCommandPalette}
              />

              <textarea
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder="Message Claude... or type / for commands"
                disabled={isProcessing}
                rows={1}
                className="w-full px-6 py-4 pr-14 bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/15 resize-none transition-all duration-200 disabled:opacity-50 text-[15px]"
                style={{
                  minHeight: '56px',
                  maxHeight: '200px',
                  height: 'auto'
                }}
              />

              {/* Voice Button - inside input on the right */}
              <div className="absolute right-3 bottom-3">
                <button
                  type="button"
                  onClick={handleVoiceClick}
                  disabled={isProcessing || !isConnected || !voice.isSupported}
                  title={!voice.isSupported ? 'Voice not supported' : voice.isListening ? 'Stop listening' : 'Start voice input'}
                  className={`h-[40px] w-[40px] rounded-xl flex items-center justify-center transition-all duration-200 border ${
                    voice.isListening
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 border-red-400/50 text-white shadow-lg shadow-red-500/30 animate-pulse'
                      : voice.isSpeaking
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400/50 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-white/10 backdrop-blur-xl border-white/10 text-white/60 hover:bg-white/20 hover:text-white hover:border-white/20'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {voice.isSpeaking ? (
                    <Volume2 className="w-5 h-5 animate-pulse" />
                  ) : voice.isListening ? (
                    <Mic className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Processing indicator */}
              {isProcessing && (
                <div className="absolute right-16 bottom-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || !isConnected || isProcessing}
              className="h-[56px] w-[56px] rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none group"
            >
              <Send className="w-5 h-5 text-white group-disabled:opacity-50" />
            </button>
          </form>

          {/* Hint */}
          <p className="text-center text-xs text-white/30 mt-4">
            Press Enter to send • Shift+Enter for new line • Type / for commands • Click mic for voice
          </p>
        </div>
      </footer>

      {/* Skill Manager Modal */}
      <SkillManager
        isOpen={showSkillManager}
        onClose={() => setShowSkillManager(false)}
      />
    </div>
  );
}

export default Chat;