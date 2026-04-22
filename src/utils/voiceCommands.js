// src/utils/voiceCommands.js
//
// 语音命令识别和处理
// - 支持中英文命令
// - 命令匹配和执行
// - 命令确认反馈

// 语音命令定义
export const voiceCommands = [
  {
    // 新建对话
    id: 'new-conversation',
    patterns: ['新建对话', '创建对话', '新对话', 'new conversation', 'create conversation', 'start new'],
    action: 'new-conversation',
    feedback: '创建新对话',
    category: 'conversation'
  },
  {
    // 清空消息
    id: 'clear-messages',
    patterns: ['清空消息', '清除消息', '清空', '清除', 'clear messages', 'clear', 'clear chat'],
    action: 'clear-messages',
    feedback: '清空当前消息',
    category: 'session'
  },
  {
    // 导出对话
    id: 'export-chat',
    patterns: ['导出对话', '导出', '保存对话', 'export chat', 'export', 'save chat'],
    action: 'export-chat',
    feedback: '导出对话记录',
    category: 'session'
  },
  {
    // 开始新会话
    id: 'new-session',
    patterns: ['新会话', '开始新会话', '重置会话', 'new session', 'start new session', 'reset session'],
    action: 'new-session',
    feedback: '开始新会话',
    category: 'session'
  },
  {
    // 切换到下一个对话
    id: 'next-conversation',
    patterns: ['下一个对话', '切换下一个', 'next conversation', 'next chat', 'switch next'],
    action: 'next-conversation',
    feedback: '切换到下一个对话',
    category: 'navigation'
  },
  {
    // 切换到上一个对话
    id: 'prev-conversation',
    patterns: ['上一个对话', '切换上一个', 'previous conversation', 'prev chat', 'switch previous'],
    action: 'prev-conversation',
    feedback: '切换到上一个对话',
    category: 'navigation'
  },
  {
    // 删除当前对话
    id: 'delete-conversation',
    patterns: ['删除对话', '删除当前对话', 'delete conversation', 'delete chat', 'remove conversation'],
    action: 'delete-conversation',
    feedback: '删除当前对话',
    category: 'conversation'
  },
  {
    // 停止语音
    id: 'stop-voice',
    patterns: ['停止', '停止语音', '停止朗读', '停止录音', 'stop', 'stop voice', 'stop listening', 'stop speaking'],
    action: 'stop-voice-all',
    feedback: '停止语音操作',
    category: 'voice'
  },
  {
    // 切换模型
    id: 'toggle-model',
    patterns: ['切换模型', '换模型', 'switch model', 'change model', 'toggle model'],
    action: 'toggle-model',
    feedback: '切换模型',
    category: 'model'
  },
  {
    // 开启/关闭 Fast 模式
    id: 'toggle-fast',
    patterns: ['快速模式', '切换快速', 'fast mode', 'toggle fast', 'enable fast', 'disable fast'],
    action: 'toggle-fast-mode',
    feedback: '切换 Fast 模式',
    category: 'model'
  },
  {
    // 显示帮助
    id: 'show-help',
    patterns: ['帮助', '显示帮助', '查看帮助', 'help', 'show help', 'commands'],
    action: 'show-help',
    feedback: '显示帮助信息',
    category: 'help'
  },
  {
    // 显示快捷键
    id: 'show-shortcuts',
    patterns: ['快捷键', '显示快捷键', 'shortcuts', 'keyboard shortcuts', 'hotkeys'],
    action: 'show-help',
    feedback: '显示快捷键',
    category: 'help'
  },
  {
    // 显示 Token 统计
    id: 'show-tokens',
    patterns: ['Token统计', '显示统计', 'token stats', 'show stats', 'usage'],
    action: 'open-token-stats',
    feedback: '显示 Token 统计',
    category: 'stats'
  },
  {
    // 朗读最后一条消息
    id: 'read-last',
    patterns: ['朗读最后', '读最后一条', 'read last', 'read the last message', 'speak last'],
    action: 'read-last-message',
    feedback: '朗读最后一条消息',
    category: 'tts'
  },
  {
    // 重读当前回复
    id: 'repeat-response',
    patterns: ['重读', '再读一遍', '重新朗读', 'repeat', 'read again', 'say again'],
    action: 'read-last-message',
    feedback: '重新朗读',
    category: 'tts'
  }
];

// 匹配语音命令
export function matchVoiceCommand(text) {
  if (!text || typeof text !== 'string') return null;

  const normalizedText = text.toLowerCase().trim();

  for (const command of voiceCommands) {
    for (const pattern of command.patterns) {
      const normalizedPattern = pattern.toLowerCase();

      // 完全匹配
      if (normalizedText === normalizedPattern) {
        return { ...command, matchedText: text, matchType: 'exact' };
      }

      // 包含匹配 (命令是文本的一部分)
      if (normalizedText.includes(normalizedPattern)) {
        // 检查是否是主要意图 (命令在开头或结尾)
        const startsWith = normalizedText.startsWith(normalizedPattern);
        const endsWith = normalizedText.endsWith(normalizedPattern);

        if (startsWith || endsWith) {
          return { ...command, matchedText: text, matchType: 'contains' };
        }
      }
    }
  }

  return null;
}

// 从文本中提取命令后的参数
export function extractCommandArgs(text, command) {
  if (!text || !command) return null;

  const normalizedText = text.toLowerCase().trim();
  const matchedPattern = command.patterns.find(p => normalizedText.includes(p.toLowerCase()));

  if (!matchedPattern) return null;

  // 提取命令后的内容
  const patternLower = matchedPattern.toLowerCase();
  const index = normalizedText.indexOf(patternLower);

  if (index === -1) return null;

  const afterCommand = text.slice(index + matchedPattern.length).trim();
  return afterCommand || null;
}

// 判断文本是否可能是命令 (用于提前检测)
export function isPotentialCommand(text) {
  if (!text || typeof text !== 'string') return false;

  const normalizedText = text.toLowerCase().trim();

  // 检查是否以命令关键词开头
  const commandKeywords = [
    '新建', '创建', '删除', '清空', '清除', '导出', '保存',
    '切换', '停止', '帮助', '快捷键', '统计',
    'new', 'create', 'delete', 'clear', 'export', 'save',
    'switch', 'stop', 'help', 'shortcuts', 'stats'
  ];

  return commandKeywords.some(keyword => normalizedText.startsWith(keyword));
}

// 获取所有命令的简短列表 (用于提示)
export function getCommandHints() {
  return voiceCommands.map(cmd => ({
    id: cmd.id,
    hint: cmd.patterns[0], // 使用第一个模式作为提示
    feedback: cmd.feedback
  }));
}

// 格式化命令帮助文本
export function formatCommandHelp() {
  const categories = {};
  voiceCommands.forEach(cmd => {
    if (!categories[cmd.category]) {
      categories[cmd.category] = [];
    }
    categories[cmd.category].push(cmd);
  });

  let helpText = '**语音命令列表**\n\n';
  helpText += '在语音对话中，可以使用以下命令进行操作：\n\n';

  const categoryLabels = {
    conversation: '对话管理',
    session: '会话操作',
    navigation: '对话导航',
    voice: '语音控制',
    model: '模型设置',
    help: '帮助信息',
    stats: '统计信息',
    tts: '语音朗读'
  };

  for (const [category, commands] of Object.entries(categories)) {
    helpText += `**${categoryLabels[category] || category}:**\n`;
    commands.forEach(cmd => {
      helpText += `- ${cmd.patterns.join(' / ')} → ${cmd.feedback}\n`;
    });
    helpText += '\n';
  }

  helpText += '_提示：说出命令后会执行对应操作，然后继续对话_';

  return helpText;
}

export default {
  voiceCommands,
  matchVoiceCommand,
  extractCommandArgs,
  isPotentialCommand,
  getCommandHints,
  formatCommandHelp
};