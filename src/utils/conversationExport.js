// src/utils/conversationExport.js
//
// 对话记录导出工具
// - JSON 格式导出 (完整数据)
// - Markdown 格式导出 (易读)
// - TXT 格式导出 (纯文本)
// - 时间范围筛选
// - 文件下载辅助

/**
 * 格式化日期时间
 */
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 格式化短日期
 */
function formatShortDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 过滤消息 - 按时间范围
 */
function filterByTimeRange(messages, startTime, endTime) {
  if (!startTime && !endTime) return messages;

  return messages.filter(msg => {
    const msgTime = msg.timestamp || 0;
    if (startTime && msgTime < startTime) return false;
    if (endTime && msgTime > endTime) return false;
    return true;
  });
}

/**
 * 导出为 JSON 格式
 * 包含完整的消息数据结构
 */
export function exportAsJSON(messages, options = {}) {
  const { startTime, endTime, includeMetadata = true } = options;

  const filteredMessages = filterByTimeRange(messages, startTime, endTime);

  const exportData = {
    exportInfo: includeMetadata ? {
      exportedAt: new Date().toISOString(),
      messageCount: filteredMessages.length,
      format: 'json',
      source: 'Claude Code CLI VoiceInter'
    } : undefined,
    messages: filteredMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      ...(includeMetadata && {
        id: msg.id,
        sessionId: msg.sessionId,
        model: msg.model,
        tokens: msg.tokens
      })
    }))
  };

  // 移除 undefined 属性
  if (!includeMetadata) delete exportData.exportInfo;

  return JSON.stringify(exportData, null, 2);
}

/**
 * 导出为 Markdown 格式
 * 适合阅读和文档记录
 */
export function exportAsMarkdown(messages, options = {}) {
  const { startTime, endTime, title = '对话记录' } = options;

  const filteredMessages = filterByTimeRange(messages, startTime, endTime);

  const lines = [];

  // 标题和元信息
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`> 导出时间: ${formatDateTime(Date.now())}`);
  lines.push(`> 消息数量: ${filteredMessages.length}`);
  lines.push('');

  // 消息内容
  for (const msg of filteredMessages) {
    const timeStr = msg.timestamp ? formatShortDate(msg.timestamp) : '';
    const roleLabel = msg.role === 'user' ? '👤 用户' : '🤖 Claude';

    lines.push(`### ${roleLabel} ${timeStr}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 导出为 TXT 格式
 * 简单纯文本格式
 */
export function exportAsTXT(messages, options = {}) {
  const { startTime, endTime } = options;

  const filteredMessages = filterByTimeRange(messages, startTime, endTime);

  const lines = [];

  lines.push('=== 对话记录 ===');
  lines.push(`导出时间: ${formatDateTime(Date.now())}`);
  lines.push(`消息数量: ${filteredMessages.length}`);
  lines.push('');
  lines.push('================');
  lines.push('');

  for (const msg of filteredMessages) {
    const timeStr = msg.timestamp ? formatShortDate(msg.timestamp) : '';
    const roleLabel = msg.role === 'user' ? '[用户]' : '[Claude]';

    lines.push(`${roleLabel} ${timeStr}`);
    lines.push(msg.content);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 触发文件下载
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  // 创建 Blob
  const blob = new Blob([content], { type: mimeType });

  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // 触发下载
  document.body.appendChild(link);
  link.click();

  // 清理
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出并下载 JSON 文件
 */
export function downloadAsJSON(messages, options = {}) {
  const content = exportAsJSON(messages, options);
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(content, `conversation-${timestamp}.json`, 'application/json');
}

/**
 * 导出并下载 Markdown 文件
 */
export function downloadAsMarkdown(messages, options = {}) {
  const content = exportAsMarkdown(messages, options);
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(content, `conversation-${timestamp}.md`, 'text/markdown');
}

/**
 * 导出并下载 TXT 文件
 */
export function downloadAsTXT(messages, options = {}) {
  const content = exportAsTXT(messages, options);
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(content, `conversation-${timestamp}.txt`, 'text/plain');
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(content) {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('[Export] 复制失败:', error);
    // Fallback: 使用传统方法
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (e) {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

/**
 * 获取导出预览
 */
export function getExportPreview(messages, format, options = {}) {
  // 只取前 5 条消息预览
  const previewMessages = messages.slice(-5);

  switch (format) {
    case 'json':
      return exportAsJSON(previewMessages, { ...options, includeMetadata: false });
    case 'markdown':
      return exportAsMarkdown(previewMessages, { ...options, title: '预览 (最后5条)' });
    case 'txt':
      return exportAsTXT(previewMessages, options);
    default:
      return '';
  }
}

/**
 * 导出格式选项
 */
export const EXPORT_FORMATS = [
  { id: 'json', name: 'JSON', description: '完整数据，适合导入和分析', icon: 'code' },
  { id: 'markdown', name: 'Markdown', description: '易读格式，适合文档记录', icon: 'file-text' },
  { id: 'txt', name: 'TXT', description: '纯文本，适合简单查看', icon: 'file' }
];

/**
 * 获取导出统计信息
 */
export function getExportStats(messages) {
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);

  const firstMessage = messages[0];
  const lastMessage = messages[messages.length - 1];

  return {
    totalMessages: messages.length,
    userMessages: userMessages.length,
    assistantMessages: assistantMessages.length,
    totalCharacters: totalChars,
    startTime: firstMessage?.timestamp || null,
    endTime: lastMessage?.timestamp || null,
    duration: firstMessage && lastMessage
      ? Math.round((lastMessage.timestamp - firstMessage.timestamp) / 1000 / 60)
      : 0
  };
}

export default {
  exportAsJSON,
  exportAsMarkdown,
  exportAsTXT,
  downloadAsJSON,
  downloadAsMarkdown,
  downloadAsTXT,
  downloadFile,
  copyToClipboard,
  getExportPreview,
  getExportStats,
  EXPORT_FORMATS
};