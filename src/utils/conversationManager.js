// src/utils/conversationManager.js
//
// 多对话会话管理工具
// - 创建/切换/删除对话
// - 每个对话独立消息历史
// - 对话持久化存储
// - 对话标题自动生成

const STORAGE_KEY = 'claude-conversations';
const ACTIVE_KEY = 'claude-active-conversation';

/**
 * 创建新对话
 */
export function createConversation(title = null) {
  const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  return {
    id,
    title: title || generateTitle(),
    createdAt: now,
    updatedAt: now,
    messages: [],
    metadata: {
      messageCount: 0,
      lastMessage: null,
      model: 'sonnet'
    }
  };
}

/**
 * 自动生成对话标题
 */
export function generateTitle(firstMessage = null) {
  if (firstMessage && firstMessage.content) {
    // 从第一条用户消息提取标题
    const content = firstMessage.content;
    const title = content.slice(0, 30);
    return title.length < content.length ? title + '...' : title;
  }
  return `对话 ${new Date().toLocaleDateString('zh-CN')}`;
}

/**
 * 加载所有对话
 */
export function loadConversations() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const conversations = JSON.parse(saved);
      return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  } catch (e) {
    console.warn('[ConversationManager] 加载对话失败:', e);
  }
  return [];
}

/**
 * 保存所有对话
 */
export function saveConversations(conversations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    return true;
  } catch (e) {
    console.warn('[ConversationManager] 保存对话失败:', e);
    return false;
  }
}

/**
 * 获取当前活动对话 ID
 */
export function getActiveConversationId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || null;
  } catch (e) {
    return null;
  }
}

/**
 * 设置当前活动对话 ID
 */
export function setActiveConversationId(id) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 添加对话到列表
 */
export function addConversation(conversations, conversation) {
  const newConversations = [...conversations, conversation];
  saveConversations(newConversations);
  return newConversations;
}

/**
 * 更新对话
 */
export function updateConversation(conversations, id, updates) {
  const index = conversations.findIndex(c => c.id === id);
  if (index === -1) return conversations;

  const updated = {
    ...conversations[index],
    ...updates,
    updatedAt: Date.now()
  };

  // 更新元数据
  if (updates.messages) {
    updated.metadata = {
      ...updated.metadata,
      messageCount: updates.messages.length,
      lastMessage: updates.messages.length > 0
        ? updates.messages[updates.messages.length - 1]
        : null
    };

    // 自动更新标题 (如果第一条消息存在且标题是默认的)
    if (updates.messages.length > 0 &&
        conversations[index].title.startsWith('对话')) {
      const firstUserMsg = updates.messages.find(m => m.role === 'user');
      if (firstUserMsg) {
        updated.title = generateTitle(firstUserMsg);
      }
    }
  }

  const newConversations = [...conversations];
  newConversations[index] = updated;
  saveConversations(newConversations);
  return newConversations;
}

/**
 * 删除对话
 */
export function deleteConversation(conversations, id) {
  const newConversations = conversations.filter(c => c.id !== id);
  saveConversations(newConversations);
  return newConversations;
}

/**
 * 获取对话详情
 */
export function getConversation(conversations, id) {
  return conversations.find(c => c.id === id) || null;
}

/**
 * 添加消息到对话
 */
export function addMessageToConversation(conversations, id, message) {
  const conv = getConversation(conversations, id);
  if (!conv) return conversations;

  const messages = [...conv.messages, {
    ...message,
    id: `msg-${Date.now()}`,
    timestamp: Date.now()
  }];

  return updateConversation(conversations, id, { messages });
}

/**
 * 清空对话消息
 */
export function clearConversationMessages(conversations, id) {
  return updateConversation(conversations, id, { messages: [] });
}

/**
 * 重命名对话
 */
export function renameConversation(conversations, id, newTitle) {
  return updateConversation(conversations, id, { title: newTitle });
}

/**
 * 获取对话统计
 */
export function getConversationStats(conversation) {
  if (!conversation) return null;

  const userMessages = conversation.messages.filter(m => m.role === 'user');
  const assistantMessages = conversation.messages.filter(m => m.role === 'assistant');

  return {
    totalMessages: conversation.messages.length,
    userMessages: userMessages.length,
    assistantMessages: assistantMessages.length,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    duration: conversation.messages.length > 0
      ? Math.round((conversation.updatedAt - conversation.createdAt) / 1000 / 60)
      : 0
  };
}

/**
 * 搜索对话
 */
export function searchConversations(conversations, query) {
  if (!query) return conversations;

  const lowerQuery = query.toLowerCase();
  return conversations.filter(c =>
    c.title.toLowerCase().includes(lowerQuery) ||
    c.messages.some(m => m.content?.toLowerCase().includes(lowerQuery))
  );
}

/**
 * 导出单个对话
 */
export function exportConversation(conversation) {
  return JSON.stringify(conversation, null, 2);
}

/**
 * 导入对话
 */
export function importConversation(jsonString) {
  try {
    const conversation = JSON.parse(jsonString);
    if (!conversation.id || !conversation.messages) {
      throw new Error('Invalid conversation format');
    }
    // 生成新 ID 避免冲突
    conversation.id = `conv-${Date.now()}-imported`;
    conversation.createdAt = Date.now();
    conversation.updatedAt = Date.now();
    return conversation;
  } catch (e) {
    console.error('[ConversationManager] 导入失败:', e);
    return null;
  }
}

export default {
  createConversation,
  generateTitle,
  loadConversations,
  saveConversations,
  getActiveConversationId,
  setActiveConversationId,
  addConversation,
  updateConversation,
  deleteConversation,
  getConversation,
  addMessageToConversation,
  clearConversationMessages,
  renameConversation,
  getConversationStats,
  searchConversations,
  exportConversation,
  importConversation
};