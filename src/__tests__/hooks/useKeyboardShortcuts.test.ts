/**
 * useKeyboardShortcuts Hook Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

// Mock shortcuts config
vi.mock('../../config/shortcuts', () => ({
  shortcuts: [
    { key: 'N', action: 'new-session' },
    { key: 'E', action: 'export-chat' },
  ],
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    setContext: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('useKeyboardShortcuts', () => {
  const mockInputRef = { current: null };
  const mockOnAction = vi.fn();

  const defaultProps = {
    inputText: '',
    inputRef: mockInputRef,
    isTyping: false,
    onAction: mockOnAction,
    dependencies: {
      conversationMode: false,
      isListening: false,
      isSpeaking: false,
    },
  };

  beforeEach(() => {
    mockOnAction.mockClear();
  });

  it('calls toggle-voice-input on Ctrl+V', () => {
    renderHook(() => useKeyboardShortcuts(defaultProps));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'v',
        ctrlKey: true,
        bubbles: true,
      }));
    });

    expect(mockOnAction).toHaveBeenCalledWith('toggle-voice-input');
  });

  it('calls stop-voice-all on Escape when voice is active', () => {
    renderHook(() => useKeyboardShortcuts({
      ...defaultProps,
      dependencies: { conversationMode: true, isListening: false, isSpeaking: false },
    }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }));
    });

    expect(mockOnAction).toHaveBeenCalledWith('stop-voice-all');
  });

  it('calls escape on Escape when no voice activity', () => {
    renderHook(() => useKeyboardShortcuts(defaultProps));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }));
    });

    expect(mockOnAction).toHaveBeenCalledWith('escape');
  });

  it('calls toggle-conversation-mode on Ctrl+Shift+V', () => {
    renderHook(() => useKeyboardShortcuts(defaultProps));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'v',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }));
    });

    expect(mockOnAction).toHaveBeenCalledWith('toggle-conversation-mode');
  });

  it('calls quick-voice-start on Ctrl+Space', () => {
    renderHook(() => useKeyboardShortcuts(defaultProps));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'Space',
        ctrlKey: true,
        bubbles: true,
      }));
    });

    expect(mockOnAction).toHaveBeenCalledWith('quick-voice-start');
  });
});