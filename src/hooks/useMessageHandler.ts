/**
 * useMessageHandler - Handles message processing and display logic
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import logger from '../utils/logger';

logger.setContext('MessageHandler');

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

interface TokenUsage {
  session: {
    inputTokens: number;
    outputTokens: number;
    totalCostUsd: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    modelUsage: Record<string, number>;
    apiCallCount: number;
  };
  cumulative: {
    inputTokens: number;
    outputTokens: number;
    totalCostUsd: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    requests: number;
    apiCallCount: number;
  };
}

export function useMessageHandler() {
  const { latestMessage, sendMessage } = useWebSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [claudeReady, setClaudeReady] = useState(false);

  const streamBufferRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    session: {
      inputTokens: 0,
      outputTokens: 0,
      totalCostUsd: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      modelUsage: {},
      apiCallCount: 0,
    },
    cumulative: {
      inputTokens: 0,
      outputTokens: 0,
      totalCostUsd: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      requests: 0,
      apiCallCount: 0,
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Process incoming WebSocket messages
  useEffect(() => {
    if (!latestMessage) return;

    const { type, data, error, message, sessionId: newSessionId, claudeReady: ready } = latestMessage;

    if (type === 'connected') {
      setClaudeReady(true);
      if (newSessionId) setSessionId(newSessionId);
    }

    if (type === 'session-reset' && newSessionId) {
      setSessionId(newSessionId);
      setMessages([]);
    }

    if (type === 'status' && message === 'Processing...') {
      setIsProcessing(true);
      streamBufferRef.current = '';
    }

    if (type === 'stream-delta') {
      const content = latestMessage.content || '';
      if (content) {
        streamBufferRef.current += content;
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant' && lastMsg.isStreaming) {
            return [...prev.slice(0, -1), { ...lastMsg, content: streamBufferRef.current }];
          }
          return [...prev, { role: 'assistant', content: streamBufferRef.current, isStreaming: true }];
        });
      }
    }

    if (type === 'claude-response' && data) {
      setIsProcessing(false);
      const content = data.content || '';
      if (content.trim()) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant' && lastMsg.content === content) {
            return prev;
          }
          return [...prev, { role: 'assistant', content }];
        });
      }
    }

    if (type === 'complete' || type === 'response-stopped') {
      setIsProcessing(false);
    }

    if (type === 'error') {
      setIsProcessing(false);
      setMessages(prev => [...prev, { role: 'error', content: error || 'Unknown error' }]);
    }

    if (type === 'token-usage') {
      const { usage } = latestMessage;
      setTokenUsage(prev => ({
        ...prev,
        session: {
          ...prev.session,
          inputTokens: usage.inputTokens || 0,
          outputTokens: usage.outputTokens || 0,
        },
      }));
    }

    if (type === 'token-usage-final') {
      const { usage } = latestMessage;
      setTokenUsage(prev => ({
        session: {
          inputTokens: usage.inputTokens || 0,
          outputTokens: usage.outputTokens || 0,
          totalCostUsd: usage.totalCostUsd || 0,
          cacheReadTokens: usage.cacheReadTokens || 0,
          cacheCreationTokens: usage.cacheCreationTokens || 0,
          modelUsage: usage.modelUsage || {},
          apiCallCount: usage.apiCallCount || 0,
        },
        cumulative: {
          inputTokens: prev.cumulative.inputTokens + (usage.inputTokens || 0),
          outputTokens: prev.cumulative.outputTokens + (usage.outputTokens || 0),
          totalCostUsd: prev.cumulative.totalCostUsd + (usage.totalCostUsd || 0),
          cacheReadTokens: prev.cumulative.cacheReadTokens + (usage.cacheReadTokens || 0),
          cacheCreationTokens: prev.cumulative.cacheCreationTokens + (usage.cacheCreationTokens || 0),
          requests: prev.cumulative.requests + 1,
          apiCallCount: usage.apiCallCount || prev.cumulative.apiCallCount + 1,
        },
      }));
    }
  }, [latestMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    streamBufferRef.current = '';
  }, []);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const stopResponse = useCallback(() => {
    setIsProcessing(false);
    streamBufferRef.current = '';
    sendMessage({ type: 'stop-response' });
  }, [sendMessage]);

  return {
    messages,
    setMessages,
    isProcessing,
    setIsProcessing,
    sessionId,
    claudeReady,
    tokenUsage,
    streamBufferRef,
    messagesEndRef,
    clearMessages,
    addMessage,
    stopResponse,
  };
}