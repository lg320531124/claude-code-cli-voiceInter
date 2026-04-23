/**
 * ChatHeader - Header with status, controls, and action buttons
 */
import React from 'react';
import {
  Sparkles,
  Mic,
  Volume2,
  RefreshCw,
  FileText,
  Activity,
  Terminal,
  Keyboard,
  Download,
  Play,
  MemoryStick,
  PanelLeft,
  StopCircle,
} from 'lucide-react';
import WaveIndicator from './WaveIndicator';

interface ChatHeaderProps {
  isConnected: boolean;
  claudeReady: boolean;
  isProcessing: boolean;
  voice: {
    isListening: boolean;
    isSpeaking: boolean;
  };
  conversationMode: boolean;
  tokenUsage: {
    cumulative: {
      totalCostUsd: number;
    };
  };
  memoryUsage?: {
    formatted?: string;
  };
  messagesLength: number;
  showConversationList: boolean;
  onToggleConversationList: () => void;
  onNewSession: () => void;
  onStopResponse: () => void;
  onOpenSkillManager: () => void;
  onOpenTokenStats: () => void;
  onOpenExport: () => void;
  onOpenReplay: () => void;
  onOpenMemoryStats: () => void;
  onToggleCommandSidebar: () => void;
  onOpenShortcutsHelp: () => void;
  commandSidebarOpen: boolean;
}

export default function ChatHeader({
  isConnected,
  claudeReady,
  isProcessing,
  voice,
  conversationMode,
  tokenUsage,
  memoryUsage,
  messagesLength,
  showConversationList,
  onToggleConversationList,
  onNewSession,
  onStopResponse,
  onOpenSkillManager,
  onOpenTokenStats,
  onOpenExport,
  onOpenReplay,
  onOpenMemoryStats,
  onToggleCommandSidebar,
  onOpenShortcutsHelp,
  commandSidebarOpen,
}: ChatHeaderProps) {
  const isVoiceActive = voice.isListening || voice.isSpeaking || conversationMode;

  return (
    <header className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center gap-4">
        {/* Toggle conversation list button */}
        <button
          onClick={onToggleConversationList}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white/70 hover:text-white"
          title={showConversationList ? '隐藏对话列表' : '显示对话列表'}
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30"
          title="Claude Code CLI VoiceInter"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </div>

        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Claude Voice</h1>
          <p
            className="text-sm text-white/50 flex items-center gap-2"
            title="WebSocket 连接状态 • Claude 会话是否就绪"
          >
            <span
              className={`inline-flex items-center gap-1.5 ${isConnected ? 'text-green-400' : 'text-red-400'}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
              />
              {isConnected ? '已连接' : '离线'}
            </span>
            {claudeReady && <span className="text-white/30">•</span>}
            {claudeReady && <span className="text-purple-400">会话就绪</span>}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Voice status indicators */}
        {voice.isListening && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 animate-pulse">
            <Mic className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">Listening...</span>
          </div>
        )}

        {voice.isSpeaking && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30">
            <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-sm text-purple-400">Speaking...</span>
          </div>
        )}

        {/* Stop button in header */}
        {(isProcessing || isVoiceActive) && (
          <button
            onClick={onStopResponse}
            className="p-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 backdrop-blur-xl border border-red-500/50 hover:from-red-600 hover:to-orange-600 transition-all duration-200 shadow-lg shadow-red-500/30 animate-pulse"
            title="⏹️ 停止 - 终止当前对话、语音输入/输出"
          >
            <StopCircle className="w-5 h-5 text-white" />
          </button>
        )}

        {/* New session button */}
        <button
          onClick={onNewSession}
          disabled={!isConnected}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
          title="🔄 开始新会话"
        >
          <RefreshCw className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>

        {/* Skill Manager button */}
        <button
          onClick={onOpenSkillManager}
          disabled={!isConnected}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
          title="📄 Skill 管理器"
        >
          <FileText className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>

        {/* Token Stats button */}
        <button
          onClick={onOpenTokenStats}
          disabled={!isConnected}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group relative"
          title="📊 Token 统计"
        >
          <Activity className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          {tokenUsage.cumulative.totalCostUsd > 0 && (
            <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-green-500/80 text-xs text-white font-medium">
              ${tokenUsage.cumulative.totalCostUsd.toFixed(4)}
            </span>
          )}
        </button>

        {/* Export button */}
        <button
          onClick={onOpenExport}
          disabled={messagesLength === 0}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
          title="💾 导出对话"
        >
          <Download className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>

        {/* Replay button */}
        <button
          onClick={onOpenReplay}
          disabled={messagesLength === 0}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
          title="🔄 对话回放"
        >
          <Play className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>

        {/* Memory Stats button */}
        <button
          onClick={onOpenMemoryStats}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 group"
          title="📊 内存统计"
        >
          <MemoryStick className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          {memoryUsage && memoryUsage.formatted && (
            <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-green-500/80 text-xs text-white font-medium">
              {memoryUsage.formatted}
            </span>
          )}
        </button>

        {/* CLI Commands button */}
        <button
          onClick={onToggleCommandSidebar}
          disabled={!isConnected}
          className={`p-3 rounded-2xl backdrop-blur-xl border transition-all duration-200 disabled:opacity-50 group ${
            commandSidebarOpen
              ? 'bg-purple-500/30 border-purple-500/50'
              : 'bg-white/10 border-white/10 hover:bg-white/20'
          }`}
          title="💻 CLI 命令面板"
        >
          <Terminal className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>

        {/* Keyboard Shortcuts button */}
        <button
          onClick={onOpenShortcutsHelp}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 group"
          title="⌨️ 键盘快捷键"
        >
          <Keyboard className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>
      </div>
    </header>
  );
}
