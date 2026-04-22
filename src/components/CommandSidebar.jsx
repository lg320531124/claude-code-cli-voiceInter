import React, { useState } from 'react';
import { commandCategories } from '../config/commands';
import {
  Terminal, HelpCircle, X, ChevronRight
} from 'lucide-react';

/**
 * Command Sidebar Component
 * Visual command selection panel for Claude CLI commands
 */
function CommandSidebar({ isOpen, onClose, onCommandSelect }) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  const handleCategoryClick = (categoryName) => {
    setExpandedCategory(expandedCategory === categoryName ? null : categoryName);
  };

  const handleCommandClick = (command) => {
    onCommandSelect(command);
    // Keep sidebar open for quick multi-command execution
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 z-40 animate-slide-in-right">
      {/* Backdrop */}
      <div
        className="absolute left-0 top-0 bottom-0 w-full-screen-minus-80 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="relative w-full h-full bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">CLI Commands</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Commands List */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {commandCategories.map((category) => (
            <div key={category.name} className="mb-3">
              {/* Category Header */}
              <button
                onClick={() => handleCategoryClick(category.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  expandedCategory === category.name
                    ? 'bg-white/10 border border-white/20'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                  <category.icon className="w-4 h-4 text-white" />
                </div>
                <span className="flex-1 text-sm font-medium text-white">{category.name}</span>
                <span className="text-xs text-white/40">{category.commands.length}</span>
                <ChevronRight
                  className={`w-4 h-4 text-white/50 transition-transform ${
                    expandedCategory === category.name ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Expanded Commands */}
              {expandedCategory === category.name && (
                <div className="mt-2 ml-2 space-y-1">
                  {category.commands.map((cmd) => (
                    <button
                      key={cmd.name}
                      onClick={() => handleCommandClick(cmd)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group"
                    >
                      <cmd.icon className="w-4 h-4 text-white/50 group-hover:text-white/70" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/80 group-hover:text-white flex items-center gap-2">
                          <span className="font-mono text-purple-400">{cmd.name}</span>
                        </div>
                        <div className="text-xs text-white/30 truncate">{cmd.description}</div>
                      </div>
                      {cmd.hasInput && (
                        <span className="text-xs text-purple-400/70 bg-purple-500/10 px-2 py-0.5 rounded">input</span>
                      )}
                      {cmd.options && (
                        <span className="text-xs text-blue-400/70 bg-blue-500/10 px-2 py-0.5 rounded">{cmd.options.length}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 text-xs text-white/30">
          Click category to expand • Click command to execute
        </div>
      </div>
    </div>
  );
}

export default CommandSidebar;