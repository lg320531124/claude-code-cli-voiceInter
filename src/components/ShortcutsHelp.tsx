import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { shortcuts, shortcutCategories } from '../config/shortcuts';

/**
 * Shortcuts Help Modal
 * Shows all keyboard shortcuts organized by category
 */
function ShortcutsHelp({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">键盘快捷键</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Category groups */}
          {Object.entries(shortcutCategories).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                {category}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {categoryShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.action}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-sm text-white/70">{shortcut.description}</span>
                    <kbd className="px-2 py-1 rounded-lg bg-slate-800/50 border border-white/10 text-xs font-mono text-white/90">
                      {shortcut.mac}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5">
          <p className="text-xs text-white/40 text-center">
            macOS: 使用 ⌘ (Command) 键 • Windows/Linux: 使用 Ctrl 键
          </p>
        </div>
      </div>
    </div>
  );
}

export default ShortcutsHelp;