/**
 * ChatHeader - Header with status, controls, and action buttons (Modern UI)
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
  voice: { isListening: boolean; isSpeaking: boolean };
  conversationMode: boolean;
  tokenUsage: { cumulative: { totalCostUsd: number } };
  memoryUsage?: { formatted?: string };
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
    <header className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-3">
        {/* Toggle conversation list */}
        <button
          onClick={onToggleConversationList}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white"
          title={showConversationList ? '隐藏对话列表' : '显示对话列表'}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>

        <div>
          <h1 className="text-base font-semibold text-white/90">Claude Voice</h1>
          <p className="text-xs text-white/40 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`w-1 h-1 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {isConnected ? '在线' : '离线'}
            </span>
            {claudeReady && <span className="text-violet-400/60">• 就绪</span>}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Voice status */}
        {voice.isListening && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <Mic className="w-3 h-3 text-red-400" />
            <span className="text-xs text-red-400">录音中</span>
          </div>
        )}

        {voice.isSpeaking && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Volume2 className="w-3 h-3 text-violet-400 animate-pulse" />
            <span className="text-xs text-violet-400">播放中</span>
          </div>
        )}

        {/* Stop button */}
        {(isProcessing || isVoiceActive) && (
          <button
            onClick={onStopResponse}
            className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 border border-red-400/40 hover:from-red-600 hover:to-orange-600 transition-all shadow-lg shadow-red-500/20"
            title="停止"
          >
            <StopCircle className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button onClick={onNewSession} disabled={!isConnected} title="新会话"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all disabled:opacity-40">
            <RefreshCw className="w-4 h-4 text-white/60" />
          </button>
          <button onClick={onOpenTokenStats} title="Token"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
            <Activity className="w-4 h-4 text-white/60" />
          </button>
          <button onClick={onToggleCommandSidebar} title="命令"
            className={`p-2 rounded-xl transition-all ${commandSidebarOpen ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}>
            <Terminal className="w-4 h-4" />
          </button>
          <button onClick={onOpenShortcutsHelp} title="快捷键"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
            <Keyboard className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>
    </header>
  );
}