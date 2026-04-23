/**
 * Tests for ChatInput component - simplified with proper props
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock dependencies
vi.mock('../../components/VoiceControls', () => ({
  default: () => <div data-testid="voice-controls">Voice Controls</div>,
}));

vi.mock('../../components/CommandPalette', () => ({
  default: () => <div data-testid="command-palette">Command Palette</div>,
}));

vi.mock('lucide-react', () => ({
  Send: () => <span data-testid="send-icon">Send</span>,
  FileText: () => <span data-testid="file-icon">File</span>,
  X: () => <span data-testid="x-icon">X</span>,
}));

import ChatInput from '../../components/ChatInput';

describe('ChatInput', () => {
  const mockProps = {
    inputText: '',
    setInputText: vi.fn(),
    inputRef: { current: null },
    isConnected: true,
    isProcessing: false,
    isSending: false,
    attachments: [],
    setAttachments: vi.fn(),
    voice: {
      isSupported: true,
      isListening: false,
      isSpeaking: false,
      isInitialized: true,
      interimTranscript: '',
      stopListening: vi.fn(),
      stopSpeaking: vi.fn(),
    },
    conversationMode: false,
    showCommandPalette: false,
    setShowCommandPalette: vi.fn(),
    onSubmit: vi.fn(),
    onVoiceClick: vi.fn(),
    onConversationModeClick: vi.fn(),
    onStopAll: vi.fn(),
    onCommandSelect: vi.fn(),
    sendMessage: vi.fn(),
    handleCompositionStart: vi.fn(),
    handleCompositionEnd: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render textarea', () => {
    render(<ChatInput {...mockProps} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render voice controls', () => {
    render(<ChatInput {...mockProps} />);

    expect(screen.getByTestId('voice-controls')).toBeInTheDocument();
  });

  it('should handle text input change', () => {
    render(<ChatInput {...mockProps} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello' } });

    expect(mockProps.setInputText).toHaveBeenCalledWith('Hello');
  });

  it('should call setInputText on change', () => {
    render(<ChatInput {...mockProps} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello' } });

    expect(mockProps.setInputText).toHaveBeenCalledWith('Hello');
  });

  it('should render with processing state', () => {
    render(<ChatInput {...mockProps} isProcessing={true} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render with sending state', () => {
    render(<ChatInput {...mockProps} isSending={true} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should show command palette when active', () => {
    render(<ChatInput {...mockProps} showCommandPalette={true} />);

    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('should render without crashing', () => {
    const { container } = render(<ChatInput {...mockProps} />);
    expect(container).toBeDefined();
  });
});
