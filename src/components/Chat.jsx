import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useVoiceInteraction } from '../hooks/useVoiceRecognition';
import VoiceButton from './VoiceButton';
import { Send, Bot, User, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Chat Component - Modern Design
 */
function Chat() {
  // WebSocket
  const { isConnected, sendMessage, latestMessage } = useWebSocket();

  // Messages state
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Handle voice result - send to Claude
  const handleVoiceResult = useCallback((text) => {
    if (text.trim()) {
      sendToClaude(text);
    }
  }, []);

  // Voice interaction
  const voice = useVoiceInteraction({
    language: 'zh-CN',
    onSpeechResult: handleVoiceResult,
    autoSpeakResponse: true
  });

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!latestMessage) return;

    const { type, sessionId: newSessionId, data, error, message } = latestMessage;

    if (type === 'session-id' && newSessionId) {
      setSessionId(newSessionId);
    }

    if (type === 'status') {
      // Don't show status messages, just mark processing
    }

    if (type === 'claude-response' && data) {
      setIsProcessing(false);
      const content = data.content || '';

      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.type === 'assistant' && lastMsg.incomplete) {
          return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + content, incomplete: false }];
        }
        return [...prev, { type: 'assistant', content, incomplete: false }];
      });

      if (content && voice.isSupported) {
        voice.speakResponse(content);
      }
    }

    if (type === 'stream_delta') {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.type === 'assistant') {
          return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + (latestMessage.content || ''), incomplete: true }];
        }
        return [...prev, { type: 'assistant', content: latestMessage.content || '', incomplete: true }];
      });
    }

    if (type === 'complete') {
      setIsProcessing(false);
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.type === 'assistant') {
          return [...prev.slice(0, -1), { ...lastMsg, incomplete: false }];
        }
        return prev;
      });
    }

    if (type === 'error') {
      setIsProcessing(false);
      setMessages(prev => [...prev, { type: 'error', content: error || 'Unknown error' }]);
    }

    if (type === 'aborted') {
      setIsProcessing(false);
    }

  }, [latestMessage, voice]);

  // Send message to Claude
  const sendToClaude = useCallback((text) => {
    if (!text.trim() || !isConnected || isProcessing) return;

    setMessages(prev => [...prev, { type: 'user', content: text.trim() }]);
    setInputText('');
    setIsProcessing(true);
    voice.stopSpeaking();

    sendMessage({
      type: 'claude-command',
      command: text.trim(),
      options: { cwd: '/', sessionId }
    });

  }, [isConnected, isProcessing, sessionId, sendMessage, voice]);

  // Handle submit
  const handleSubmit = (e) => {
    e?.preventDefault();
    sendToClaude(inputText);
  };

  // Handle keyboard
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Voice button click
  const handleVoiceClick = () => {
    if (voice.isSpeaking) {
      voice.stopSpeaking();
    } else {
      voice.toggleListening();
    }
  };

  // Render message
  const renderMessage = (msg, index) => {
    const isUser = msg.type === 'user';
    const isError = msg.type === 'error';

    return (
      <div
        key={index}
        className={`flex gap-3 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && !isError && (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-primary" />
          </div>
        )}

        <div
          className={`max-w-[80%] px-4 py-3 rounded-xl ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : isError
              ? 'bg-destructive/10 text-destructive border border-destructive/30'
              : 'bg-card border border-border'
          }`}
        >
          <div className="message-content text-sm leading-relaxed whitespace-pre-wrap">
            {msg.content}
          </div>
        </div>

        {isUser && (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-card/30 rounded-xl border border-border">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-voice-ready' : 'text-muted-foreground'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-voice-ready' : 'bg-muted-foreground'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>

          {isProcessing && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing...
            </div>
          )}

          {voice.isListening && (
            <div className="flex items-center gap-1.5 text-xs text-voice-active">
              <span className="animate-pulse">🎤</span>
              Listening...
            </div>
          )}

          {voice.isSpeaking && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              🔊 Speaking...
            </div>
          )}
        </div>

        {voice.interimTranscript && (
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md max-w-[200px] truncate">
            "{voice.interimTranscript}"
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-2">Start a conversation with Claude</p>
            <p className="text-xs text-muted-foreground/60">
              Type a message or click the microphone button to speak
            </p>
          </div>
        )}

        {messages.map(renderMessage)}

        {/* Typing Indicator */}
        {isProcessing && messages[messages.length - 1]?.type !== 'assistant' && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border px-4 py-3 rounded-xl">
              <div className="flex gap-1.5">
                <div className="typing-dot w-2 h-2 rounded-full bg-primary/60" />
                <div className="typing-dot w-2 h-2 rounded-full bg-primary/60" />
                <div className="typing-dot w-2 h-2 rounded-full bg-primary/60" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 rounded-b-xl p-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          {/* Voice Button */}
          <VoiceButton
            isListening={voice.isListening}
            isSpeaking={voice.isSpeaking}
            isSupported={voice.isSupported}
            onClick={handleVoiceClick}
            disabled={isProcessing}
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or speak your message..."
              disabled={isProcessing}
              rows={1}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none transition-smooth disabled:opacity-50"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || !isConnected || isProcessing}
            className="h-[44px] px-5 bg-primary text-primary-foreground rounded-xl font-medium flex items-center gap-2 hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>

        {/* Help text */}
        <div className="mt-2 text-xs text-muted-foreground/60 text-center">
          Press Enter to send • Shift+Enter for new line • Click 🎙️ for voice input
        </div>
      </div>
    </div>
  );
}

export default Chat;