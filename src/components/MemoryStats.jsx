// src/components/MemoryStats.jsx
//
// 内存使用统计组件
// - 显示各类缓存大小
// - 内存警告指示
// - 清理操作按钮
// - 详细使用报告

import React, { useState, useEffect, useCallback } from 'react';
import { MemoryStick, Trash2, AlertTriangle, CheckCircle, RefreshCw, X } from 'lucide-react';
import memoryMonitor from '../utils/memoryMonitor';

function MemoryStats({ isOpen, onClose }) {
  const [report, setReport] = useState(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResults, setCleanupResults] = useState(null);

  // 监听内存变化
  useEffect(() => {
    if (!isOpen) return;

    // 启动监控
    memoryMonitor.start();

    // 添加监听器
    const unsubscribe = memoryMonitor.addListener((event) => {
      if (event.type === 'update' || event.type === 'cleanup') {
        setReport(memoryMonitor.getReport());
      }
      if (event.type === 'alert') {
        setReport(memoryMonitor.getReport());
      }
    });

    // 初始获取报告
    setReport(memoryMonitor.getReport());

    return () => {
      unsubscribe();
      memoryMonitor.stop();
    };
  }, [isOpen]);

  // 执行清理
  const handleCleanup = useCallback(async (options) => {
    setIsCleaning(true);
    setCleanupResults(null);

    try {
      const results = await memoryMonitor.cleanup(options);
      setCleanupResults(results);
    } catch (e) {
      setCleanupResults({ error: e.message });
    }

    setIsCleaning(false);
  }, []);

  // 关闭面板
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  if (!isOpen) return null;

  // 获取级别颜色
  const getLevelColor = (level) => {
    switch (level) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-green-400 bg-green-500/20 border-green-500/30';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MemoryStick className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-medium text-white">内存使用统计</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 总使用量和状态 */}
        {report && (
          <div className={`mb-4 p-4 rounded-xl border flex items-center gap-3 ${getLevelColor(report.level)}`}>
            {getLevelIcon(report.level)}
            <div>
              <div className="text-sm font-medium">
                内存使用: {report.total.formatted}
              </div>
              <div className="text-xs opacity-70">
                状态: {report.level === 'normal' ? '正常' : report.level === 'warning' ? '警告' : '临界'}
              </div>
            </div>
          </div>
        )}

        {/* 详细指标 */}
        {report && report.metrics && (
          <div className="space-y-2 mb-4">
            <h3 className="text-sm text-gray-400 mb-2">详细使用情况</h3>

            {/* TTS 内存缓存 */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800">
              <span className="text-sm text-gray-300">TTS 内存缓存</span>
              <span className="text-sm text-purple-400">
                {report.metrics.formatted.ttsCacheMemory}
              </span>
            </div>

            {/* TTS IndexedDB 缓存 */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800">
              <span className="text-sm text-gray-300">TTS IndexedDB 缓存</span>
              <span className="text-sm text-pink-400">
                {report.metrics.formatted.ttsCacheIndexedDB}
              </span>
            </div>

            {/* 消息缓存 */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800">
              <span className="text-sm text-gray-300">消息缓存</span>
              <span className="text-sm text-blue-400">
                {report.metrics.formatted.messageCache}
              </span>
            </div>

            {/* 音频缓冲区 */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800">
              <span className="text-sm text-gray-300">音频缓冲区</span>
              <span className="text-sm text-green-400">
                {report.metrics.formatted.audioBuffers}
              </span>
            </div>
          </div>
        )}

        {/* 清理建议 */}
        {report && report.suggestions && report.suggestions.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <h3 className="text-sm text-yellow-400 mb-2">清理建议</h3>
            <ul className="space-y-1">
              {report.suggestions.map((suggestion, index) => (
                <li key={index} className="text-xs text-gray-300 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-yellow-400" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 清理操作 */}
        <div className="space-y-2 mb-4">
          <h3 className="text-sm text-gray-400 mb-2">清理操作</h3>

          <div className="flex gap-2">
            {/* 清理 TTS 缓存 */}
            <button
              onClick={() => handleCleanup({ ttsCache: true })}
              disabled={isCleaning}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                isCleaning
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30'
              }`}
            >
              {isCleaning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              清理 TTS 缓存
            </button>

            {/* 清理消息缓存 */}
            <button
              onClick={() => handleCleanup({ messageCache: true })}
              disabled={isCleaning}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                isCleaning
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
              }`}
            >
              {isCleaning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              清理消息缓存
            </button>
          </div>

          {/* 全部清理 */}
          <button
            onClick={() => handleCleanup({ ttsCache: true, messageCache: true })}
            disabled={isCleaning}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
              isCleaning
                ? 'bg-gray-700 text-gray-400'
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
            }`}
          >
            {isCleaning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            清理全部缓存
          </button>
        </div>

        {/* 清理结果 */}
        {cleanupResults && (
          <div className="mb-4 p-3 rounded-lg bg-gray-800 border border-gray-700">
            <h3 className="text-sm text-gray-300 mb-2">清理结果</h3>
            {cleanupResults.error ? (
              <p className="text-xs text-red-400">{cleanupResults.error}</p>
            ) : (
              <ul className="space-y-1">
                {Object.entries(cleanupResults).map(([key, value]) => (
                  <li key={key} className="text-xs text-green-400">
                    {key}: {value}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 阈值信息 */}
        {report && report.thresholds && (
          <div className="text-xs text-gray-500 text-center">
            警告阈值: {report.thresholds.warning} | 临界阈值: {report.thresholds.critical}
          </div>
        )}

        {/* 提示 */}
        <p className="text-xs text-gray-500 text-center mt-2">
          💡 定期清理缓存可保持应用流畅运行
        </p>
      </div>
    </div>
  );
}

// 内存统计按钮 (用于触发打开面板)
export function MemoryStatsButton({ onClick, disabled, usage }) {
  const getLevel = () => {
    if (!usage) return 'normal';
    const bytes = usage.bytes || 0;
    if (bytes > 100 * 1024 * 1024) return 'critical';
    if (bytes > 50 * 1024 * 1024) return 'warning';
    return 'normal';
  };

  const level = getLevel();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-3 rounded-2xl backdrop-blur-xl border transition-all duration-200 disabled:opacity-50 group relative ${
        level === 'critical'
          ? 'bg-red-500/20 border-red-500/30'
          : level === 'warning'
          ? 'bg-yellow-500/20 border-yellow-500/30'
          : 'bg-white/10 border-white/10 hover:bg-white/20'
      }`}
      title="📊 内存统计 - 查看缓存使用情况和清理选项"
    >
      <MemoryStick className={`w-5 h-5 ${
        level === 'critical'
          ? 'text-red-400'
          : level === 'warning'
          ? 'text-yellow-400'
          : 'text-white/70 group-hover:text-white'
      } transition-colors`} />
      {usage && usage.formatted && (
        <span className={`absolute -top-1 -right-1 px-2 py-0.5 rounded-full text-xs text-white font-medium ${
          level === 'critical'
            ? 'bg-red-500/80'
            : level === 'warning'
            ? 'bg-yellow-500/80'
            : 'bg-green-500/80'
        }`}>
          {usage.formatted}
        </span>
      )}
    </button>
  );
}

export default MemoryStats;