/**
 * Tests for Chat component - simplified with async mocks
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock WebSocket context
vi.mock('../../contexts/WebSocketContext', () => ({
  WebSocketProvider: ({ children }) => <div data-testid="ws-provider">{children}</div>,
  useWebSocket: () => ({
    isConnected: true,
    sendMessage: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

// Mock Chat context
vi.mock('../../contexts/ChatContext', () => ({
  ChatProvider: ({ children }) => <div data-testid="chat-provider">{children}</div>,
  useChat: () => ({
    messages: [],
    inputText: '',
    setInputText: vi.fn(),
    isProcessing: false,
  }),
}));

// Mock all child components
vi.mock('../../components/ChatHeader', () => ({
  default: () => <div data-testid="chat-header">Header</div>,
}));

vi.mock('../../components/MessageList', () => ({
  default: () => <div data-testid="message-list">Messages</div>,
}));

vi.mock('../../components/ChatInput', () => ({
  default: () => <div data-testid="chat-input">Input</div>,
}));

vi.mock('../../components/VoicePanel', () => ({
  default: () => <div data-testid="voice-panel">Voice Panel</div>,
}));

vi.mock('../../components/ChatModals', () => ({
  default: () => <div data-testid="chat-modals">Modals</div>,
}));

vi.mock('../../components/ConversationList', () => ({
  default: () => <div data-testid="conversation-list">Conversations</div>,
}));

// Mock hooks - updated to use new module structure with named exports
vi.mock('../../hooks/useMessageHandler', () => ({
  useMessageHandler: () => ({
    messages: [],
    setMessages: vi.fn(),
    sendMessage: vi.fn(),
    addMessage: vi.fn(),
    stopResponse: vi.fn(),
    isStreaming: false,
    streamingContent: '',
    stopStreaming: vi.fn(),
    isProcessing: false,
    setIsProcessing: vi.fn(),
    sessionId: 'test-session',
    claudeReady: true,
    tokenUsage: { cumulative: { totalCostUsd: 0 } },
    streamBufferRef: { current: '' },
    messagesEndRef: { current: null },
    clearMessages: vi.fn(),
  }),
}));

vi.mock('../../hooks/useConversationManager', () => ({
  useConversationManager: () => ({
    conversations: [],
    setConversations: vi.fn(),
    activeConversationId: 'test-conv',
    showConversationList: true,
    setShowConversationList: vi.fn(),
    handleConversationSelect: vi.fn(),
    handleConversationDelete: vi.fn(),
    saveMessagesToConversation: vi.fn(),
    startNewConversation: vi.fn(),
    loadMessagesFromConversation: vi.fn(() => []),
  }),
}));

vi.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({}),
}));

vi.mock('../../hooks/useCommandHandler', () => ({
  useCommandHandler: () => ({
    executeCommand: vi.fn(),
  }),
}));

// Mock useVoiceInteraction from new module
vi.mock('../../hooks/useVoiceInteraction', () => ({
  useVoiceInteraction: () => ({
    isListening: false,
    isSpeaking: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    errorMessage: null,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    toggleListening: vi.fn(),
    speak: vi.fn(),
    stopSpeaking: vi.fn(),
    speakResponse: vi.fn(),
    isSupported: true,
    isInitialized: true,
    isActive: false,
  }),
}));

// Mock useHybridTTS
vi.mock('../../hooks/useHybridTTS', () => ({
  useHybridTTS: () => ({
    isSpeaking: false,
    currentMode: 'kokoro',
    kokoroReady: true,
    browserReady: true,
    voices: [],
    selectedVoice: null,
    setSelectedVoice: vi.fn(),
    speak: vi.fn(),
    stop: vi.fn(),
    switchMode: vi.fn(),
    isSupported: true,
    clearCache: vi.fn(),
    getCacheStats: vi.fn(),
    enableCache: true,
  }),
}));

vi.mock('../../hooks/useVoicePanelLogic', () => ({
  useVoicePanelLogic: () => ({
    isActive: false,
    isListening: false,
    isSpeaking: false,
    currentSpeaker: null,
    interimTranscript: '',
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
    speak: vi.fn(),
    language: 'zh-CN',
    setLanguage: vi.fn(),
    sttReady: true,
    ttsReady: true,
  }),
}));

import Chat from '../../components/Chat';

describe('Chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render chat layout', () => {
    render(<Chat />);

    expect(screen.getByTestId('chat-header')).toBeInTheDocument();
    // MessageList is only rendered when messages.length > 0
    // When empty, welcome screen is shown instead
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('should render voice panel', () => {
    render(<Chat />);

    expect(screen.getByTestId('voice-panel')).toBeInTheDocument();
  });

  it('should render modals', () => {
    render(<Chat />);

    expect(screen.getByTestId('chat-modals')).toBeInTheDocument();
  });

  it('should render without crashing', () => {
    const { container } = render(<Chat />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
