// src/components/chat/MessageBubble.jsx
// Single message bubble component - extracted from Chat.jsx

import React from 'react';
import { Sparkles, User, Volume2 } from 'lucide-react';

function MessageBubble({
  message,
  index,
  messagesLength,
  isProcessing,
  isSending,
  onSpeak,
  ttsSpeaking,
  formatContent
}) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  const isLast = index === messagesLength - 1;
  const isMsgSending = message.isSending && isSending;

  return (
    <div
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
        <div className="text-[15px] whitespace-pre-wrap">
          {formatContent(message.content)}
        </div>

        {/* Message actions - speak button */}
        {!isError && message.content && message.content.trim() && (
          <div className="flex justify-end mt-2 gap-2">
            {/* Sending indicator */}
            {isMsgSending && (
              <span className="text-xs text-white/50 animate-pulse">
                发送中...
              </span>
            )}
            <button
              onClick={() => onSpeak(message.content)}
              disabled={ttsSpeaking}
              className={`p-1 rounded transition-all ${
                ttsSpeaking
                  ? 'text-purple-400 animate-pulse'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/10'
              }`}
              title={ttsSpeaking ? '正在朗读...' : '点击朗读'}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        )}

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
}

export default MessageBubble;