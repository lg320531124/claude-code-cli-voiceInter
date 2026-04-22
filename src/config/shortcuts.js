/**
 * Keyboard Shortcuts Configuration
 * Global shortcuts for Claude Code CLI VoiceInter
 */

export const shortcuts = [
  {
    key: 'Ctrl+N',
    mac: '⌘N',
    description: '新建会话',
    action: 'new-session',
    category: 'Session'
  },
  {
    key: 'Ctrl+L',
    mac: '⌘L',
    description: '清空消息',
    action: 'clear-messages',
    category: 'Session'
  },
  {
    key: 'Ctrl+S',
    mac: '⌘S',
    description: '导出聊天',
    action: 'export-chat',
    category: 'Session'
  },
  {
    key: 'Ctrl+/',
    mac: '⌘/',
    description: '打开命令面板',
    action: 'toggle-command-sidebar',
    category: 'Commands'
  },
  {
    key: 'Ctrl+K',
    mac: '⌘K',
    description: '打开 Skill 管理器',
    action: 'open-skill-manager',
    category: 'Commands'
  },
  {
    key: 'Ctrl+T',
    mac: '⌘T',
    description: '查看 Token 统计',
    action: 'open-token-stats',
    category: 'Stats'
  },
  {
    key: 'Ctrl+M',
    mac: '⌘M',
    description: '切换模型',
    action: 'toggle-model',
    category: 'Model'
  },
  {
    key: 'Ctrl+F',
    mac: '⌘F',
    description: '切换 Fast 模式',
    action: 'toggle-fast-mode',
    category: 'Model'
  },
  {
    key: 'Ctrl+E',
    mac: '⌘E',
    description: '切换 Effort 级别',
    action: 'toggle-effort',
    category: 'Model'
  },
  {
    key: 'Ctrl+R',
    mac: '⌘R',
    description: '重新加载',
    action: 'reload',
    category: 'System'
  },
  {
    key: 'Ctrl+?',
    mac: '⌘?',
    description: '显示帮助',
    action: 'show-help',
    category: 'Help'
  },
  {
    key: 'Ctrl+.',
    mac: '⌘.',
    description: '切换侧边栏',
    action: 'toggle-sidebar',
    category: 'UI'
  },
  {
    key: 'Ctrl+P',
    mac: '⌘P',
    description: '切换紧凑模式',
    action: 'toggle-compact-mode',
    category: 'UI'
  },
  {
    key: 'Esc',
    mac: 'Esc',
    description: '关闭面板/取消',
    action: 'escape',
    category: 'System'
  },
  {
    key: 'Shift+Enter',
    mac: 'Shift↵',
    description: '换行（不发送）',
    action: 'newline',
    category: 'Input'
  },
  {
    key: 'Enter',
    mac: '↵',
    description: '发送消息',
    action: 'send',
    category: 'Input'
  },
  {
    key: '↑',
    mac: '↑',
    description: '上一条历史消息',
    action: 'history-up',
    category: 'History'
  },
  {
    key: '↓',
    mac: '↓',
    description: '下一条历史消息',
    action: 'history-down',
    category: 'History'
  },
  // Voice shortcuts
  {
    key: 'Ctrl+V',
    mac: '⌘V',
    description: '启动/停止语音输入',
    action: 'toggle-voice-input',
    category: 'Voice'
  },
  {
    key: 'Ctrl+Shift+V',
    mac: '⌘⇧V',
    description: '启动/停止双向对话模式',
    action: 'toggle-conversation-mode',
    category: 'Voice'
  },
  {
    key: 'Ctrl+Space',
    mac: '⌘Space',
    description: '快速启动语音对话',
    action: 'quick-voice-start',
    category: 'Voice'
  },
  {
    key: 'Ctrl+Shift+S',
    mac: '⌘⇧S',
    description: '停止当前语音/TTS',
    action: 'stop-voice-all',
    category: 'Voice'
  },
];

// Group shortcuts by category
export const shortcutCategories = shortcuts.reduce((acc, shortcut) => {
  if (!acc[shortcut.category]) {
    acc[shortcut.category] = [];
  }
  acc[shortcut.category].push(shortcut);
  return acc;
}, {});

// Map action to handler
export const shortcutActions = {
  'new-session': 'startNewSession',
  'clear-messages': 'clearMessages',
  'export-chat': 'exportChat',
  'toggle-command-sidebar': 'toggleCommandSidebar',
  'open-skill-manager': 'openSkillManager',
  'open-token-stats': 'openTokenStats',
  'toggle-model': 'toggleModel',
  'toggle-fast-mode': 'toggleFastMode',
  'toggle-effort': 'toggleEffort',
  'show-help': 'showHelp',
  'toggle-sidebar': 'toggleSidebar',
  'toggle-compact-mode': 'toggleCompactMode',
  'escape': 'escape',
  'reload': 'reload',
  // Voice actions
  'toggle-voice-input': 'toggleVoiceInput',
  'toggle-conversation-mode': 'toggleConversationMode',
  'quick-voice-start': 'quickVoiceStart',
  'stop-voice-all': 'stopVoiceAll',
};