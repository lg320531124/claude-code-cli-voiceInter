import React, { useState, useEffect, useRef } from 'react';
import { commandCategories, getAllCommands } from '../config/commands';
import { Terminal } from 'lucide-react';

/**
 * Command Palette Component
 * Shows all Claude Code CLI built-in commands when user types '/' in input
 */
function CommandPalette({ inputText, onSelectCommand, visible }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Refs for scrolling
  const listRef = useRef(null);
  const selectedItemRef = useRef(null);

  // Flatten commands for filtering (only built-in commands, no skills)
  const allCommands = getAllCommands(commandCategories);

  // Filter commands based on input
  const filteredCommands = inputText.startsWith('/')
    ? allCommands.filter(cmd =>
        cmd.name.toLowerCase().includes(inputText.toLowerCase()) ||
        cmd.label.toLowerCase().includes(inputText.toLowerCase()) ||
        cmd.description.toLowerCase().includes(inputText.toLowerCase())
      )
    : [];

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Scroll to selected item when index changes
  useEffect(() => {
    if (selectedItemRef.current && listRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!visible || filteredCommands.length === 0) return;

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
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Clear input or close palette
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, selectedIndex, filteredCommands, inputText, onSelectCommand]);

  if (!visible || !inputText.startsWith('/') || filteredCommands.length === 0) return null;

  return (
    <div ref={listRef} className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl max-h-[300px] overflow-y-auto">
      <div className="text-xs text-white/30 mb-2 px-2 flex items-center gap-2">
        <Terminal className="w-3 h-3" />
        Claude CLI Commands ({filteredCommands.length} matches)
      </div>
      <div className="space-y-1">
        {filteredCommands.map((cmd, index) => (
          <div
            key={cmd.name}
            ref={index === selectedIndex ? selectedItemRef : null}
            onClick={() => onSelectCommand(cmd)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
              index === selectedIndex
                ? 'bg-purple-500/20 border border-purple-500/30'
                : 'hover:bg-white/10'
            }`}
          >
            <cmd.icon className={`w-4 h-4 ${index === selectedIndex ? 'text-purple-400' : 'text-white/50'}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${index === selectedIndex ? 'text-white' : 'text-white/70'}`}>
                <span className="font-mono text-purple-400">{cmd.name}</span>
                <span className="ml-2">{cmd.label}</span>
              </div>
              <div className="text-xs text-white/30 truncate">{cmd.description}</div>
            </div>
            {cmd.hasInput && (
              <span className="text-xs text-purple-400/70 bg-purple-500/10 px-2 py-0.5 rounded">input</span>
            )}
            {cmd.options && (
              <span className="text-xs text-blue-400/70 bg-blue-500/10 px-2 py-0.5 rounded">{cmd.options.length} options</span>
            )}
            <span className="text-xs text-white/20">{cmd.category}</span>
          </div>
        ))}
      </div>
      <div className="text-xs text-white/20 mt-2 px-2 border-t border-white/5 pt-2">
        ↑↓ Navigate • Tab/Enter Select • Esc Close
      </div>
    </div>
  );
}

export default CommandPalette;