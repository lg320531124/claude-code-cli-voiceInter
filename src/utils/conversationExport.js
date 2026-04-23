/**
 * conversationExport - Export conversations to various formats
 */

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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}