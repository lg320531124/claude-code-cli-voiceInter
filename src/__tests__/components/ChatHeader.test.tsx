/**
 * ChatHeader Component Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ChatHeader from '../../components/ChatHeader';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Sparkles: () => <span data-testid="sparkles-icon">✨</span>,
  Mic: () => <span data-testid="mic-icon">🎤</span>,
  Volume2: () => <span data-testid="volume-icon">🔊</span>,
  RefreshCw: () => <span data-testid="refresh-icon">🔄</span>,
  FileText: () => <span data-testid="file-icon">📄</span>,
  Activity: () => <span data-testid="activity-icon">📊</span>,
  Terminal: () => <span data-testid="terminal-icon">💻</span>,
  Keyboard: () => <span data-testid="keyboard-icon">⌨️</span>,
  Download: () => <span data-testid="download-icon">💾</span>,
  Play: () => <span data-testid="play-icon">▶️</span>,
  MemoryStick: () => <span data-testid="memory-icon">🧠</span>,
  PanelLeft: () => <span data-testid="panel-icon">📋</span>,
  StopCircle: () => <span data-testid="stop-icon">⏹️</span>,
}));

// Mock WaveIndicator
vi.mock('../../components/WaveIndicator', () => ({
  default: () => <div data-testid="wave-indicator">Wave</div>,
}));

describe('ChatHeader', () => {
  const defaultProps = {
    isConnected: true,
    claudeReady: true,
    isProcessing: false,
    voice: { isListening: false, isSpeaking: false },
    conversationMode: false,
    tokenUsage: { cumulative: { totalCostUsd: 0 } },
    messagesLength: 5,
    showConversationList: true,
    onToggleConversationList: vi.fn(),
    onNewSession: vi.fn(),
    onStopResponse: vi.fn(),
    onOpenSkillManager: vi.fn(),
    onOpenTokenStats: vi.fn(),
    onOpenExport: vi.fn(),
    onOpenReplay: vi.fn(),
    onOpenMemoryStats: vi.fn(),
    onToggleCommandSidebar: vi.fn(),
    onOpenShortcutsHelp: vi.fn(),
    commandSidebarOpen: false,
  };

  it('renders connection status correctly', () => {
    render(<ChatHeader {...defaultProps} />);
    expect(screen.getByText('已连接')).toBeInTheDocument();
    expect(screen.getByText('会话就绪')).toBeInTheDocument();
  });

  it('shows disconnected status when not connected', () => {
    render(<ChatHeader {...defaultProps} isConnected={false} />);
    expect(screen.getByText('离线')).toBeInTheDocument();
  });

  it('shows cost badge when there is usage', () => {
    render(<ChatHeader {...defaultProps} tokenUsage={{ cumulative: { totalCostUsd: 0.1234 } }} />);
    expect(screen.getByText('$0.1234')).toBeInTheDocument();
  });

  it('renders title correctly', () => {
    render(<ChatHeader {...defaultProps} />);
    expect(screen.getByText('Claude Voice')).toBeInTheDocument();
  });

  it('disables buttons when not connected', () => {
    render(<ChatHeader {...defaultProps} isConnected={false} />);
    const buttons = screen.getAllByRole('button');
    const disabledButtons = buttons.filter(btn => btn.hasAttribute('disabled'));
    expect(disabledButtons.length).toBeGreaterThan(0);
  });

  it('calls onToggleConversationList when panel button clicked', () => {
    render(<ChatHeader {...defaultProps} />);
    const panelButton = screen.getByTitle('隐藏对话列表');
    panelButton.click();
    expect(defaultProps.onToggleConversationList).toHaveBeenCalled();
  });
});