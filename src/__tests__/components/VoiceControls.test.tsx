/**
 * VoiceControls Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VoiceControls from '../../components/VoiceControls';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Mic: () => <span data-testid="mic-icon">🎤</span>,
  Volume2: () => <span data-testid="volume-icon">🔊</span>,
  Radio: () => <span data-testid="radio-icon">📻</span>,
  StopCircle: () => <span data-testid="stop-icon">⏹️</span>,
  Paperclip: () => <span data-testid="paperclip-icon">📎</span>,
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

  it('renders all buttons', () => {
    render(<VoiceControls {...defaultProps} />);
    expect(screen.getByTestId('mic-icon')).toBeInTheDocument();
    expect(screen.getByTestId('radio-icon')).toBeInTheDocument();
    expect(screen.getByTestId('stop-icon')).toBeInTheDocument();
    expect(screen.getByTestId('paperclip-icon')).toBeInTheDocument();
  });

  it('shows pulsing stop button when voice is active', () => {
    render(<VoiceControls {...defaultProps} voice={{ ...defaultProps.voice, isListening: true }} />);
    const stopButton = screen.getByTitle('⏹️ 停止 - 终止语音输入/输出、对话模式、响应生成');
    expect(stopButton.className).toContain('animate-pulse');
  });

  it('shows conversation mode active style', () => {
    render(<VoiceControls {...defaultProps} conversationMode={true} />);
    const radioButton = screen.getByTitle('结束对话模式');
    expect(radioButton.className).toContain('from-green-500');
  });

  it('disables voice button in conversation mode', () => {
    render(<VoiceControls {...defaultProps} conversationMode={true} />);
    const voiceButton = screen.getByTitle('🎤 点击开始语音输入');
    expect(voiceButton).toBeDisabled();
  });

  it('calls onVoiceClick when voice button clicked', () => {
    render(<VoiceControls {...defaultProps} />);
    const voiceButton = screen.getByTitle('🎤 点击开始语音输入');
    fireEvent.click(voiceButton);
    expect(defaultProps.onVoiceClick).toHaveBeenCalled();
  });

  it('calls onStopAll when stop button clicked', () => {
    render(<VoiceControls {...defaultProps} voice={{ ...defaultProps.voice, isListening: true }} />);
    const stopButton = screen.getByTitle('⏹️ 停止 - 终止语音输入/输出、对话模式、响应生成');
    fireEvent.click(stopButton);
    expect(defaultProps.onStopAll).toHaveBeenCalled();
  });

  it('shows unsupported voice message when not supported', () => {
    render(<VoiceControls {...defaultProps} voice={{ isSupported: false, isListening: false, isSpeaking: false }} />);
    expect(screen.getByTitle('⚠️ 浏览器不支持语音')).toBeInTheDocument();
  });

  it('calls onConversationModeClick when radio button clicked', () => {
    render(<VoiceControls {...defaultProps} />);
    const radioButton = screen.getByTitle('开始双向对话');
    fireEvent.click(radioButton);
    expect(defaultProps.onConversationModeClick).toHaveBeenCalled();
  });

  it('calls onFileUpload when file button clicked', () => {
    render(<VoiceControls {...defaultProps} />);
    const fileButton = screen.getByTitle('📎 上传文件/图片');
    fireEvent.click(fileButton);
    expect(defaultProps.onFileUpload).toHaveBeenCalled();
  });
});