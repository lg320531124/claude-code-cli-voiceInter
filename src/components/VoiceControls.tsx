/**
 * VoiceControls - Voice input control buttons (Modern UI)
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
    <div className="absolute right-2 bottom-2.5 flex gap-1.5">
      {/* File Upload Button */}
      <button
        type="button"
        onClick={onFileUpload}
        disabled={isProcessing || !isConnected}
        title="上传文件"
        className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80 hover:border-white/20 disabled:opacity-30"
      >
        <Paperclip className="w-4 h-4" />
      </button>

      {/* Stop Button */}
      <button
        type="button"
        onClick={onStopAll}
        disabled={!isVoiceActive && !isProcessing}
        title="停止"
        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
          isVoiceActive || isProcessing
            ? 'bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse'
            : 'bg-white/5 border border-white/10 text-white/40 hover:bg-red-500/10 hover:text-red-400/80'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <StopCircle className="w-4 h-4" />
      </button>

      {/* Conversation Mode Button */}
      <button
        type="button"
        onClick={onConversationModeClick}
        disabled={isProcessing || !isConnected}
        title={conversationMode ? '结束对话' : '双向对话'}
        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
          conversationMode
            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
            : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <Radio className="w-4 h-4" />
      </button>

      {/* Voice Button */}
      <button
        type="button"
        onClick={onVoiceClick}
        disabled={isProcessing || !isConnected || conversationMode}
        title={!voice.isSupported ? '不支持语音' : voice.isListening ? '停止录音' : '语音输入'}
        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
          conversationMode
            ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
            : voice.isListening
              ? 'bg-gradient-to-br from-red-500 to-orange-500 border border-red-400/50 text-white shadow-lg shadow-red-500/20'
              : voice.isSpeaking
                ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 border border-violet-400/50 text-white'
                : !voice.isSupported
                  ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:bg-violet-500/10 hover:text-violet-400 hover:border-violet-500/30'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        {voice.isSpeaking ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
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