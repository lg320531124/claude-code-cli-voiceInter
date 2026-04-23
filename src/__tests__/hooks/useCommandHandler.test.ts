/**
 * useCommandHandler Hook Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandHandler, CLI_COMMANDS } from '../../hooks/useCommandHandler';

// Mock WebSocket context
vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    sendMessage: vi.fn(),
  }),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    setContext: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useCommandHandler', () => {
  const mockOnProcessingChange = vi.fn();
  const mockOnAddMessage = vi.fn();
  const mockOnShowModal = vi.fn();
  const mockOnClearMessages = vi.fn();
  const mockOnExportChat = vi.fn();
  const mockOnShowHelp = vi.fn();
  const mockOnSendToClaude = vi.fn();

  const defaultProps = {
    onProcessingChange: mockOnProcessingChange,
    onAddMessage: mockOnAddMessage,
    onShowModal: mockOnShowModal,
    onClearMessages: mockOnClearMessages,
    onExportChat: mockOnExportChat,
    onShowHelp: mockOnShowHelp,
    onSendToClaude: mockOnSendToClaude,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CLI_COMMANDS', () => {
    it('contains expected commands', () => {
      expect(CLI_COMMANDS.length).toBeGreaterThan(0);
      expect(CLI_COMMANDS.find(c => c.name === '/new')).toBeDefined();
      expect(CLI_COMMANDS.find(c => c.name === '/model')).toBeDefined();
      expect(CLI_COMMANDS.find(c => c.name === '/help')).toBeDefined();
    });

    it('commands have required properties', () => {
      CLI_COMMANDS.forEach(cmd => {
        expect(cmd.name).toBeDefined();
        expect(cmd.action).toBeDefined();
        expect(cmd.name.startsWith('/')).toBe(true);
      });
    });
  });

  describe('parseCommandInput', () => {
    const { result } = renderHook(() => useCommandHandler(defaultProps));

    it('identifies command from input', () => {
      const parsed = result.current.parseCommandInput('/new');
      expect(parsed.isCommand).toBe(true);
      expect(parsed.command?.name).toBe('/new');
    });

    it('identifies command with argument', () => {
      const parsed = result.current.parseCommandInput('/model opus');
      expect(parsed.isCommand).toBe(true);
      expect(parsed.command?.name).toBe('/model');
      expect(parsed.arg).toBe('opus');
    });

    it('returns false for non-command input', () => {
      const parsed = result.current.parseCommandInput('hello world');
      expect(parsed.isCommand).toBe(false);
    });

    it('returns false for unknown command', () => {
      const parsed = result.current.parseCommandInput('/unknowncommand');
      expect(parsed.isCommand).toBe(false);
    });
  });

  describe('showCommandPalette', () => {
    it('initializes as false', () => {
      const { result } = renderHook(() => useCommandHandler(defaultProps));
      expect(result.current.showCommandPalette).toBe(false);
    });

    it('can be toggled', () => {
      const { result } = renderHook(() => useCommandHandler(defaultProps));

      act(() => {
        result.current.setShowCommandPalette(true);
      });

      expect(result.current.showCommandPalette).toBe(true);
    });
  });
});