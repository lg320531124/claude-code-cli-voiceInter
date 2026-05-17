/**
 * VoiceControls Component Tests - Simplified UI
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VoiceControls from '../../components/VoiceControls';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Mic: () => <span data-testid="mic-icon">🎤</span>,
  StopCircle: () => <span data-testid="stop-icon">⏹️</span>,
  Radio: () => <span data-testid="radio-icon">📻</span>,
}));

describe('VoiceControls', () => {
  const mockFileInputRef = { current: null };

  const defaultProps = {
    voice: {
      isSupported: true,
      isListening: false,
      isSpeaking: false,
      stopListening: vi.fn(),
      stopSpeaking: vi.fn(),
    },
    conversationMode: false,
    isProcessing: false,
    isConnected: true,
    onVoiceClick: vi.fn(),
    onConversationModeClick: vi.fn(),
    onStopAll: vi.fn(),
    onFileUpload: vi.fn(),
    fileInputRef: mockFileInputRef,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders two buttons: file upload and voice/stop', () => {
    render(<VoiceControls {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Should have exactly 2 visible buttons (excluding hidden file input)
    expect(buttons.length).toBe(2);
  });

  it('shows mic icon when idle', () => {
    render(<VoiceControls {...defaultProps} />);
    expect(screen.getByTestId('mic-icon')).toBeInTheDocument();
  });

  it('shows stop icon when voice is listening', () => {
    render(<VoiceControls {...defaultProps} voice={{ ...defaultProps.voice, isListening: true }} />);
    expect(screen.getByTestId('stop-icon')).toBeInTheDocument();
  });

  it('shows stop icon when voice is speaking', () => {
    render(<VoiceControls {...defaultProps} voice={{ ...defaultProps.voice, isSpeaking: true }} />);
    expect(screen.getByTestId('stop-icon')).toBeInTheDocument();
  });

  it('shows stop icon when processing', () => {
    render(<VoiceControls {...defaultProps} isProcessing={true} />);
    expect(screen.getByTestId('stop-icon')).toBeInTheDocument();
  });

  it('shows radio icon when conversation mode is active', () => {
    render(<VoiceControls {...defaultProps} conversationMode={true} />);
    expect(screen.getByTestId('radio-icon')).toBeInTheDocument();
  });

  it('calls onVoiceClick when voice button clicked in idle state', () => {
    render(<VoiceControls {...defaultProps} />);
    const micIcon = screen.getByTestId('mic-icon');
    const voiceButton = micIcon.closest('button')!;
    fireEvent.click(voiceButton);
    expect(defaultProps.onVoiceClick).toHaveBeenCalled();
  });

  it('calls onStopAll when button clicked in active state', () => {
    render(<VoiceControls {...defaultProps} voice={{ ...defaultProps.voice, isListening: true }} />);
    const stopIcon = screen.getByTestId('stop-icon');
    const stopButton = stopIcon.closest('button')!;
    fireEvent.click(stopButton);
    expect(defaultProps.onStopAll).toHaveBeenCalled();
  });

  it('calls onStopAll when button clicked during processing', () => {
    render(<VoiceControls {...defaultProps} isProcessing={true} />);
    const stopIcon = screen.getByTestId('stop-icon');
    const stopButton = stopIcon.closest('button')!;
    fireEvent.click(stopButton);
    expect(defaultProps.onStopAll).toHaveBeenCalled();
  });

  it('shows disabled state when voice not supported', () => {
    render(<VoiceControls {...defaultProps} voice={{ isSupported: false, isListening: false, isSpeaking: false }} />);
    const buttons = screen.getAllByRole('button');
    const disabledBtn = buttons.find(btn => btn.hasAttribute('disabled'));
    expect(disabledBtn).toBeDefined();
  });

  it('shows pulsing animation when active', () => {
    render(<VoiceControls {...defaultProps} voice={{ ...defaultProps.voice, isListening: true }} />);
    const buttons = screen.getAllByRole('button');
    const pulsingBtn = buttons.find(btn => btn.className.includes('animate-pulse'));
    expect(pulsingBtn).toBeDefined();
  });

  it('shows emerald styling for conversation mode', () => {
    render(<VoiceControls {...defaultProps} conversationMode={true} />);
    const buttons = screen.getAllByRole('button');
    const emeraldBtn = buttons.find(btn => btn.className.includes('emerald'));
    expect(emeraldBtn).toBeDefined();
  });

  it('file upload button exists', () => {
    render(<VoiceControls {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // First button is file upload (has SVG paperclip icon)
    expect(buttons[0]).toBeInTheDocument();
  });

  it('hidden file input exists', () => {
    render(<VoiceControls {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });
});