import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useVoiceInteraction } from '../hooks/useVoiceRecognition';
import VoiceButton from './VoiceButton';
import { Send, Bot, User, Loader2, Terminal } from 'lucide-react';

function Chat() {
  const { isConnected, sendMessage, latestMessage } = useWebSocket();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [cliOutput, setCliOutput] = useState('');
  const [lastStatus, setLastStatus] = useState('');

  const messagesEndRef = useRef(null);

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
  }, [messages, cliOutput]);

  useEffect(() => {
    if (!latestMessage) return;

    const { type, sessionId: newSessionId, data, error, message, exitCode } = latestMessage;

    if (type === 'session-id' && newSessionId) {
      setSessionId(newSessionId);
      setIsProcessing(true);
      setCliOutput('');
    }

    if (type === 'status') {
      // Deduplicate status messages
      if (message && message !== lastStatus) {
        setLastStatus(message);
        setCliOutput(prev => prev + `[Status] ${message}\n`);
      }
    }

    if (type === 'claude-response' && data) {
      setIsProcessing(false);
      const content = data.content || '';
      if (content.trim()) {
        setMessages(prev => {
          // Check if we already have this message (avoid duplicates)
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.type === 'assistant' && lastMsg.content === content) {
            return prev;
          }
          return [...prev, { type: 'assistant', content, incomplete: false }];
        });
        if (voice.isSupported) {
          voice.speak(content);
        }
      }
    }

    if (type === 'complete') {
      setIsProcessing(false);
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.incomplete) {
          return [...prev.slice(0, -1), { ...lastMsg, incomplete: false }];
        }
        return prev;
      });
    }

    if (type === 'error') {
      setIsProcessing(false);
      const errorMsg = error || 'Unknown error';
      setCliOutput(prev => prev + `[Error] ${errorMsg}\n`);
      setMessages(prev => [...prev, { type: 'error', content: errorMsg }]);
    }

    if (type === 'aborted') {
      setIsProcessing(false);
      setCliOutput(prev => prev + '[Aborted]\n');
    }

  }, [latestMessage, voice]);

  const sendToClaude = useCallback((text) => {
    if (!text.trim() || !isConnected || isProcessing) return;

    setMessages(prev => [...prev, { type: 'user', content: text.trim() }]);
    setInputText('');
    setIsProcessing(true);
    setCliOutput('');

    if (voice.stopSpeaking) {
      voice.stopSpeaking();
    }

    sendMessage({
      type: 'claude-command',
      command: text.trim(),
      options: { cwd: '/', sessionId }
    });

  }, [isConnected, isProcessing, sessionId, sendMessage, voice]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    sendToClaude(inputText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceClick = () => {
    if (voice.isSpeaking && voice.stopSpeaking) {
      voice.stopSpeaking();
    } else if (voice.toggleListening) {
      voice.toggleListening();
    }
  };

  const renderMessage = (msg, index) => {
    const isUser = msg.type === 'user';
    const isError = msg.type === 'error';

    return (
      <div key={index} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && !isError && (
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-indigo-500" />
          </div>
        )}

        <div className={`max-w-[80%] px-4 py-3 rounded-xl ${
          isUser ? 'bg-indigo-500 text-white' :
          isError ? 'bg-red-500/10 text-red-500 border border-red-500/30' :
          'bg-gray-800 border border-gray-700'
        }`}>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {msg.content}
          </div>
        </div>

        {isUser && (
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gray-900/50 rounded-xl border border-gray-700">
      {/* Status Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-700 bg-gray-800/50 rounded-t-xl">
        <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-500'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>

        {isProcessing && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing...
          </div>
        )}

        {voice.isListening && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            🎤 Listening...
          </div>
        )}

        {voice.isSpeaking && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-400">
            🔊 Speaking...
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
              <Terminal className="w-8 h-8 text-indigo-500" />
            </div>
            <p className="text-gray-400 mb-2">Start a conversation with Claude Code</p>
            <p className="text-xs text-gray-500">
              Type a message or click the microphone button to speak
            </p>
          </div>
        )}

        {messages.map(renderMessage)}

        {/* CLI Output */}
        {cliOutput && (
          <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-2 mt-4">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Terminal className="w-3 h-3" />
              CLI Output
            </div>
            <pre className="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-48">
              {cliOutput.slice(-2000)}
            </pre>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 bg-gray-800/50 rounded-b-xl p-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <VoiceButton
            isListening={voice.isListening}
            isSpeaking={voice.isSpeaking}
            isSupported={voice.isSupported}
            onClick={handleVoiceClick}
            disabled={isProcessing}
          />

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or speak your message..."
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none disabled:opacity-50"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || !isConnected || isProcessing}
            className="h-[44px] px-5 bg-indigo-500 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>

        <div className="mt-2 text-xs text-gray-500 text-center">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

export default Chat;