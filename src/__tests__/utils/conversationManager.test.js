// src/__tests__/utils/conversationManager.test.js
// Conversation manager unit tests

import { describe, test, expect, beforeEach } from 'vitest';
import {
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
} from '../../utils/conversationManager';

describe('ConversationManager', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
  });

  describe('createConversation', () => {
    test('should create conversation with unique ID', () => {
      const conv1 = createConversation();
      const conv2 = createConversation();

      expect(conv1.id).not.toBe(conv2.id);
      expect(conv1.id).toMatch(/^conv-/);
    });

    test('should set default title when not provided', () => {
      const conv = createConversation();
      expect(conv.title).toMatch(/^对话/);
    });

    test('should use provided title', () => {
      const conv = createConversation('我的对话');
      expect(conv.title).toBe('我的对话');
    });

    test('should initialize with empty messages', () => {
      const conv = createConversation();
      expect(conv.messages).toEqual([]);
      expect(conv.metadata.messageCount).toBe(0);
    });

    test('should set timestamps', () => {
      const conv = createConversation();
      expect(conv.createdAt).toBeDefined();
      expect(conv.updatedAt).toBeDefined();
      expect(conv.createdAt).toBe(conv.updatedAt);
    });
  });

  describe('generateTitle', () => {
    test('should generate title from first message', () => {
      const message = { content: '这是一个很长的消息内容用于测试标题生成功能' };
      const title = generateTitle(message);

      expect(title).toContain('这是一个很长的消息内容');
      expect(title.length).toBeLessThanOrEqual(33); // 30 chars + '...'
    });

    test('should not add ellipsis for short content', () => {
      const message = { content: '短消息' };
      const title = generateTitle(message);

      expect(title).toBe('短消息');
      expect(title).not.toContain('...');
    });

    test('should generate default title without message', () => {
      const title = generateTitle();
      expect(title).toMatch(/^对话/);
    });
  });

  describe('loadConversations/saveConversations', () => {
    test('should save and load conversations', () => {
      const conv = createConversation('测试对话');
      saveConversations([conv]);

      const loaded = loadConversations();
      expect(loaded.length).toBe(1);
      expect(loaded[0].title).toBe('测试对话');
    });

    test('should return empty array when no data', () => {
      const loaded = loadConversations();
      expect(loaded).toEqual([]);
    });

    test('should sort conversations by updatedAt', () => {
      const conv1 = createConversation('旧对话');
      conv1.updatedAt = 1000;
      const conv2 = createConversation('新对话');
      conv2.updatedAt = 2000;

      saveConversations([conv1, conv2]);

      const loaded = loadConversations();
      expect(loaded[0].title).toBe('新对话');
    });
  });

  describe('getActiveConversationId/setActiveConversationId', () => {
    test('should set and get active conversation ID', () => {
      setActiveConversationId('conv-123');
      const id = getActiveConversationId();

      expect(id).toBe('conv-123');
    });

    test('should return null when not set', () => {
      const id = getActiveConversationId();
      expect(id).toBeNull();
    });

    test('should clear active ID when null passed', () => {
      setActiveConversationId('conv-123');
      setActiveConversationId(null);

      const id = getActiveConversationId();
      expect(id).toBeNull();
    });
  });

  describe('addConversation', () => {
    test('should add conversation to list', () => {
      const conv = createConversation('新对话');
      const updated = addConversation([], conv);

      expect(updated.length).toBe(1);
      expect(updated[0].id).toBe(conv.id);
    });

    test('should persist to localStorage', () => {
      const conv = createConversation();
      addConversation([], conv);

      const loaded = loadConversations();
      expect(loaded.length).toBe(1);
    });
  });

  describe('updateConversation', () => {
    test('should update conversation properties', () => {
      const conv = createConversation('原标题');
      const conversations = [conv];

      const updated = updateConversation(conversations, conv.id, { title: '新标题' });

      expect(updated[0].title).toBe('新标题');
    });

    test('should update updatedAt timestamp', () => {
      const conv = createConversation();
      conv.updatedAt = 1000;
      const conversations = [conv];

      const updated = updateConversation(conversations, conv.id, { title: '新标题' });

      expect(updated[0].updatedAt).toBeGreaterThan(1000);
    });

    test('should return unchanged if ID not found', () => {
      const conv = createConversation();
      const conversations = [conv];

      const updated = updateConversation(conversations, 'non-existent', { title: '新标题' });

      expect(updated).toEqual(conversations);
    });
  });

  describe('deleteConversation', () => {
    test('should remove conversation from list', () => {
      const conv1 = createConversation('对话1');
      const conv2 = createConversation('对话2');
      const conversations = [conv1, conv2];

      const updated = deleteConversation(conversations, conv1.id);

      expect(updated.length).toBe(1);
      expect(updated[0].id).toBe(conv2.id);
    });

    test('should persist deletion', () => {
      const conv = createConversation();
      addConversation([], conv);

      deleteConversation([conv], conv.id);

      const loaded = loadConversations();
      expect(loaded.length).toBe(0);
    });
  });

  describe('getConversation', () => {
    test('should find conversation by ID', () => {
      const conv = createConversation('目标对话');
      const conversations = [conv];

      const found = getConversation(conversations, conv.id);

      expect(found).toBeDefined();
      expect(found.title).toBe('目标对话');
    });

    test('should return null if not found', () => {
      const conv = createConversation();
      const conversations = [conv];

      const found = getConversation(conversations, 'non-existent');

      expect(found).toBeNull();
    });
  });

  describe('addMessageToConversation', () => {
    test('should add message to conversation', () => {
      const conv = createConversation();
      const conversations = [conv];
      const message = { role: 'user', content: '测试消息' };

      const updated = addMessageToConversation(conversations, conv.id, message);

      expect(updated[0].messages.length).toBe(1);
      expect(updated[0].messages[0].content).toBe('测试消息');
    });

    test('should add message ID and timestamp', () => {
      const conv = createConversation();
      const conversations = [conv];
      const message = { role: 'user', content: '测试' };

      const updated = addMessageToConversation(conversations, conv.id, message);

      expect(updated[0].messages[0].id).toMatch(/^msg-/);
      expect(updated[0].messages[0].timestamp).toBeDefined();
    });

    test('should update metadata', () => {
      const conv = createConversation();
      const conversations = [conv];

      const updated = addMessageToConversation(conversations, conv.id, { role: 'user', content: '测试' });

      expect(updated[0].metadata.messageCount).toBe(1);
      expect(updated[0].metadata.lastMessage).toBeDefined();
    });
  });

  describe('clearConversationMessages', () => {
    test('should clear all messages', () => {
      const conv = createConversation();
      conv.messages = [{ role: 'user', content: '消息' }];
      const conversations = [conv];

      const updated = clearConversationMessages(conversations, conv.id);

      expect(updated[0].messages).toEqual([]);
      expect(updated[0].metadata.messageCount).toBe(0);
    });
  });

  describe('renameConversation', () => {
    test('should update conversation title', () => {
      const conv = createConversation('旧标题');
      const conversations = [conv];

      const updated = renameConversation(conversations, conv.id, '新标题');

      expect(updated[0].title).toBe('新标题');
    });
  });

  describe('getConversationStats', () => {
    test('should calculate message counts', () => {
      const conv = createConversation();
      conv.messages = [
        { role: 'user', content: '用户消息' },
        { role: 'assistant', content: '助手消息' },
        { role: 'user', content: '第二条用户消息' }
      ];

      const stats = getConversationStats(conv);

      expect(stats.totalMessages).toBe(3);
      expect(stats.userMessages).toBe(2);
      expect(stats.assistantMessages).toBe(1);
    });

    test('should return null for invalid conversation', () => {
      const stats = getConversationStats(null);
      expect(stats).toBeNull();
    });
  });

  describe('searchConversations', () => {
    test('should search by title', () => {
      const conv1 = createConversation('项目讨论');
      const conv2 = createConversation('日常聊天');
      const conversations = [conv1, conv2];

      const results = searchConversations(conversations, '项目');

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('项目讨论');
    });

    test('should search in message content', () => {
      const conv1 = createConversation();
      conv1.messages = [{ content: '讨论代码实现' }];
      const conv2 = createConversation();
      conv2.messages = [{ content: '其他话题' }];
      const conversations = [conv1, conv2];

      const results = searchConversations(conversations, '代码');

      expect(results.length).toBe(1);
    });

    test('should return all if query empty', () => {
      const conversations = [createConversation(), createConversation()];
      const results = searchConversations(conversations, '');

      expect(results.length).toBe(2);
    });
  });

  describe('exportConversation/importConversation', () => {
    test('should export conversation as JSON', () => {
      const conv = createConversation('导出测试');
      const json = exportConversation(conv);

      expect(json).toContain('导出测试');
      expect(JSON.parse(json).id).toBe(conv.id);
    });

    test('should import valid JSON conversation', () => {
      const conv = createConversation();
      const json = exportConversation(conv);

      const imported = importConversation(json);

      expect(imported).toBeDefined();
      expect(imported.messages).toEqual(conv.messages);
    });

    test('should generate new ID on import', () => {
      const conv = createConversation();
      const json = exportConversation(conv);

      const imported = importConversation(json);

      expect(imported.id).not.toBe(conv.id);
      expect(imported.id).toContain('imported');
    });

    test('should return null for invalid JSON', () => {
      const result = importConversation('invalid json');
      expect(result).toBeNull();
    });

    test('should return null for missing required fields', () => {
      const result = importConversation(JSON.stringify({ title: '缺少字段' }));
      expect(result).toBeNull();
    });
  });
});