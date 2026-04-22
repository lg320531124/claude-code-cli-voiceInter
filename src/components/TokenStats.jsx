import React from 'react';
import { X, Activity, Zap, Database, DollarSign, Clock, Cpu } from 'lucide-react';

/**
 * Token Stats Component
 * Displays token consumption statistics from Claude API usage
 */
function TokenStats({ isOpen, onClose, tokenUsage }) {
  if (!isOpen) return null;

  const { session, cumulative } = tokenUsage;

  // Calculate cache efficiency
  const cacheEfficiency = cumulative.inputTokens > 0
    ? ((cumulative.cacheReadTokens / cumulative.inputTokens) * 100).toFixed(1)
    : 0;

  // Format USD with appropriate precision
  const formatCost = (cost) => {
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    if (cost < 1) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  // Format large numbers
  const formatTokens = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Model usage breakdown
  const modelUsageEntries = Object.entries(session.modelUsage || {});
  const hasModelBreakdown = modelUsageEntries.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Token Statistics</h2>
              <p className="text-sm text-white/50">API usage and cost tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Session Stats */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Current Session
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-white/50">Input Tokens</span>
                </div>
                <span className="text-xl font-semibold text-white">{formatTokens(session.inputTokens)}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-white/50">Output Tokens</span>
                </div>
                <span className="text-xl font-semibold text-white">{formatTokens(session.outputTokens)}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-white/50">Session Cost</span>
                </div>
                <span className="text-xl font-semibold text-green-400">{formatCost(session.totalCostUsd)}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-white/50">Cache Read</span>
                </div>
                <span className="text-xl font-semibold text-blue-400">{formatTokens(session.cacheReadTokens)}</span>
              </div>
            </div>
          </div>

          {/* Cumulative Stats */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Cumulative Total
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                <span className="text-xs text-white/50 block mb-1">Requests</span>
                <span className="text-lg font-semibold text-white">{cumulative.requests}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                <span className="text-xs text-white/50 block mb-1">Total Tokens</span>
                <span className="text-lg font-semibold text-white">
                  {formatTokens(cumulative.inputTokens + cumulative.outputTokens)}
                </span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                <span className="text-xs text-white/50 block mb-1">Total Cost</span>
                <span className="text-lg font-semibold text-green-400">{formatCost(cumulative.totalCostUsd)}</span>
              </div>
            </div>
          </div>

          {/* Cache Efficiency */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Cache Efficiency
            </h3>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Cache Hit Rate</span>
                <span className="text-lg font-semibold text-blue-400">{cacheEfficiency}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(cacheEfficiency, 100)}%` }}
                />
              </div>
              <p className="text-xs text-white/40 mt-2">
                {formatTokens(cumulative.cacheReadTokens)} cached tokens saved {formatCost(cumulative.cacheReadTokens * 0.000003)} in costs
              </p>
            </div>
          </div>

          {/* Model Breakdown */}
          {hasModelBreakdown && (
            <div>
              <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Model Usage
              </h3>
              <div className="space-y-2">
                {modelUsageEntries.map(([model, usage]) => (
                  <div key={model} className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white font-mono">{model}</span>
                      <span className="text-xs text-green-400">{formatCost(usage.totalCostUsd || 0)}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-white/50">
                      <span>In: {formatTokens(usage.inputTokens || 0)}</span>
                      <span>Out: {formatTokens(usage.outputTokens || 0)}</span>
                      {usage.cacheReadTokens > 0 && (
                        <span className="text-blue-400">Cache: {formatTokens(usage.cacheReadTokens)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zero state */}
          {cumulative.requests === 0 && (
            <div className="text-center py-8 text-white/50">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No token usage data yet.</p>
              <p className="text-xs mt-1">Start a conversation to track usage.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 text-xs text-white/30 flex items-center justify-between">
          <span>Updated in real-time from Claude API</span>
          <span>Cache saves ~90% on repeated context</span>
        </div>
      </div>
    </div>
  );
}

export default TokenStats;