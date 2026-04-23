// src/contexts/ChatContext.jsx
//
// Chat state management context
// - Messages state
// - Conversation management
// - Input state
// - Processing state

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
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

logger.setContext('ChatContext');

const ChatContext = createContext(null);

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export function ChatProvider({ children }) {
  // Conversation management state
  const [conversations, setConversations] = useState(() => loadConversations());
  const [activeConversationId, setActiveConversationId] = useState(() => {
    const saved = getActiveConversationId();
    return saved || null;
  });
  const [showConversationList, setShowConversationList] = useState(true);

  // Current conversation messages
  const [messages, setMessages] = useState(() => {
    const convId = getActiveConversationId();
    if (convId) {
      const convs = loadConversations();
      const conv = convs.find(c => c.id === convId);
      if (conv && conv.messages) {
        logger.debug('Loaded messages from conversation:', {
          id: conv.id,
          count: conv.messages.length,
        });
        return conv.messages.slice(-50);
      }
    }
    // Try loading from old format
    try {
      const saved = localStorage.getItem('claude-chat-messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        logger.debug('Loaded saved messages:', { count: parsed.length });
        return parsed.slice(-50);
      }
    } catch (e) {
      logger.warn('Failed to load saved messages:', { error: e });
    }
    return [];
  });

  // Input state
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [claudeReady, setClaudeReady] = useState(false);

  // Model settings
  const [currentModel, setCurrentModel] = useState('sonnet');
  const [effortLevel, setEffortLevel] = useState('medium');
  const [compactMode, setCompactMode] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);

  // Token usage
  const [tokenUsage, setTokenUsage] = useState({
    session: {
      inputTokens: 0,
      outputTokens: 0,
      totalCostUsd: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      modelUsage: {},
    },
    cumulative: {
      inputTokens: 0,
      outputTokens: 0,
      totalCostUsd: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      requests: 0,
    },
  });

  // Memory usage
  const [memoryUsage, setMemoryUsage] = useState(null);

  // Stream buffer for accumulating streaming content
  const streamBufferRef = useRef('');
  const messagesEndRef = useRef(null);

  // Save messages to current conversation
  useEffect(() => {
    if (activeConversationId && messages.length > 0) {
      const updated = updateConversation(conversations, activeConversationId, { messages });
      setConversations(updated);
      saveConversations(updated);
    }
  }, [messages, activeConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Conversation actions
  const handleConversationSelect = useCallback(
    convId => {
      setActiveConversationId(convId);
      setActiveConversationId(convId);

      const conv = getConversation(conversations, convId);
      if (conv && conv.messages) {
        setMessages(conv.messages.slice(-50));
      } else {
        setMessages([]);
      }
    },
    [conversations]
  );

  const handleConversationCreate = useCallback(
    newConv => {
      const updated = [...conversations, newConv];
      setConversations(updated);
      saveConversations(updated);
    },
    [conversations]
  );

  const handleConversationDelete = useCallback(
    convId => {
      const updated = conversations.filter(c => c.id !== convId);
      setConversations(updated);
      saveConversations(updated);
    },
    [conversations]
  );

  const startNewConversation = useCallback(() => {
    const newConv = createConversation();
    const updated = [...conversations, newConv];
    setConversations(updated);
    saveConversations(updated);
    setActiveConversationId(newConv.id);
    setActiveConversationId(newConv.id);
    setMessages([]);
    setSessionId(null);
  }, [conversations]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateLastMessage = useCallback((content) => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role === 'assistant') {
        return [...prev.slice(0, -1), { ...last, content }];
      }
      return prev;
    });
  }, []);

  // Value object
  const value = {
    // State
    conversations,
    activeConversationId,
    showConversationList,
    messages,
    inputText,
    isProcessing,
    isSending,
    isComposing,
    sessionId,
    claudeReady,
    currentModel,
    effortLevel,
    compactMode,
    fastMode,
    conversationMode,
    tokenUsage,
    memoryUsage,

    // Refs
    streamBufferRef,
    messagesEndRef,

    // Setters
    setConversations,
    setActiveConversationId,
    setShowConversationList,
    setMessages,
    setInputText,
    setIsProcessing,
    setIsSending,
    setIsComposing,
    setSessionId,
    setClaudeReady,
    setCurrentModel,
    setEffortLevel,
    setCompactMode,
    setFastMode,
    setConversationMode,
    setTokenUsage,
    setMemoryUsage,

    // Actions
    handleConversationSelect,
    handleConversationCreate,
    handleConversationDelete,
    startNewConversation,
    clearMessages,
    addMessage,
    updateLastMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export default ChatContext;