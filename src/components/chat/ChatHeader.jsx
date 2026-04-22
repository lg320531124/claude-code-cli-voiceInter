// src/components/chat/ChatHeader.jsx
//
// Chat header component - Connection status, voice indicators, toolbar buttons

import React from 'react';
import { RefreshCw, FileText, Activity, Download, Play, MemoryStick, Terminal, Keyboard, Mic, Volume2 } from 'lucide-react';
import { SubtitlesControl } from '../RealtimeSubtitles';

function ChatHeader({
  isConnected,
  voice,
  claudeReady,
  tokenUsage,
  memoryUsage,
  messages,
  showCommandSidebar,
  showSubtitles,
  subtitlePosition,
  showSubtitleInterim,
  onNewSession,
  onShowSkillManager,
  onShowTokenStats,
  onShowExportPanel,
  onShowReplayPanel,
  onShowMemoryStats,
  onToggleCommandSidebar,
  onShowShortcutsHelp,
  onToggleSubtitles,
  onSubtitlePositionChange,
  onShowSubtitleInterimChange,
}) {
  return (
    <header className="sticky top-0 z-10 px-6 py-4 bg-slate-900/90 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Logo and Status */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-xl">
            <span className="text-2xl">AI</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Claude Voice</h1>
            <p className="text-sm text-white/50 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
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

          {/* Toolbar buttons */}
          <button onClick={onNewSession} disabled={!isConnected} className="p-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all disabled:opacity-50 group" title="开始新会话">
            <RefreshCw className="w-5 h-5 text-white/70 group-hover:text-white" />
          </button>

          <button onClick={onShowSkillManager} disabled={!isConnected} className="p-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all disabled:opacity-50 group" title="Skill 管理器">
            <FileText className="w-5 h-5 text-white/70 group-hover:text-white" />
          </button>

          <button onClick={onShowTokenStats} disabled={!isConnected} className="p-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all disabled:opacity-50 group relative" title="Token 统计">
            <Activity className="w-5 h-5 text-white/70 group-hover:text-white" />
            {tokenUsage?.cumulative?.totalCostUsd > 0 && (
              <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-green-500/80 text-xs text-white">${tokenUsage.cumulative.totalCostUsd.toFixed(4)}</span>
            )}
          </button>

          <button onClick={onShowExportPanel} disabled={messages.length === 0} className="p-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all disabled:opacity-50 group" title="导出对话">
            <Download className="w-5 h-5 text-white/70 group-hover:text-white" />
          </button>

          <button onClick={onShowReplayPanel} disabled={messages.length === 0} className="p-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all disabled:opacity-50 group" title="对话回放">
            <Play className="w-5 h-5 text-white/70 group-hover:text-white" />
          </button>

          <button onClick={onShowMemoryStats} className="p-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all group relative" title="内存统计">
            <MemoryStick className="w-5 h-5 text-white/70 group-hover:text-white" />
            {memoryUsage?.formatted && <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-green-500/80 text-xs text-white">{memoryUsage.formatted}</span>}
          </button>

          <button onClick={onToggleCommandSidebar} disabled={!isConnected} className={`p-3 rounded-2xl border transition-all disabled:opacity-50 group ${showCommandSidebar ? 'bg-purple-500/30 border-purple-500/50' : 'bg-white/10 border-white/10 hover:bg-white/20'}`} title="CLI 命令">
            <Terminal className="w-5 h-5 text-white/70 group-hover:text-white" />
          </button>

          <button onClick={onShowShortcutsHelp} className="p-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all group" title="快捷键">
            <Keyboard className="w-5 h-5 text-white/70 group-hover:text-white" />
          </button>

          <SubtitlesControl enabled={showSubtitles} onToggle={onToggleSubtitles} position={subtitlePosition} onPositionChange={onSubtitlePositionChange} showInterim={showSubtitleInterim} onShowInterimChange={onShowSubtitleInterimChange} />
        </div>
      </div>
    </header>
  );
}

export default ChatHeader;
