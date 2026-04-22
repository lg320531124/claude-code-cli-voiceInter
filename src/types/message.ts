// src/types/message.ts
// Message-related types for chat and conversations

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp?: number;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ConversationStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalTokens?: number;
  createdAt?: number;
  updatedAt?: number;
  duration?: number;
}

export interface WebSocketMessage {
  type: string;
  data?: unknown;
  content?: string;
  error?: string;
  message?: string;
  sessionId?: string;
  claudeReady?: boolean;
}

export interface StreamDeltaMessage extends WebSocketMessage {
  type: 'stream-delta';
  content: string;
}

export interface ClaudeResponseMessage extends WebSocketMessage {
  type: 'claude-response';
  data: {
    type: 'assistant';
    content: string;
  };
}
