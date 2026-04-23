/**
 * useConversationManager - Manages conversation persistence and switching
 */
import { useState, useEffect, useCallback } from 'react';
import logger from '../utils/logger';
import {
  loadConversations,
  saveConversations,
  getActiveConversationId,
  setActiveConversationId,
  createConversation,
  getConversation,
  updateConversation,
} from '../utils/conversationManager';

logger.setContext('ConversationManager');

interface Conversation {
  id: string;
  title?: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  isStreaming?: boolean;
  isSending?: boolean;
  attachments?: Array<{
    name: string;
    type: string;
    isImage: boolean;
    preview?: string | null;
  }>;
}

export function useConversationManager() {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(() => {
    const saved = getActiveConversationId();
    return saved || null;
  });
  const [showConversationList, setShowConversationList] = useState(true);

  // Auto-create first conversation if none exist
  useEffect(() => {
    if (conversations.length === 0) {
      const newConv = createConversation();
      const updated = [newConv];
      setConversations(updated);
      saveConversations(updated);
      setActiveConversationIdState(newConv.id);
      setActiveConversationId(newConv.id);
      logger.debug('Created initial conversation:', { id: newConv.id });
    }
  }, []);

  // Switch to a different conversation
  const handleConversationSelect = useCallback(
    (convId: string) => {
      setActiveConversationIdState(convId);
      setActiveConversationId(convId);
      logger.debug('Switched to conversation:', { id: convId });
    },
    []
  );

  // Create a new conversation
  const handleConversationCreate = useCallback(
    (newConv: Conversation) => {
      const updated = [...conversations, newConv];
      setConversations(updated);
      saveConversations(updated);
      logger.debug('Created new conversation:', { id: newConv.id });
    },
    [conversations]
  );

  // Delete a conversation
  const handleConversationDelete = useCallback(
    (convId: string) => {
      const updated = conversations.filter(c => c.id !== convId);
      setConversations(updated);
      saveConversations(updated);

      // Switch to another conversation if active was deleted
      if (activeConversationId === convId && updated.length > 0) {
        handleConversationSelect(updated[0].id);
      }
      logger.debug('Deleted conversation:', { id: convId });
    },
    [conversations, activeConversationId, handleConversationSelect]
  );

  // Save messages to current conversation
  const saveMessagesToConversation = useCallback(
    (messages: Message[]) => {
      if (activeConversationId && messages.length > 0) {
        const updated = updateConversation(conversations, activeConversationId, { messages });
        setConversations(updated);
        saveConversations(updated);
      }
    },
    [conversations, activeConversationId]
  );

  // Load messages from a conversation
  const loadMessagesFromConversation = useCallback(
    (convId: string): Message[] => {
      const conv = getConversation(conversations, convId);
      return conv?.messages?.slice(-50) || [];
    },
    [conversations]
  );

  // Create new conversation and switch to it
  const startNewConversation = useCallback(() => {
    const newConv = createConversation();
    const updated = [...conversations, newConv];
    setConversations(updated);
    saveConversations(updated);
    setActiveConversationIdState(newConv.id);
    setActiveConversationId(newConv.id);
    return newConv;
  }, [conversations]);

  return {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId: handleConversationSelect,
    showConversationList,
    setShowConversationList,
    handleConversationSelect,
    handleConversationCreate,
    handleConversationDelete,
    saveMessagesToConversation,
    loadMessagesFromConversation,
    startNewConversation,
  };
}