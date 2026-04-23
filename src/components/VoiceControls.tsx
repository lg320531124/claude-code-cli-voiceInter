/**
 * VoiceControls - Voice input control buttons
 */
import React from 'react';
import { Mic, Volume2, Radio, StopCircle, Paperclip } from 'lucide-react';

interface VoiceControlsProps {
  voice: {
    isSupported: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    stopListening?: () => void;
    stopSpeaking?: () => void;
  };
  conversationMode: boolean;
  isProcessing: boolean;
  isConnected: boolean;
  onVoiceClick: () => void;
  onConversationModeClick: () => void;
  onStopAll: () => void;
  onFileUpload: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export default function VoiceControls({
  voice,
  conversationMode,
  isProcessing,
  isConnected,
  onVoiceClick,
  onConversationModeClick,
  onStopAll,
  onFileUpload,
  fileInputRef,
}: VoiceControlsProps) {
  const isVoiceActive = voice.isListening || voice.isSpeaking || conversationMode;

  return (
    <div className="absolute right-3 bottom-3 flex gap-2">
      {/* File Upload Button */}
      <button
        type="button"
        onClick={onFileUpload}
        disabled={isProcessing || !isConnected}
        title="📎 上传文件/图片"
        className="h-[40px] w-[40px] rounded-xl flex items-center justify-center transition-all duration-200 border bg-white/10 backdrop-blur-xl border-white/10 text-white/60 hover:bg-white/20 hover:text-white hover:border-white/20 disabled:opacity-40"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      {/* Stop Button - always visible */}
      <button
        type="button"
        onClick={onStopAll}
        disabled={!isVoiceActive && !isProcessing}
        title="⏹️ 停止 - 终止语音输入/输出、对话模式、响应生成"
        className={`h-[40px] w-[40px] rounded-xl flex items-center justify-center transition-all duration-200 border ${
          isVoiceActive || isProcessing
            ? 'bg-gradient-to-r from-red-500 to-orange-500 border-red-400/50 text-white shadow-lg shadow-red-500/30 animate-pulse'
            : 'bg-white/10 backdrop-blur-xl border-white/10 text-white/40 hover:bg-red-500/20 hover:text-red-400 hover:border-red-400/30'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <StopCircle className="w-5 h-5" />
      </button>

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

      {/* Voice Button */}
      <button
        type="button"
        onClick={onVoiceClick}
        disabled={isProcessing || !isConnected || conversationMode}
        title={
          !voice.isSupported
            ? '⚠️ 浏览器不支持语音'
            : voice.isListening
              ? '🔴 点击停止录音'
              : '🎤 点击开始语音输入'
        }
        className={`h-[40px] w-[40px] rounded-xl flex items-center justify-center transition-all duration-200 border ${
          conversationMode
            ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed opacity-50'
            : voice.isListening
              ? 'bg-gradient-to-r from-red-500 to-orange-500 border-red-400/50 text-white shadow-lg shadow-red-500/30 animate-pulse'
              : voice.isSpeaking
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400/50 text-white shadow-lg shadow-purple-500/30'
                : !voice.isSupported
                  ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-white/10 backdrop-blur-xl border-white/10 text-white/60 hover:bg-white/20 hover:text-white hover:border-white/20'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {voice.isSpeaking ? (
          <Volume2 className="w-5 h-5 animate-pulse" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.java,.go,.rs,.c,.cpp,.yaml,.yml,.pdf,.csv"
        className="hidden"
      />
    </div>
  );
}
