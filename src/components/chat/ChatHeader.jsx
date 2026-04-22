// src/components/chat/ChatHeader.jsx
// Header section of Chat component - extracted from Chat.jsx

import React from 'react';
import {
  Sparkles,
  RefreshCw,
  FileText,
  Activity,
  Download,
  Play,
  MemoryStick,
  Terminal,
  Keyboard,
  PanelLeft,
  Mic,
  Volume2
} from 'lucide-react';
import SubtitlesControl from '../RealtimeSubtitles';

function ChatHeader({
  isConnected,
  claudeReady,
  voiceListening,
  voiceSpeaking,
  tokenUsage,
  memoryUsage,
  messagesLength,
  showConversationList,
  onToggleConversationList,
  onStartNewSession,
  onOpenSkillManager,
  onOpenTokenStats,
  onOpenExportPanel,
  onOpenReplayPanel,
  onOpenMemoryStats,
  onToggleCommandSidebar,
  showCommandSidebar,
  onOpenShortcutsHelp,
  // Subtitles control
  showSubtitles,
  onToggleSubtitles,
  subtitlePosition,
  onSubtitlePositionChange,
  showSubtitleInterim,
  onShowInterimChange
}) {
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
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30" title="Claude Code CLI VoiceInter">
          <Sparkles className="w-6 h-6 text-white" />
        </div>

        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Claude Voice</h1>
          <p className="text-sm text-white/50 flex items-center gap-2" title="WebSocket 连接状态 • Claude 会话是否就绪">
            <span className={`inline-flex items-center gap-1.5 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {isConnected ? '已连接' : '离线'}
            </span>
            {claudeReady && (
              <span className="text-white/30">•</span>
            )}
            {claudeReady && (
              <span className="text-purple-400">会话就绪</span>
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Voice status indicators */}
        {voiceListening && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 animate-pulse">
            <Mic className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">Listening...</span>
          </div>
        )}

        {voiceSpeaking && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30">
            <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-sm text-purple-400">Speaking...</span>
          </div>
        )}

        {/* New session button */}
        <button
          onClick={onStartNewSession}
          disabled={!isConnected}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
          title="🔄 开始新会话 - 清除当前对话历史，启动新的 Claude 会话"
        >
          <RefreshCw className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>

        {/* Skill Manager button */}
        <button
          onClick={onOpenSkillManager}
          disabled={!isConnected}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
          title="📄 Skill 管理器 - 导入、创建和管理 Claude Skills"
        >
          <FileText className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>

        {/* Token Stats button */}
        <button
          onClick={onOpenTokenStats}
          disabled={!isConnected}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group relative"
          title="📊 Token 统计 - 查看 API 使用量、成本和缓存效率"
        >
          <Activity className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          {tokenUsage?.cumulative?.totalCostUsd > 0 && (
            <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-green-500/80 text-xs text-white font-medium">
              ${tokenUsage.cumulative.totalCostUsd.toFixed(4)}
            </span>
          )}
        </button>

        {/* Export button */}
        <button
          onClick={onOpenExportPanel}
          disabled={messagesLength === 0}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
          title="💾 导出对话 - 下载对话记录为 JSON/Markdown/TXT"
        >
          <Download className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>

        {/* Replay button */}
        <button
          onClick={onOpenReplayPanel}
          disabled={messagesLength === 0}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
          title="🔄 对话回放 - 朗读历史对话记录"
        >
          <Play className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>

        {/* Memory Stats button */}
        <button
          onClick={onOpenMemoryStats}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 group"
          title="📊 内存统计 - 查看缓存使用情况和清理选项"
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
            showCommandSidebar
              ? 'bg-purple-500/30 border-purple-500/50'
              : 'bg-white/10 border-white/10 hover:bg-white/20'
          }`}
          title="💻 CLI 命令面板 - 可视化选择和执行所有 Claude CLI 命令"
        >
          <Terminal className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>

        {/* Keyboard Shortcuts button */}
        <button
          onClick={onOpenShortcutsHelp}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 group"
          title="⌨️ 键盘快捷键 - 显示所有可用快捷键"
        >
          <Keyboard className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </button>

        {/* Subtitles Control */}
        <SubtitlesControl
          enabled={showSubtitles}
          onToggle={onToggleSubtitles}
          position={subtitlePosition}
          onPositionChange={onSubtitlePositionChange}
          showInterim={showSubtitleInterim}
          onShowInterimChange={onShowInterimChange}
        />
      </div>
    </header>
  );
}

export default ChatHeader;