/**
 * VoiceControls - Simplified voice input control (Modern UI)
 * Merges: Stop + Conversation Mode + Voice Input into one smart button
 */
import React from 'react';
import { Mic, StopCircle, Radio } from 'lucide-react';

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
  // Determine current state (exclude conversationMode from active state)
  const isActive = voice.isListening || voice.isSpeaking || isProcessing;

  // Smart button click handler
  const handleMainClick = () => {
    if (isActive) {
      // In active state, stop everything
      onStopAll();
    } else if (conversationMode) {
      // End conversation mode
      onConversationModeClick();
    } else {
      // Start voice input
      onVoiceClick();
    }
  };

  // Determine icon and title
  let Icon: React.ReactNode;
  let title: string;
  let buttonClass: string;

  if (isActive) {
    // Active (listening/speaking/processing): show stop
    Icon = <StopCircle className="w-4 h-4" />;
    title = '停止';
    buttonClass = 'bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse';
  } else if (conversationMode) {
    // Conversation mode active (idle, waiting for voice input)
    Icon = <Radio className="w-4 h-4" />;
    title = '结束对话';
    buttonClass = 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400';
  } else if (!voice.isSupported) {
    // Not supported
    Icon = <Mic className="w-4 h-4" />;
    title = '不支持语音';
    buttonClass = 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed';
  } else {
    // Idle: ready to record
    Icon = <Mic className="w-4 h-4" />;
    title = '语音输入 (长按开启对话模式)';
    buttonClass =
      'bg-white/5 border border-white/10 text-white/50 hover:bg-violet-500/10 hover:text-violet-400 hover:border-violet-500/30';
  }

  return (
    <div className="absolute right-2 bottom-2.5 flex gap-1.5">
      {/* File Upload Button */}
      <button
        type="button"
        onClick={onFileUpload}
        disabled={isProcessing || !isConnected}
        title="上传文件"
        aria-label="上传文件"
        className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80 hover:border-white/20 disabled:opacity-30"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      </button>

      {/* Unified Voice/Stop Button */}
      <button
        type="button"
        onClick={handleMainClick}
        disabled={(!voice.isSupported && !isActive) || (!isConnected && !isActive)}
        title={title}
        aria-label={title}
        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 ${buttonClass} disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        {Icon}
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
