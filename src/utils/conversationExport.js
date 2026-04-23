/**
 * conversationExport - Export conversations to various formats
 */

export const EXPORT_FORMATS = ['json', 'markdown', 'text'];

export function exportToJson(conversations, filename = 'conversations.json') {
  const json = JSON.stringify(conversations, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function exportToMarkdown(conversations, filename = 'conversations.md') {
  let markdown = '# Conversation Export\n\n';

  conversations.forEach(conv => {
    markdown += `## ${conv.title || 'Conversation'}\n\n`;
    markdown += `**Created:** ${conv.createdAt}\n\n`;

    conv.messages.forEach(msg => {
      const role = msg.role === 'user' ? '**User**' : '**Claude**';
      markdown += `${role}: ${msg.content}\n\n`;
    });

    markdown += '---\n\n';
  });

  const blob = new Blob([markdown], { type: 'text/markdown' });
  downloadBlob(blob, filename);
}

export function exportToText(conversations, filename = 'conversations.txt') {
  let text = 'Conversation Export\n\n';

  conversations.forEach(conv => {
    text += `${conv.title || 'Conversation'}\n`;
    text += `Created: ${conv.createdAt}\n\n`;

    conv.messages.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : 'Claude';
      text += `${role}: ${msg.content}\n\n`;
    });

    text += '---\n\n';
  });

  const blob = new Blob([text], { type: 'text/plain' });
  downloadBlob(blob, filename);
}

export function getExportStats(conversations) {
  const totalConversations = conversations.length;
  const totalMessages = conversations.reduce((sum, conv) => sum + (conv.messages?.length || 0), 0);
  const totalSize = JSON.stringify(conversations).length;

  return {
    totalConversations,
    totalMessages,
    totalSize,
    formattedSize: formatBytes(totalSize),
  };
}

export function getExportPreview(conversations, format = 'markdown', maxLength = 500) {
  let preview = '';

  if (format === 'json') {
    preview = JSON.stringify(conversations.slice(0, 2), null, 2);
  } else if (format === 'markdown') {
    preview = exportToMarkdownString(conversations.slice(0, 2));
  } else {
    preview = exportToTextString(conversations.slice(0, 2));
  }

  if (preview.length > maxLength) {
    preview = preview.slice(0, maxLength) + '...';
  }

  return preview;
}

export function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  // Fallback for older browsers
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  return Promise.resolve();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToMarkdownString(conversations) {
  let markdown = '# Conversation Export\n\n';

  conversations.forEach(conv => {
    markdown += `## ${conv.title || 'Conversation'}\n\n`;
    markdown += `**Created:** ${conv.createdAt}\n\n`;

    conv.messages?.forEach(msg => {
      const role = msg.role === 'user' ? '**User**' : '**Claude**';
      markdown += `${role}: ${msg.content}\n\n`;
    });

    markdown += '---\n\n';
  });

  return markdown;
}

function exportToTextString(conversations) {
  let text = 'Conversation Export\n\n';

  conversations.forEach(conv => {
    text += `${conv.title || 'Conversation'}\n`;
    text += `Created: ${conv.createdAt}\n\n`;

    conv.messages?.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : 'Claude';
      text += `${role}: ${msg.content}\n\n`;
    });

    text += '---\n\n';
  });

  return text;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Alias exports for backward compatibility
export { exportToJson as exportAsJSON };
export { exportToJson as downloadAsJSON };
export { exportToMarkdown as exportAsMarkdown };
export { exportToMarkdown as downloadAsMarkdown };
export { exportToText as exportAsTXT };
export { exportToText as downloadAsTXT };
