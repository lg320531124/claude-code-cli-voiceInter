/**
 * ChatInput - Input area with textarea, attachments, and voice controls
 */
import React, { useState, useRef } from 'react';
import { Send, FileText, X } from 'lucide-react';
import VoiceControls from './VoiceControls';
import CommandPalette from './CommandPalette';

interface Attachment {
  id: number;
  name: string;
  type: string;
  size: number;
  content: string;
  isImage: boolean;
}

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  isStreaming?: boolean;
  isSending?: boolean;
  attachments?: Attachment[];
}

interface VoiceData {
  isSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isInitialized: boolean;
  interimTranscript?: string;
  stopListening?: () => void;
  stopSpeaking?: () => void;
}

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  isConnected: boolean;
  isProcessing: boolean;
  isSending: boolean;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  voice: VoiceData;
  conversationMode: boolean;
  showCommandPalette: boolean;
  setShowCommandPalette: (show: boolean) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onVoiceClick: () => void;
  onConversationModeClick: () => void;
  onStopAll: () => void;
  onCommandSelect: (command: { action: string; name: string; hasInput?: boolean }) => void;
  sendMessage: (msg: { type: string; command?: string }) => void;
  handleCompositionStart: () => void;
  handleCompositionEnd: () => void;
}

export default function ChatInput({
  inputText,
  setInputText,
  inputRef,
  isConnected,
  isProcessing,
  isSending,
  attachments,
  setAttachments,
  voice,
  conversationMode,
  showCommandPalette,
  setShowCommandPalette,
  onSubmit,
  onVoiceClick,
  onConversationModeClick,
  onStopAll,
  onCommandSelect,
  sendMessage,
  handleCompositionStart,
  handleCompositionEnd,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) return false;
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'text/markdown',
        'application/json',
        'text/csv',
      ];
      const allowedExtensions = [
        '.js',
        '.jsx',
        '.ts',
        '.tsx',
        '.py',
        '.java',
        '.go',
        '.rs',
        '.c',
        '.cpp',
        '.md',
        '.txt',
        '.json',
        '.yaml',
        '.yml',
      ];
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      return allowedTypes.includes(file.type) || allowedExtensions.includes(ext);
    });

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const attachment: Attachment = {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          content: e.target?.result as string,
          isImage: file.type.startsWith('image/'),
        };
        setAttachments(prev => [...prev, attachment]);
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const removeAttachment = (id: number) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);
    setShowCommandPalette(value.startsWith('/'));
  };

  return (
    <footer className="sticky bottom-0 z-20 px-4 py-3 bg-slate-950/90 backdrop-blur-xl border-t border-white/5">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={onSubmit} className="flex items-end gap-3">
          <div className="flex-1 relative flex items-end">
            {/* Command Palette */}
            <CommandPalette
              inputText={inputText}
              onSelectCommand={onCommandSelect}
              visible={showCommandPalette}
            />

            {/* Attachment Preview */}
            {attachments.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 flex gap-2 p-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-x-auto max-w-full">
                {attachments.map(attachment => (
                  <div key={attachment.id} className="relative flex-shrink-0 group">
                    {attachment.isImage ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10">
                        <img
                          src={attachment.content}
                          alt={attachment.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center p-2">
                        <FileText className="w-5 h-5 text-white/50" />
                      </div>
                    )}
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Listening indicator */}
            {!conversationMode && voice.isListening && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-xl rounded-xl border border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <span
                      className="w-1 h-4 rounded-full bg-red-500 animate-pulse"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1 h-4 rounded-full bg-red-500 animate-pulse"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1 h-4 rounded-full bg-red-500 animate-pulse"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                  <span className="text-sm text-red-400 font-medium">录音中...</span>
                  {voice.interimTranscript && (
                    <span className="text-sm text-white/70 truncate max-w-[200px]">
                      "{voice.interimTranscript}"
                    </span>
                  )}
                  <button
                    onClick={onVoiceClick}
                    className="ml-auto text-xs text-red-400/70 hover:text-red-400"
                  >
                    停止
                  </button>
                </div>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder={attachments.length > 0 ? '添加描述...' : 'Message Claude...'}
              disabled={isProcessing}
              rows={1}
              className={`w-full px-5 py-3.5 pr-12 backdrop-blur-xl border rounded-2xl text-white/95 placeholder-white/30 focus:outline-none resize-none transition-all duration-200 disabled:opacity-50 text-sm ${
                attachments.length > 0
                  ? 'border-violet-500/30 bg-violet-500/5'
                  : inputText.trim() && !isProcessing
                    ? 'bg-white/8 border-violet-500/20'
                    : 'bg-white/5 border-white/10 focus:border-violet-500/30 focus:bg-white/8'
              }`}
              style={{ minHeight: '56px', maxHeight: '200px', height: 'auto' }}
            />

            {/* Voice Controls */}
            <VoiceControls
              voice={voice}
              conversationMode={conversationMode}
              isProcessing={isProcessing}
              isConnected={isConnected}
              onVoiceClick={onVoiceClick}
              onConversationModeClick={onConversationModeClick}
              onStopAll={onStopAll}
              onFileUpload={openFileDialog}
              fileInputRef={fileInputRef}
            />

            {/* Processing indicator */}
            {isProcessing && (
              <div className="absolute right-16 bottom-3">
                <div className="flex gap-1">
                  <span
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
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
            <Send
              className={`w-5 h-5 text-white group-disabled:opacity-50 transition-transform ${
                isSending ? 'animate-bounce' : ''
              }`}
            />
          </button>
        </form>

        {/* Hint */}
        <p className="text-center text-xs text-white/30 mt-4">
          💡 Tips: Enter 发送 | Shift+Enter 换行 | 输入 / 显示命令 | ⌨️ ⌘? 快捷键 | 🎤
          语音填充输入框后手动发送
        </p>
      </div>
    </footer>
  );
}
