import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useVoiceInteraction } from '../hooks/useVoiceRecognition';
import VoiceButton from './VoiceButton';

/**
 * Chat Component
 *
 * Main chat interface with text input and voice interaction.
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
    autoSpeakResponse: true // Auto speak Claude responses
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!latestMessage) return;

    const { type, sessionId: newSessionId, data, error, message } = latestMessage;

    // Handle session ID
    if (type === 'session-id' && newSessionId) {
      setSessionId(newSessionId);
    }

    // Handle status
    if (type === 'status') {
      setMessages(prev => [...prev, {
        type: 'system',
        content: message || 'Processing...'
      }]);
    }

    // Handle Claude response
    if (type === 'claude-response' && data) {
      setIsProcessing(false);

      // Extract content
      const content = data.content || '';

      // Add to messages
      setMessages(prev => {
        // Check if we should update last assistant message or add new
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.type === 'assistant' && lastMsg.incomplete) {
          // Update existing message (streaming)
          return [...prev.slice(0, -1), {
            ...lastMsg,
            content: lastMsg.content + content,
            incomplete: false
          }];
        }
        // Add new message
        return [...prev, {
          type: 'assistant',
          content,
          incomplete: false
        }];
      });

      // Speak response
      if (content && voice.isSupported) {
        voice.speakResponse(content);
      }
    }

    // Handle streaming delta
    if (type === 'stream_delta') {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.type === 'assistant') {
          return [...prev.slice(0, -1), {
            ...lastMsg,
            content: lastMsg.content + latestMessage.content,
            incomplete: true
          }];
        }
        return [...prev, {
          type: 'assistant',
          content: latestMessage.content || '',
          incomplete: true
        }];
      });
    }

    // Handle completion
    if (type === 'complete') {
      setIsProcessing(false);
      // Mark last message as complete
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.type === 'assistant') {
          return [...prev.slice(0, -1), { ...lastMsg, incomplete: false }];
        }
        return prev;
      });
    }

    // Handle error
    if (type === 'error') {
      setIsProcessing(false);
      setMessages(prev => [...prev, {
        type: 'system',
        content: `Error: ${error || 'Unknown error'}`,
        isError: true
      }]);
    }

    // Handle abort
    if (type === 'aborted') {
      setIsProcessing(false);
      setMessages(prev => [...prev, {
        type: 'system',
        content: 'Session aborted'
      }]);
    }

  }, [latestMessage, voice]);

  // Send message to Claude
  const sendToClaude = useCallback((text) => {
    if (!text.trim() || !isConnected || isProcessing) return;

    // Add user message to display
    setMessages(prev => [...prev, {
      type: 'user',
      content: text.trim()
    }]);

    // Clear input
    setInputText('');

    // Set processing state
    setIsProcessing(true);

    // Stop any ongoing speech
    voice.stopSpeaking();

    // Send to backend
    sendMessage({
      type: 'claude-command',
      command: text.trim(),
      options: {
        cwd: '/', // Backend will use current directory
        sessionId: sessionId // Resume session if exists
      }
    });

  }, [isConnected, isProcessing, sessionId, sendMessage, voice]);

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    sendToClaude(inputText);
  };

  // Handle voice button click
  const handleVoiceClick = () => {
    if (voice.isSpeaking) {
      voice.stopSpeaking();
    } else {
      voice.toggleListening();
    }
  };

  // Render message
  const renderMessage = (msg, index) => {
    const className = `message ${msg.type} ${msg.isError ? 'error' : ''}`;

    return (
      <div key={index} className={className}>
        <div className="message-content">
          {msg.content}
        </div>
      </div>
    );
  };

  return (
    <div className="chat-container">
      {/* Status bar */}
      <div className="status-bar">
        <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
        {voice.isListening && (
          <span>🎤 Listening: {voice.interimTranscript || '...'}</span>
        )}
        {voice.isSpeaking && (
          <span>🔊 Speaking...</span>
        )}
        {isProcessing && (
          <span>⏳ Processing...</span>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map(renderMessage)}

        {/* Typing indicator */}
        {isProcessing && (
          <div className="message assistant">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form className="chat-input-area" onSubmit={handleSubmit}>
        {/* Voice button */}
        <VoiceButton
          isListening={voice.isListening}
          isSpeaking={voice.isSpeaking}
          isSupported={voice.isSupported}
          onClick={handleVoiceClick}
          disabled={isProcessing}
        />

        {/* Text input */}
        <textarea
          ref={inputRef}
          className="chat-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type or speak your message..."
          disabled={isProcessing}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        {/* Send button */}
        <button
          type="submit"
          className="send-button"
          disabled={!inputText.trim() || !isConnected || isProcessing}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat;