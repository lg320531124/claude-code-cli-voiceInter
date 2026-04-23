/**
 * ChatModals - Aggregates all modal components
 */
import React, { lazy, Suspense } from 'react';

// Lazy load modal components
const SkillManager = lazy(() => import('./SkillManager'));
const TokenStats = lazy(() => import('./TokenStats'));
const CommandSidebar = lazy(() => import('./CommandSidebar'));
const ShortcutsHelp = lazy(() => import('./ShortcutsHelp'));
const ExportPanel = lazy(() => import('./ExportPanel'));
const ConversationReplay = lazy(() => import('./ConversationReplay'));
const MemoryStats = lazy(() => import('./MemoryStats'));

interface TokenUsageData {
  session: {
    inputTokens: number;
    outputTokens: number;
    totalCostUsd: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    modelUsage: Record<string, number>;
    apiCallCount: number;
  };
  cumulative: {
    inputTokens: number;
    outputTokens: number;
    totalCostUsd: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    requests: number;
    apiCallCount: number;
  };
}

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  isStreaming?: boolean;
  isSending?: boolean;
}

interface ChatModalsProps {
  showSkillManager: boolean;
  setShowSkillManager: (show: boolean) => void;
  showTokenStats: boolean;
  setShowTokenStats: (show: boolean) => void;
  showCommandSidebar: boolean;
  setShowCommandSidebar: (show: boolean) => void;
  showShortcutsHelp: boolean;
  setShowShortcutsHelp: (show: boolean) => void;
  showExportPanel: boolean;
  setShowExportPanel: (show: boolean) => void;
  showReplayPanel: boolean;
  setShowReplayPanel: (show: boolean) => void;
  showMemoryStats: boolean;
  setShowMemoryStats: (show: boolean) => void;
  tokenUsage: TokenUsageData;
  messages: Message[];
  onCommandSelect: (command: { action: string; name: string; hasInput?: boolean }) => void;
}

export default function ChatModals({
  showSkillManager,
  setShowSkillManager,
  showTokenStats,
  setShowTokenStats,
  showCommandSidebar,
  setShowCommandSidebar,
  showShortcutsHelp,
  setShowShortcutsHelp,
  showExportPanel,
  setShowExportPanel,
  showReplayPanel,
  setShowReplayPanel,
  showMemoryStats,
  setShowMemoryStats,
  tokenUsage,
  messages,
  onCommandSelect,
}: ChatModalsProps) {
  return (
    <>
      {/* Skill Manager */}
      <Suspense fallback={null}>
        <SkillManager isOpen={showSkillManager} onClose={() => setShowSkillManager(false)} />
      </Suspense>

      {/* Token Stats */}
      <Suspense fallback={null}>
        <TokenStats
          isOpen={showTokenStats}
          onClose={() => setShowTokenStats(false)}
          tokenUsage={tokenUsage}
        />
      </Suspense>

      {/* Export Panel */}
      {showExportPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Suspense fallback={<div className="text-white">Loading...</div>}>
            <ExportPanel messages={messages} onClose={() => setShowExportPanel(false)} />
          </Suspense>
        </div>
      )}

      {/* Conversation Replay */}
      <Suspense fallback={null}>
        <ConversationReplay
          messages={messages}
          isOpen={showReplayPanel}
          onClose={() => setShowReplayPanel(false)}
        />
      </Suspense>

      {/* Memory Stats */}
      <Suspense fallback={null}>
        <MemoryStats isOpen={showMemoryStats} onClose={() => setShowMemoryStats(false)} />
      </Suspense>

      {/* Command Sidebar */}
      <Suspense fallback={null}>
        <CommandSidebar
          isOpen={showCommandSidebar}
          onClose={() => setShowCommandSidebar(false)}
          onCommandSelect={onCommandSelect}
        />
      </Suspense>

      {/* Shortcuts Help */}
      <Suspense fallback={null}>
        <ShortcutsHelp isOpen={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />
      </Suspense>
    </>
  );
}
