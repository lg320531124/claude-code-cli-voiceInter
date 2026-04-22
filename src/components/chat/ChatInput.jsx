// src/components/chat/ChatInput.jsx
// Input area component with voice buttons - extracted from Chat.jsx

import React from 'react';
import { Send, Mic, Volume2, Radio } from 'lucide-react';
import CommandPalette from '../CommandPalette';
import VoicePanel, { useVoicePanelRef } from '../VoicePanel';

function ChatInput({
  inputText,
  onInputChange,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onSubmit,
  isProcessing,
  isConnected,
  isSending,
  showCommandPalette,
  onCommandSelect,
  inputRef,
  // Voice
  voiceListening,
  voiceSpeaking,
  voiceSupported,
  onVoiceClick,
  // Conversation mode
  conversationMode,
  onConversationModeClick,
  onConversationUserSpeech,
  onConversationAssistantSpeech,
  onInterimTranscript,
  onVoiceCommandExecute,
  voiceInterimTranscript,
  // VoicePanel ref
  voicePanelRef
}) {
  return (
    <footer className="relative px-6 py-6">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={onSubmit} className="flex items-end gap-4">
          {/* Text Input with Voice Button inside */}
          <div className="flex-1 relative flex items-end">
            {/* Command Palette */}
            <CommandPalette
              inputText={inputText}
              onSelectCommand={onCommandSelect}
              visible={showCommandPalette}
            />

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
                inputText.trim() && !isProcessing
                  ? 'bg-white/15 border-purple-500/40 shadow-lg shadow-purple-500/10'
                  : 'bg-white/10 border-white/10 focus:border-purple-500/50 focus:bg-white/15'
              }`}
              style={{
                minHeight: '56px',
                maxHeight: '200px',
                height: 'auto'
              }}
            />

            {/* Voice Buttons - inside input on the right */}
            <div className="absolute right-3 bottom-3 flex gap-2">
              {/* Conversation Mode Button */}
              <button
                type="button"
                onClick={onConversationModeClick}
                disabled={isProcessing || !isConnected}
                title={conversationMode ? '结束对话模式' : '开始双向对话'}
                className={`h-[40px] w-[40px] rounded-xl flex items-center justify-center transition-all duration-200 border ${
                  conversationMode
                    ? 'bg-gradient-to-r from-green-500 to-teal-500 border-green-400/50 text-white shadow-lg shadow-green-500/30'
                    : 'bg-white/10 backdrop-blur-xl border-white/10 text-white/60 hover:bg-white/20 hover:text-white hover:border-white/20'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Radio className="w-5 h-5" />
              </button>

              {/* Single Voice Button */}
              <button
                type="button"
                onClick={onVoiceClick}
                disabled={isProcessing || !isConnected || conversationMode}
                title={!voiceSupported ? '⚠️ 浏览器不支持语音' : voiceListening ? '🔴 点击停止录音' : '🎤 点击开始语音输入'}
                className={`h-[40px] w-[40px] rounded-xl flex items-center justify-center transition-all duration-200 border ${
                  conversationMode
                    ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed opacity-50'
                    : voiceListening
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 border-red-400/50 text-white shadow-lg shadow-red-500/30 animate-pulse'
                    : voiceSpeaking
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400/50 text-white shadow-lg shadow-purple-500/30'
                    : !voiceSupported
                    ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-white/10 backdrop-blur-xl border-white/10 text-white/60 hover:bg-white/20 hover:text-white hover:border-white/20'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {voiceSpeaking ? (
                  <Volume2 className="w-5 h-5 animate-pulse" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Listening indicator - above the input */}
            {!conversationMode && voiceListening && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-red-500/20 backdrop-blur-xl rounded-xl border border-red-500/30">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-red-400 font-medium">
                    录音中...
                  </span>
                  {voiceInterimTranscript && (
                    <span className="text-sm text-white/80 truncate max-w-[200px]">
                      "{voiceInterimTranscript}"
                    </span>
                  )}
                  <button
                    onClick={onVoiceClick}
                    className="ml-auto text-xs text-red-400 hover:text-red-300"
                  >
                    点击停止
                  </button>
                </div>
              </div>
            )}

            {/* Conversation Mode Panel - above the input */}
            {conversationMode && (
              <div className="absolute bottom-full left-0 right-0 mb-4">
                <VoicePanel
                  ref={voicePanelRef}
                  onUserSpeech={onConversationUserSpeech}
                  onAssistantSpeech={onConversationAssistantSpeech}
                  onInterimTranscript={onInterimTranscript}
                  onCommandExecute={onVoiceCommandExecute}
                  enabled={isConnected && !isProcessing}
                  showWaveform={true}
                  autoContinue={true}
                  interruptionEnabled={true}
                />
              </div>
            )}

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
            title="发送消息给 Claude (Enter)"
            className={`h-[56px] w-[56px] rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg transition-all duration-200 disabled:opacity-50 disabled:shadow-none group ${
              isSending
                ? 'scale-95 shadow-purple-300/40 animate-pulse'
                : 'shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105'
            }`}
          >
            <Send className={`w-5 h-5 text-white group-disabled:opacity-50 transition-transform ${
              isSending ? 'animate-bounce' : ''
            }`} />
          </button>
        </form>

        {/* Hint */}
        <p className="text-center text-xs text-white/30 mt-4">
          💡 Tips: Enter 发送 | Shift+Enter 换行 | 输入 / 显示 84 命令 | ⌨️ ⌘? 快捷键 | 🎤 语音填充输入框后手动发送 | 📊 Token统计
        </p>
      </div>
    </footer>
  );
}

export default ChatInput;