/**
 * useKeyboardShortcuts - Handles global keyboard shortcuts
 */
import { useEffect } from 'react';
import { shortcuts } from '../config/shortcuts';
import logger from '../utils/logger';

logger.setContext('KeyboardShortcuts');

interface ShortcutHandler {
  (action: string): void;
}

interface UseKeyboardShortcutsProps {
  inputText: string;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  isTyping: boolean;
  onAction: ShortcutHandler;
  dependencies: Record<string, boolean>;
}

export function useKeyboardShortcuts({
  inputText,
  inputRef,
  isTyping,
  onAction,
  dependencies,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Don't trigger when typing in input (except for specific shortcuts)
      const isTypingInInput =
        target === inputRef.current &&
        inputText.length > 0 &&
        !inputText.startsWith('/');

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      // Voice shortcuts - always active
      if (modifierKey) {
        const key = e.key.toUpperCase();

        // Ctrl+V (toggle voice input)
        if (key === 'V' && !e.shiftKey) {
          e.preventDefault();
          onAction('toggle-voice-input');
          return;
        }

        // Ctrl+Shift+V (toggle conversation mode)
        if (key === 'V' && e.shiftKey) {
          e.preventDefault();
          onAction('toggle-conversation-mode');
          return;
        }

        // Ctrl+Space (quick voice start)
        if (e.code === 'Space') {
          e.preventDefault();
          onAction('quick-voice-start');
          return;
        }

        // Ctrl+Shift+S (stop all voice)
        if (key === 'S' && e.shiftKey) {
          e.preventDefault();
          onAction('stop-voice-all');
          return;
        }

        // Conversation shortcuts - always active
        if (key === 'N' && e.shiftKey) {
          e.preventDefault();
          onAction('new-conversation');
          return;
        }

        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault();
          onAction('next-conversation');
          return;
        }

        if (e.key === 'Tab' && e.shiftKey) {
          e.preventDefault();
          onAction('prev-conversation');
          return;
        }

        if (key === 'D' && e.shiftKey) {
          e.preventDefault();
          onAction('delete-conversation');
          return;
        }

        if (key === 'B' && e.shiftKey) {
          e.preventDefault();
          onAction('toggle-conversation-list');
          return;
        }

        // Other shortcuts - skip if typing
        if (isTypingInInput) return;

        // Find matching shortcut
        const shortcut = shortcuts.find(s => {
          const shortcutKey = s.key
            .replace('Ctrl+', '')
            .replace('Ctrl+Shift+', '')
            .replace('⌘', '')
            .replace('⌘⇧', '');
          return shortcutKey === key;
        });

        if (shortcut) {
          e.preventDefault();
          onAction(shortcut.action);
        }
      }

      // Handle Escape key
      if (e.key === 'Escape') {
        e.preventDefault();
        // If voice is active, stop it first
        if (dependencies.conversationMode || dependencies.isListening || dependencies.isSpeaking) {
          onAction('stop-voice-all');
        } else {
          onAction('escape');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [inputText, inputRef, isTyping, onAction, dependencies]);
}