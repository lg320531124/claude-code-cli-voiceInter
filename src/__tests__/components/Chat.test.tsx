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
  })
}));

// Mock Chat context
vi.mock('../../contexts/ChatContext', () => ({
  ChatProvider: ({ children }) => <div data-testid="chat-provider">{children}</div>,
  useChat: () => ({
    messages: [],
    inputText: '',
    setInputText: vi.fn(),
    isProcessing: false,
  })
}));

// Mock all child components
vi.mock('../../components/ChatHeader', () => ({
  default: () => <div data-testid="chat-header">Header</div>
}));

vi.mock('../../components/MessageList', () => ({
  default: () => <div data-testid="message-list">Messages</div>
}));

vi.mock('../../components/ChatInput', () => ({
  default: () => <div data-testid="chat-input">Input</div>
}));

vi.mock('../../components/VoicePanel', () => ({
  default: () => <div data-testid="voice-panel">Voice Panel</div>
}));

vi.mock('../../components/ChatModals', () => ({
  default: () => <div data-testid="chat-modals">Modals</div>
}));

// Mock hooks with async importOriginal pattern
vi.mock('../../hooks/useMessageHandler', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: () => ({
      messages: [],
      sendMessage: vi.fn(),
      addMessage: vi.fn(),
      stopResponse: vi.fn(),
      isStreaming: false,
      streamingContent: '',
      stopStreaming: vi.fn()
    })
  };
});

vi.mock('../../hooks/useConversationManager', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: () => ({
      conversations: [],
      currentConversation: null,
      saveConversation: vi.fn(),
      loadConversation: vi.fn(),
      clearConversation: vi.fn()
    })
  };
});

vi.mock('../../hooks/useKeyboardShortcuts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: () => ({})
  };
});

vi.mock('../../hooks/useCommandHandler', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: () => ({
      executeCommand: vi.fn()
    })
  };
});

vi.mock('../../hooks/useVoicePanelLogic', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: () => ({
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
      ttsReady: true
    })
  };
});

import Chat from '../../components/Chat';

describe('Chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render chat layout', () => {
    render(<Chat />);

    expect(screen.getByTestId('chat-header')).toBeInTheDocument();
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
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