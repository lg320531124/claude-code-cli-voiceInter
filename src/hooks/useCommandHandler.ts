/**
 * useCommandHandler - Handles CLI commands and command palette
 */
import { useState, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import logger from '../utils/logger';

logger.setContext('CommandHandler');

export interface Command {
  name: string;
  action: string;
  description?: string;
  hasInput?: boolean;
  options?: string[];
  cli?: string;
  label?: string;
}

// All available CLI commands
export const CLI_COMMANDS: Command[] = [
  { name: '/new', action: 'new-session' },
  { name: '/resume', action: 'cli-resume' },
  { name: '/continue', action: 'cli-continue' },
  { name: '/fork', action: 'cli-fork' },
  { name: '/model', action: 'cli-model', hasInput: true },
  { name: '/agent', action: 'cli-agent', hasInput: true },
  { name: '/agents', action: 'cli-agents' },
  { name: '/effort', action: 'cli-effort', hasInput: true },
  { name: '/skill', action: 'open-skill-manager' },
  { name: '/skills-disable', action: 'cli-disable-skills' },
  { name: '/plugin', action: 'cli-plugin-list' },
  { name: '/plugin-install', action: 'cli-plugin-install', hasInput: true },
  { name: '/plugin-enable', action: 'cli-plugin-enable', hasInput: true },
  { name: '/plugin-disable', action: 'cli-plugin-disable', hasInput: true },
  { name: '/mcp', action: 'cli-mcp-list' },
  { name: '/mcp-add', action: 'cli-mcp-add', hasInput: true },
  { name: '/mcp-remove', action: 'cli-mcp-remove', hasInput: true },
  { name: '/mcp-get', action: 'cli-mcp-get', hasInput: true },
  { name: '/mcp-config', action: 'cli-mcp-config', hasInput: true },
  { name: '/worktree', action: 'cli-worktree', hasInput: true },
  { name: '/tmux', action: 'cli-tmux' },
  { name: '/auth', action: 'cli-auth' },
  { name: '/setup-token', action: 'cli-setup-token' },
  { name: '/doctor', action: 'cli-doctor' },
  { name: '/update', action: 'cli-update' },
  { name: '/tools', action: 'cli-tools', hasInput: true },
  { name: '/allow-tools', action: 'cli-allow-tools', hasInput: true },
  { name: '/disallow-tools', action: 'cli-disallow-tools', hasInput: true },
  { name: '/permission', action: 'cli-permission', hasInput: true },
  { name: '/clear', action: 'clear-messages' },
  { name: '/export', action: 'export-chat' },
  { name: '/terminal', action: 'terminal-mode' },
  { name: '/bare', action: 'cli-bare' },
  { name: '/verbose', action: 'cli-verbose' },
  { name: '/debug', action: 'cli-debug' },
  { name: '/help', action: 'show-help' },
  { name: '/cli-help', action: 'cli-help' },
];

interface UseCommandHandlerProps {
  onProcessingChange: (processing: boolean) => void;
  onAddMessage: (message: { role: string; content: string }) => void;
  onShowModal: (modal: string) => void;
  onClearMessages: () => void;
  onExportChat: () => void;
  onShowHelp: () => void;
  onSendToClaude: (text: string) => void;
}

export function useCommandHandler({
  onProcessingChange,
  onAddMessage,
  onShowModal,
  onClearMessages,
  onExportChat,
  onShowHelp,
  onSendToClaude,
}: UseCommandHandlerProps) {
  const { sendMessage } = useWebSocket();
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Execute a CLI command
  const executeCliCommand = useCallback(
    (command: string, args: string[] = []) => {
      onProcessingChange(true);
      onAddMessage({
        role: 'user',
        content: `Executing: claude ${command} ${args.join(' ')}`,
      });

      sendMessage({
        type: 'cli-command',
        command,
        args,
      });
    },
    [sendMessage, onProcessingChange, onAddMessage]
  );

  // Execute CLI command with argument
  const executeCliCommandWithArg = useCallback(
    (command: Command, arg: string) => {
      onProcessingChange(true);
      onAddMessage({
        role: 'user',
        content: `${command.name} ${arg}`,
      });

      let cliCommand = '';
      let cliArgs: string[] = [];

      switch (command.action) {
        case 'cli-model':
          cliCommand = '--model';
          cliArgs = [arg];
          break;
        case 'cli-agent':
          cliCommand = '--agent';
          cliArgs = [arg];
          break;
        case 'cli-effort':
          cliCommand = '--effort';
          cliArgs = [arg];
          break;
        case 'cli-plugin-install':
          cliCommand = 'plugin';
          cliArgs = ['install', arg];
          break;
        case 'cli-plugin-enable':
          cliCommand = 'plugin';
          cliArgs = ['enable', arg];
          break;
        case 'cli-plugin-disable':
          cliCommand = 'plugin';
          cliArgs = ['disable', arg];
          break;
        case 'cli-mcp-remove':
          cliCommand = 'mcp';
          cliArgs = ['remove', arg];
          break;
        case 'cli-mcp-get':
          cliCommand = 'mcp';
          cliArgs = ['get', arg];
          break;
        default:
          cliCommand = command.name.replace('/', '');
          cliArgs = arg.split(' ');
      }

      sendMessage({
        type: 'cli-command',
        command: cliCommand,
        args: cliArgs,
      });
    },
    [sendMessage, onProcessingChange, onAddMessage]
  );

  // Handle command selection from palette
  const handleCommandSelect = useCallback(
    (command: Command) => {
      setShowCommandPalette(false);

      if (command.hasInput) {
        if (command.options && command.options.length > 0) {
          onAddMessage({
            role: 'assistant',
            content: `**${command.label}**\n\nAvailable options: ${command.options.map(o => `\`${o}\``).join(', ')}\n\nPlease enter your choice:`,
          });
        } else {
          onAddMessage({
            role: 'assistant',
            content: `**${command.label}**\n\n${command.description}\n\nPlease enter the value:`,
          });
        }
        return;
      }

      // Execute command based on action
      switch (command.action) {
        case 'open-skill-manager':
          onShowModal('skillManager');
          break;
        case 'new-session':
          sendMessage({ type: 'new-session' });
          break;
        case 'clear-messages':
          onClearMessages();
          break;
        case 'export-chat':
          onExportChat();
          break;
        case 'show-help':
          onShowHelp();
          break;
        case 'terminal-mode':
          onSendToClaude('I want to run terminal/shell commands. Help me execute commands in this project.');
          break;
        case 'cli-resume':
          executeCliCommand('--resume');
          break;
        case 'cli-continue':
          executeCliCommand('--continue');
          break;
        case 'cli-fork':
          executeCliCommand('--fork-session');
          break;
        case 'cli-disable-skills':
          executeCliCommand('--disable-slash-commands');
          break;
        case 'cli-bare':
          executeCliCommand('--bare');
          break;
        case 'cli-verbose':
          executeCliCommand('--verbose');
          break;
        case 'cli-debug':
          executeCliCommand('--debug');
          break;
        case 'cli-tmux':
          executeCliCommand('--tmux');
          break;
        case 'cli-agents':
          executeCliCommand('agents');
          break;
        case 'cli-plugin-list':
          executeCliCommand('plugin', ['list']);
          break;
        case 'cli-mcp-list':
          executeCliCommand('mcp', ['list']);
          break;
        case 'cli-auth':
          executeCliCommand('auth');
          break;
        case 'cli-setup-token':
          executeCliCommand('setup-token');
          break;
        case 'cli-doctor':
          executeCliCommand('doctor');
          break;
        case 'cli-update':
          executeCliCommand('update');
          break;
        case 'cli-help':
          executeCliCommand('--help');
          break;
        default:
          logger.warn('Unknown command:', { action: command.action });
          if (command.cli) {
            const parts = command.cli.split(' ');
            const cmd = parts[0] === 'claude' ? parts[1] : parts[0];
            const args = parts.slice(2);
            executeCliCommand(cmd, args);
          }
      }
    },
    [sendMessage, executeCliCommand, onShowModal, onClearMessages, onExportChat, onShowHelp, onSendToClaude]
  );

  // Parse input for command
  const parseCommandInput = useCallback(
    (text: string): { isCommand: boolean; command?: Command; arg?: string } => {
      if (!text.startsWith('/')) {
        return { isCommand: false };
      }

      const matchingCommand = CLI_COMMANDS.find(
        cmd => text === cmd.name || text.startsWith(cmd.name + ' ')
      );

      if (matchingCommand) {
        const argPart = text.startsWith(matchingCommand.name + ' ')
          ? text.slice(matchingCommand.name.length + 1)
          : null;

        return {
          isCommand: true,
          command: matchingCommand,
          arg: argPart || undefined,
        };
      }

      return { isCommand: false };
    },
    []
  );

  return {
    showCommandPalette,
    setShowCommandPalette,
    executeCliCommand,
    executeCliCommandWithArg,
    handleCommandSelect,
    parseCommandInput,
    CLI_COMMANDS,
  };
}