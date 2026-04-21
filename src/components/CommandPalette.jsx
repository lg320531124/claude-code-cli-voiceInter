import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal, HelpCircle, RefreshCw, Trash2, Download, Upload, Settings,
  FileText, Server, Package, User, Shield, Wrench, GitBranch, Cpu, Plug,
  List, Plus, Search, Play, Pause, X, ChevronRight
} from 'lucide-react';

/**
 * Command Palette Component
 * Shows all Claude Code CLI commands when user types '/' in input
 */
function CommandPalette({ inputText, onSelectCommand, visible }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // All CLI commands organized by category
  const commandCategories = [
    {
      name: 'Session',
      icon: Play,
      commands: [
        { name: '/new', label: 'New Session', description: 'Start a fresh Claude session', action: 'new-session', icon: RefreshCw },
        { name: '/resume', label: 'Resume Session', description: 'Resume previous conversation', action: 'cli-resume', icon: Search, cli: 'claude --resume' },
        { name: '/continue', label: 'Continue Session', description: 'Continue most recent conversation', action: 'cli-continue', icon: Play, cli: 'claude --continue' },
        { name: '/fork', label: 'Fork Session', description: 'Create new session from current', action: 'cli-fork', icon: GitBranch, cli: 'claude --fork-session' },
        { name: '/session-id', label: 'Set Session ID', description: 'Use specific session ID', action: 'cli-session-id', icon: FileText, hasInput: true },
      ]
    },
    {
      name: 'Model & Agent',
      icon: Cpu,
      commands: [
        { name: '/model', label: 'Change Model', description: 'Switch to different Claude model', action: 'cli-model', icon: Cpu, hasInput: true, options: ['opus', 'sonnet', 'haiku'] },
        { name: '/agent', label: 'Set Agent', description: 'Use specific agent', action: 'cli-agent', icon: User, hasInput: true },
        { name: '/agents', label: 'List Agents', description: 'List configured agents', action: 'cli-agents', icon: List, cli: 'claude agents' },
        { name: '/effort', label: 'Set Effort', description: 'Set effort level (low/medium/high/xhigh/max)', action: 'cli-effort', icon: Cpu, hasInput: true, options: ['low', 'medium', 'high', 'xhigh', 'max'] },
      ]
    },
    {
      name: 'Skills & Plugins',
      icon: Package,
      commands: [
        { name: '/skill', label: 'Skill Manager', description: 'Import, create, and manage skills', action: 'open-skill-manager', icon: FileText },
        { name: '/skills-disable', label: 'Disable Skills', description: 'Disable all slash commands/skills', action: 'cli-disable-skills', icon: Pause, cli: 'claude --disable-slash-commands' },
        { name: '/plugin', label: 'Plugin Manager', description: 'Manage Claude Code plugins', action: 'cli-plugin-list', icon: Package, cli: 'claude plugin list' },
        { name: '/plugin-install', label: 'Install Plugin', description: 'Install a plugin', action: 'cli-plugin-install', icon: Plus, hasInput: true },
        { name: '/plugin-enable', label: 'Enable Plugin', description: 'Enable a disabled plugin', action: 'cli-plugin-enable', icon: Play, hasInput: true },
        { name: '/plugin-disable', label: 'Disable Plugin', description: 'Disable an enabled plugin', action: 'cli-plugin-disable', icon: Pause, hasInput: true },
      ]
    },
    {
      name: 'MCP Servers',
      icon: Server,
      commands: [
        { name: '/mcp', label: 'MCP List', description: 'List configured MCP servers', action: 'cli-mcp-list', icon: List, cli: 'claude mcp list' },
        { name: '/mcp-add', label: 'Add MCP Server', description: 'Add new MCP server', action: 'cli-mcp-add', icon: Plus, hasInput: true },
        { name: '/mcp-remove', label: 'Remove MCP', description: 'Remove MCP server', action: 'cli-mcp-remove', icon: X, hasInput: true },
        { name: '/mcp-get', label: 'Get MCP Details', description: 'Get MCP server details', action: 'cli-mcp-get', icon: Search, hasInput: true },
        { name: '/mcp-config', label: 'Load MCP Config', description: 'Load MCP servers from file', action: 'cli-mcp-config', icon: FileText, hasInput: true },
      ]
    },
    {
      name: 'Git & Worktree',
      icon: GitBranch,
      commands: [
        { name: '/worktree', label: 'Create Worktree', description: 'Create new git worktree', action: 'cli-worktree', icon: GitBranch, hasInput: true },
        { name: '/tmux', label: 'Tmux Session', description: 'Create tmux session for worktree', action: 'cli-tmux', icon: Terminal, cli: 'claude --tmux' },
      ]
    },
    {
      name: 'Auth & Setup',
      icon: Shield,
      commands: [
        { name: '/auth', label: 'Manage Auth', description: 'Manage authentication', action: 'cli-auth', icon: User, cli: 'claude auth' },
        { name: '/setup-token', label: 'Setup Token', description: 'Set up long-lived auth token', action: 'cli-setup-token', icon: Shield, cli: 'claude setup-token' },
        { name: '/doctor', label: 'Run Doctor', description: 'Check Claude Code health', action: 'cli-doctor', icon: Wrench, cli: 'claude doctor' },
        { name: '/update', label: 'Update CLI', description: 'Check for CLI updates', action: 'cli-update', icon: Download, cli: 'claude update' },
      ]
    },
    {
      name: 'Tools & Permissions',
      icon: Wrench,
      commands: [
        { name: '/tools', label: 'Set Tools', description: 'Specify available tools', action: 'cli-tools', icon: Wrench, hasInput: true },
        { name: '/allow-tools', label: 'Allow Tools', description: 'Allow specific tools', action: 'cli-allow-tools', icon: Plus, hasInput: true },
        { name: '/disallow-tools', label: 'Disallow Tools', description: 'Disallow specific tools', action: 'cli-disallow-tools', icon: X, hasInput: true },
        { name: '/permission', label: 'Permission Mode', description: 'Set permission mode', action: 'cli-permission', icon: Shield, hasInput: true, options: ['acceptEdits', 'auto', 'bypassPermissions', 'default', 'dontAsk', 'plan'] },
      ]
    },
    {
      name: 'Chat Actions',
      icon: Terminal,
      commands: [
        { name: '/clear', label: 'Clear Messages', description: 'Clear conversation history', action: 'clear-messages', icon: Trash2 },
        { name: '/export', label: 'Export Chat', description: 'Download as markdown', action: 'export-chat', icon: Download },
        { name: '/terminal', label: 'Terminal Mode', description: 'Execute shell commands', action: 'terminal-mode', icon: Terminal },
        { name: '/bare', label: 'Bare Mode', description: 'Minimal mode (skip hooks/LSP)', action: 'cli-bare', icon: Pause, cli: 'claude --bare' },
        { name: '/verbose', label: 'Verbose Mode', description: 'Enable verbose output', action: 'cli-verbose', icon: Terminal, cli: 'claude --verbose' },
        { name: '/debug', label: 'Debug Mode', description: 'Enable debug mode', action: 'cli-debug', icon: Terminal, cli: 'claude --debug' },
      ]
    },
    {
      name: 'Help',
      icon: HelpCircle,
      commands: [
        { name: '/help', label: 'Show Help', description: 'Display available commands', action: 'show-help', icon: HelpCircle },
        { name: '/cli-help', label: 'CLI Help', description: 'Show CLI full help', action: 'cli-help', icon: HelpCircle, cli: 'claude --help' },
      ]
    },
  ];

  // Flatten commands for filtering
  const allCommands = commandCategories.flatMap(cat =>
    cat.commands.map(cmd => ({ ...cmd, category: cat.name }))
  );

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
    <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl max-h-[300px] overflow-y-auto">
      <div className="text-xs text-white/30 mb-2 px-2 flex items-center gap-2">
        <Terminal className="w-3 h-3" />
        Claude CLI Commands ({filteredCommands.length} matches)
      </div>
      <div className="space-y-1">
        {filteredCommands.map((cmd, index) => (
          <div
            key={cmd.name}
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
        ↑↓ Navigate • Tab/Enter Select • Esc Close • Commands execute via Claude CLI
      </div>
    </div>
  );
}

export default CommandPalette;