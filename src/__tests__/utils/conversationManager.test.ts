/**
 * ConversationManager Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadConversations,
  saveConversations,
  getActiveConversationId,
  setActiveConversationId,
  createConversation,
  getConversation,
  updateConversation,
} from '../../utils/conversationManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('conversationManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('loadConversations', () => {
    it('returns empty array when no saved conversations', () => {
      const result = loadConversations();
      expect(result).toEqual([]);
    });

    it('loads saved conversations', () => {
      const conversations = [{ id: 'test-1', messages: [], createdAt: '2024-01-01' }];
      localStorageMock.setItem('claude-conversations', JSON.stringify(conversations));

      const result = loadConversations();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('test-1');
    });
  });

  describe('saveConversations', () => {
    it('saves conversations to localStorage', () => {
      const conversations = [{ id: 'test-1', messages: [], createdAt: '2024-01-01' }];
      saveConversations(conversations);

      const saved = JSON.parse(localStorageMock.getItem('claude-conversations') || '[]');
      expect(saved.length).toBe(1);
    });
  });

  describe('createConversation', () => {
    it('creates a new conversation with unique id', () => {
      const conv = createConversation();
      expect(conv.id).toBeDefined();
      expect(conv.messages).toEqual([]);
      expect(conv.createdAt).toBeDefined();
    });

    it('creates conversations with different ids', () => {
      const conv1 = createConversation();
      const conv2 = createConversation();
      expect(conv1.id).not.toBe(conv2.id);
    });
  });

  describe('getActiveConversationId', () => {
    it('returns null when no active conversation', () => {
      const result = getActiveConversationId();
      expect(result).toBeNull();
    });

    it('returns saved active conversation id', () => {
      localStorageMock.setItem('claude-active-conversation', 'test-123');
      const result = getActiveConversationId();
      expect(result).toBe('test-123');
    });
  });

  describe('setActiveConversationId', () => {
    it('sets active conversation id', () => {
      setActiveConversationId('new-active');
      const result = localStorageMock.getItem('claude-active-conversation');
      expect(result).toBe('new-active');
    });
  });

  describe('getConversation', () => {
    it('returns conversation by id', () => {
      const conversations = [
        { id: 'conv-1', messages: [] },
        { id: 'conv-2', messages: [{ role: 'user', content: 'test' }] },
      ];

      const result = getConversation(conversations, 'conv-2');
      expect(result?.id).toBe('conv-2');
      expect(result?.messages.length).toBe(1);
    });

    it('returns null for non-existent conversation', () => {
      const conversations = [{ id: 'conv-1', messages: [] }];
      const result = getConversation(conversations, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('updateConversation', () => {
    it('updates conversation messages', () => {
      const conversations = [{ id: 'conv-1', title: 'Test Title', messages: [] }];
      const newMessages = [{ role: 'user', content: 'Hello' }];

      const result = updateConversation(conversations, 'conv-1', { messages: newMessages });
      expect(result[0].messages.length).toBe(1);
      expect(result[0].messages[0].content).toBe('Hello');
    });

    it('returns original conversations if id not found', () => {
      const conversations = [{ id: 'conv-1', title: 'Test', messages: [] }];
      const result = updateConversation(conversations, 'non-existent', { messages: [] });
      expect(result).toEqual(conversations);
    });
  });
});
