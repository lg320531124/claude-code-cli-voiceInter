// src/components/ExportPanel.jsx
//
// 对话导出面板
// - 格式选择 (JSON/Markdown/TXT)
// - 预览功能
// - 统计信息显示
// - 导出按钮

import React, { useState, useEffect } from 'react';
import { Download, FileText, Code, File, Copy, X, Clock, MessageSquare, BarChart3 } from 'lucide-react';
import {
  exportAsJSON,
  exportAsMarkdown,
  exportAsTXT,
  downloadAsJSON,
  downloadAsMarkdown,
  downloadAsTXT,
  copyToClipboard,
  getExportPreview,
  getExportStats,
  EXPORT_FORMATS
} from '../utils/conversationExport';

function ExportPanel({ messages, onClose }) {
  const [format, setFormat] = useState('markdown');
  const [preview, setPreview] = useState('');
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);

  // 计算统计信息
  useEffect(() => {
    if (messages && messages.length > 0) {
      setStats(getExportStats(messages));
    }
  }, [messages]);

  // 生成预览
  useEffect(() => {
    if (messages && messages.length > 0) {
      setPreview(getExportPreview(messages, format));
    }
  }, [messages, format]);

  // 格式图标
  const FormatIcon = ({ type }) => {
    switch (type) {
      case 'json': return <Code className="w-4 h-4" />;
      case 'markdown': return <FileText className="w-4 h-4" />;
      case 'txt': return <File className="w-4 h-4" />;
      default: return <File className="w-4 h-4" />;
    }
  };

  // 导出下载
  const handleExport = () => {
    switch (format) {
      case 'json':
        downloadAsJSON(messages);
        break;
      case 'markdown':
        downloadAsMarkdown(messages);
        break;
      case 'txt':
        downloadAsTXT(messages);
        break;
    }
  };

  // 复制到剪贴板
  const handleCopy = async () => {
    let content;
    switch (format) {
      case 'json':
        content = exportAsJSON(messages);
        break;
      case 'markdown':
        content = exportAsMarkdown(messages);
        break;
      case 'txt':
        content = exportAsTXT(messages);
        break;
    }

    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gray-800/95 rounded-lg p-4 border border-gray-700 shadow-xl max-w-md">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Download className="w-5 h-5 text-purple-400" />
          导出对话记录
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300">
                {stats.totalMessages} 条消息
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300">
                {stats.totalCharacters} 字符
              </span>
            </div>
            {stats.duration > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">
                  {stats.duration} 分钟
                </span>
              </div>
            )}
            <div className="text-gray-400">
              用户: {stats.userMessages} / Claude: {stats.assistantMessages}
            </div>
          </div>
        </div>
      )}

      {/* 格式选择 */}
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-2">选择导出格式</div>
        <div className="flex gap-2">
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all flex flex-col items-center gap-1 ${
                format === f.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FormatIcon type={f.id} />
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 格式说明 */}
      <div className="text-xs text-gray-400 mb-4">
        {EXPORT_FORMATS.find(f => f.id === format)?.description}
      </div>

      {/* 预览 */}
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-2">预览 (最后5条)</div>
        <div className="bg-gray-900/50 rounded-lg p-3 text-xs text-gray-300 max-h-32 overflow-auto whitespace-pre-wrap">
          {preview || '暂无消息'}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={!messages || messages.length === 0}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            messages && messages.length > 0
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          下载文件
        </button>
        <button
          onClick={handleCopy}
          disabled={!messages || messages.length === 0}
          className={`py-2 px-4 rounded-lg text-sm transition-all flex items-center gap-2 ${
            messages && messages.length > 0
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Copy className="w-4 h-4" />
          {copied ? '已复制' : '复制'}
        </button>
      </div>
    </div>
  );
}

export default ExportPanel;