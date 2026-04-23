/**
 * MessageList - Renders message list and empty state
 */
import React from 'react';
import { Sparkles, User, Volume2, Copy } from 'lucide-react';

interface Attachment {
  name: string;
  type: string;
  isImage: boolean;
  preview?: string | null;
}

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  isStreaming?: boolean;
  isSending?: boolean;
  attachments?: Attachment[];
}

interface MessageListProps {
  messages: Message[];
  isProcessing: boolean;
  isSending: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onSpeakMessage: (content: string) => void;
  onQuickAction: (text: string) => void;
  historyTTSSpeaking: boolean;
  waveIndicatorActive?: boolean;
  onStopResponse?: () => void;
}

// Format message content with basic markdown
function formatContent(content: string): React.ReactNode {
  const parts = content.split(/```(\w*)\n?/g);

  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return null;
    }
    if (i % 2 === 2) {
      return (
        <pre key={i} className="bg-black/30 rounded-xl p-4 my-3 overflow-x-auto text-sm font-mono">
          <code>{part.trim()}</code>
        </pre>
      );
    }
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
}

export default function MessageList({
  messages,
  isProcessing,
  isSending,
  messagesEndRef,
  onSpeakMessage,
  onQuickAction,
  historyTTSSpeaking,
  waveIndicatorActive,
  onStopResponse,
}: MessageListProps) {
  // Empty state
  if (messages.length === 0 && !isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-white/10 flex items-center justify-center mb-6 shadow-xl">
          <Sparkles className="w-10 h-10 text-purple-400" />
        </div>

        <h2 className="text-2xl font-medium text-white mb-3">How can I help you today?</h2>

        <p className="text-white/50 max-w-md">
          Type a message or click the microphone to speak. I'll remember our conversation context.
        </p>

        {/* Quick action suggestions */}
        <div className="flex gap-3 mt-8">
          {['What can you do?', 'Explain this code', 'Help me debug'].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => onQuickAction(suggestion)}
              className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-sm text-white/70 hover:bg-white/20 hover:text-white transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        const isError = msg.role === 'error';
        const isLast = index === messages.length - 1;
        const isMsgSending = msg.isSending && isSending;

        return (
          <div
            key={index}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} transition-all duration-300 ${
              isMsgSending ? 'opacity-70 scale-[0.98] animate-pulse' : 'animate-fade-in'
            }`}
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
              className={`max-w-[75%] px-5 py-4 leading-relaxed transition-all duration-300 ${
                isUser
                  ? `bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-3xl rounded-tr-xl shadow-lg ${
                      isMsgSending ? 'shadow-blue-400/40 animate-pulse' : 'shadow-blue-500/20'
                    }`
                  : isError
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 rounded-3xl'
                    : 'bg-white/10 backdrop-blur-xl text-white/90 rounded-3xl rounded-tl-xl border border-white/10 shadow-xl'
              }`}
            >
              <div className="text-[15px] whitespace-pre-wrap">{formatContent(msg.content)}</div>

              {/* Message actions */}
              {!isError && msg.content && msg.content.trim() && (
                <div className="flex justify-end mt-2 gap-2">
                  {isMsgSending && (
                    <span className="text-xs text-white/50 animate-pulse">发送中...</span>
                  )}
                  {/* Copy button */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                      const btn = document.getElementById(`copy-btn-${index}`);
                      if (btn) {
                        btn.classList.add('text-green-400');
                        setTimeout(() => btn.classList.remove('text-green-400'), 1500);
                      }
                    }}
                    className="p-1 rounded transition-all text-white/30 hover:text-white/60 hover:bg-white/10"
                    title="复制内容"
                    id={`copy-btn-${index}`}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {/* Speak button */}
                  <button
                    onClick={() => onSpeakMessage(msg.content)}
                    disabled={historyTTSSpeaking}
                    className={`p-1 rounded transition-all ${
                      historyTTSSpeaking
                        ? 'text-purple-400 animate-pulse'
                        : 'text-white/30 hover:text-white/60 hover:bg-white/10'
                    }`}
                    title={historyTTSSpeaking ? '正在朗读...' : '点击朗读'}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Typing indicator */}
              {isLast && !isUser && !isError && isProcessing && (
                <div className="flex gap-1 mt-2">
                  <span className="w-2 h-2 bg-white/50 rounded-full animate-pulse" />
                  <span
                    className="w-2 h-2 bg-white/50 rounded-full animate-pulse"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-white/50 rounded-full animate-pulse"
                    style={{ animationDelay: '300ms' }}
                  />
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
      })}

      {/* Wave Indicator */}
      {waveIndicatorActive && isProcessing && onStopResponse && (
        <div className="flex justify-start animate-fade-in">
          <div
            onClick={onStopResponse}
            className="flex items-center gap-1 px-4 py-2 rounded-full transition-all duration-300 cursor-pointer bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/40 hover:from-red-500/30 hover:to-orange-500/30 hover:border-red-400/40"
            title="⏹️ 点击停止响应"
          >
            <div className="flex items-center gap-[3px] h-5">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-gradient-to-t from-purple-400 to-pink-400"
                  style={{
                    height: '100%',
                    animation: `wave 1s ease-in-out infinite ${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <span className="ml-2 text-sm font-medium text-purple-300">回答中...</span>
          </div>
        </div>
      )}

      {/* Invisible scroll anchor */}
      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
}
