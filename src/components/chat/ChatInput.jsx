// src/components/chat/ChatInput.jsx
//
// Input area - Text input, voice buttons, send button

import React from 'react';
import { Send, Mic, Volume2, Radio } from 'lucide-react';
import CommandPalette from '../CommandPalette';

function ChatInput({
  inputText,
  isProcessing,
  isSending,
  isConnected,
  voice,
  conversationMode,
  inputRef,
  showCommandPalette,
  onInputChange,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onSubmit,
  onVoiceClick,
  onConversationModeToggle,
  onCommandSelect,
  children, // For VoicePanel and indicators
}) {
  return (
    <footer className="sticky bottom-0 z-20 px-6 py-4 bg-slate-900/90 backdrop-blur-xl border-t border-white/10">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={onSubmit} className="flex items-end gap-4">
          {/* Text Input */}
          <div className="flex-1 relative flex items-end">
            <CommandPalette inputText={inputText} onSelectCommand={onCommandSelect} visible={showCommandPalette} />

            <textarea
              ref={inputRef}
              value={inputText}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              onCompositionStart={onCompositionStart}
              onCompositionEnd={onCompositionEnd}
              placeholder="Message Claude... or type / for commands"
              disabled={isProcessing}
              rows={1}
              className={`w-full px-6 py-4 pr-14 backdrop-blur-xl border rounded-3xl text-white placeholder-white/40 focus:outline-none resize-none transition-all duration-200 disabled:opacity-50 text-[15px] ${
                inputText.trim() && !isProcessing ? 'bg-white/15 border-purple-500/40 shadow-lg shadow-purple-500/10' : 'bg-white/10 border-white/10 focus:border-purple-500/50 focus:bg-white/15'
              }`}
              style={{ minHeight: '56px', maxHeight: '200px', height: 'auto' }}
            />

            {/* Voice Buttons */}
            <div className="absolute right-3 bottom-3 flex gap-2">
              {/* Conversation Mode */}
              <button type="button" onClick={onConversationModeToggle} disabled={isProcessing || !isConnected} title={conversationMode ? '结束对话模式' : '开始双向对话'} className={`h-[40px] w-[40px] rounded-xl flex items-center justify-center transition-all duration-200 border ${
                conversationMode ? 'bg-gradient-to-r from-green-500 to-teal-500 border-green-400/50 text-white shadow-lg shadow-green-500/30' : 'bg-white/10 backdrop-blur-xl border-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              } disabled:opacity-40`}>
                <Radio className="w-5 h-5" />
              </button>

              {/* Single Voice */}
              <button type="button" onClick={onVoiceClick} disabled={isProcessing || !isConnected || conversationMode} title={!voice.isSupported ? '浏览器不支持' : voice.isListening ? '点击停止' : '语音输入'} className={`h-[40px] w-[40px] rounded-xl flex items-center justify-center transition-all duration-200 border ${
                conversationMode ? 'bg-white/5 border-white/10 text-white/30 opacity-50' :
                voice.isListening ? 'bg-gradient-to-r from-red-500 to-orange-500 border-red-400/50 text-white shadow-lg shadow-red-500/30 animate-pulse' :
                voice.isSpeaking ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400/50 text-white shadow-lg shadow-purple-500/30' :
                !voice.isSupported ? 'bg-white/5 border-white/10 text-white/30' : 'bg-white/10 backdrop-blur-xl border-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              } disabled:opacity-40`}>
                {voice.isSpeaking ? <Volume2 className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>

            {/* Children: Listening indicator, VoicePanel, Processing indicator */}
            {children}
          </div>

          {/* Send Button */}
          <button type="submit" disabled={!inputText.trim() || !isConnected || isProcessing} title="发送 (Enter)" className={`h-[56px] w-[56px] rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg transition-all duration-200 disabled:opacity-50 group ${
            isSending ? 'scale-95 shadow-purple-300/40 animate-pulse' : 'shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105'
          }`}>
            <Send className={`w-5 h-5 text-white group-disabled:opacity-50 transition-transform ${isSending ? 'animate-bounce' : ''}`} />
          </button>
        </form>

        {/* Hint */}
        <p className="text-center text-xs text-white/30 mt-4">
          Enter 发送 | Shift+Enter 换行 | 输入 / 显示命令 | 快捷键 ⌘? | 语音填充输入框后手动发送
        </p>
      </div>
    </footer>
  );
}

export default ChatInput;
