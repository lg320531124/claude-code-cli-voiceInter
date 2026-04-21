import React, { useState, useEffect, useRef } from 'react';
import { Terminal, HelpCircle, RefreshCw, Trash2, Download, Upload, Settings, FileText } from 'lucide-react';

/**
 * Command Palette Component
 * Shows available CLI commands when user types '/' in input
 */
function CommandPalette({ inputText, onSelectCommand, visible }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    {
      name: '/skill',
      label: 'Open Skill Manager',
      description: 'Import, create, and manage Claude skills',
      icon: FileText,
      action: 'open-skill-manager'
    },
    {
      name: '/help',
      label: 'Show Help',
      description: 'Display available commands and features',
      icon: HelpCircle,
      action: 'show-help'
    },
    {
      name: '/new',
      label: 'New Session',
      description: 'Start a fresh Claude session',
      icon: RefreshCw,
      action: 'new-session'
    },
    {
      name: '/clear',
      label: 'Clear Messages',
      description: 'Clear the conversation history',
      icon: Trash2,
      action: 'clear-messages'
    },
    {
      name: '/export',
      label: 'Export Chat',
      description: 'Download conversation as markdown',
      icon: Download,
      action: 'export-chat'
    },
    {
      name: '/terminal',
      label: 'Terminal Mode',
      description: 'Execute shell commands via Claude',
      icon: Terminal,
      action: 'terminal-mode'
    },
    {
      name: '/settings',
      label: 'Settings',
      description: 'Configure voice and display options',
      icon: Settings,
      action: 'open-settings'
    }
  ];

  // Filter commands based on input
  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(inputText.toLowerCase()) ||
    cmd.label.toLowerCase().includes(inputText.toLowerCase())
  );

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : 0
        );
      } else if (e.key === 'Tab' || (e.key === 'Enter' && inputText.startsWith('/'))) {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelectCommand(filteredCommands[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, selectedIndex, filteredCommands, inputText, onSelectCommand]);

  if (!visible || !inputText.startsWith('/')) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl max-h-[200px] overflow-y-auto">
      <div className="text-xs text-white/30 mb-2 px-2">Commands</div>
      {filteredCommands.length === 0 ? (
        <div className="text-sm text-white/50 px-2 py-2">No matching commands</div>
      ) : (
        <div className="space-y-1">
          {filteredCommands.map((cmd, index) => (
            <div
              key={cmd.name}
              onClick={() => onSelectCommand(cmd)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                index === selectedIndex
                  ? 'bg-purple-500/20 border border-purple-500/30'
                  : 'hover:bg-white/10'
              }`}
            >
              <cmd.icon className={`w-4 h-4 ${index === selectedIndex ? 'text-purple-400' : 'text-white/50'}`} />
              <div className="flex-1">
                <div className={`text-sm ${index === selectedIndex ? 'text-white' : 'text-white/70'}`}>
                  <span className="font-mono">{cmd.name}</span>
                  <span className="ml-2 text-white/50">{cmd.label}</span>
                </div>
                <div className="text-xs text-white/30">{cmd.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="text-xs text-white/20 mt-2 px-2 border-t border-white/5 pt-2">
        ↑↓ Navigate • Tab/Enter Select • Esc Close
      </div>
    </div>
  );
}

export default CommandPalette;