/**
 * useMessageHandler Hook Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageHandler } from '../../hooks/useMessageHandler';

// Mock WebSocket context
vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    latestMessage: null,
    sendMessage: vi.fn(),
  }),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    setContext: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useMessageHandler', () => {
  it('initializes with empty messages', () => {
    const { result } = renderHook(() => useMessageHandler());
    expect(result.current.messages).toEqual([]);
    expect(result.current.isProcessing).toBe(false);
  });

  it('clears messages correctly', () => {
    const { result } = renderHook(() => useMessageHandler());

    act(() => {
      result.current.addMessage({ role: 'user', content: 'Hello' });
    });

    expect(result.current.messages.length).toBe(1);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
  });

  it('adds message correctly', () => {
    const { result } = renderHook(() => useMessageHandler());

    act(() => {
      result.current.addMessage({ role: 'user', content: 'Test message' });
    });

    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].content).toBe('Test message');
    expect(result.current.messages[0].role).toBe('user');
  });

  it('adds multiple messages', () => {
    const { result } = renderHook(() => useMessageHandler());

    act(() => {
      result.current.addMessage({ role: 'user', content: 'User message' });
      result.current.addMessage({ role: 'assistant', content: 'Assistant reply' });
    });

    expect(result.current.messages.length).toBe(2);
  });

  it('stops response correctly', () => {
    const { result } = renderHook(() => useMessageHandler());

    act(() => {
      result.current.stopResponse();
    });

    expect(result.current.isProcessing).toBe(false);
  });

  it('sets processing state correctly', () => {
    const { result } = renderHook(() => useMessageHandler());

    act(() => {
      result.current.setIsProcessing(true);
    });

    expect(result.current.isProcessing).toBe(true);

    act(() => {
      result.current.setIsProcessing(false);
    });

    expect(result.current.isProcessing).toBe(false);
  });
});