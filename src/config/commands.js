/**
 * CLI Commands Configuration
 * Claude Code built-in slash commands (from official docs)
 */

import {
  Play, Pause, RefreshCw, Search, Terminal, HelpCircle, Settings,
  FileText, Server, Package, User, Shield, Wrench, GitBranch, Cpu,
  List, Plus, X, ChevronRight, Download, Upload, Trash2, Activity,
  Sparkles, Zap, Globe, Smartphone, Copy, Eye, Timer, Repeat, Volume2
} from 'lucide-react';

// Claude Code Built-in Slash Commands (84 commands)
export const commandCategories = [
  {
    name: 'Session & History',
    icon: Play,
    color: 'from-green-500 to-emerald-500',
    commands: [
      { name: '/clear', label: 'Clear Session', description: 'Start a new conversation, keep old in /resume', action: 'clear-messages', icon: Trash2 },
      { name: '/reset', label: 'Reset Session', description: 'Alias: /clear, /new', action: 'new-session', icon: RefreshCw },
      { name: '/resume', label: 'Resume Session', description: 'Resume previous conversation', action: 'cli-resume', icon: Search },
      { name: '/continue', label: 'Continue Session', description: 'Alias: /resume', action: 'cli-continue', icon: Play },
      { name: '/branch', label: 'Branch Session', description: 'Create branch of conversation, alias: /fork', action: 'cli-branch', icon: GitBranch },
      { name: '/fork', label: 'Fork Session', description: 'Alias: /branch', action: 'cli-fork', icon: GitBranch },
      { name: '/rewind', label: 'Rewind Session', description: 'Rewind to previous point, alias: /undo', action: 'cli-rewind', icon: RefreshCw },
      { name: '/checkpoint', label: 'Checkpoint', description: 'Alias: /rewind', action: 'cli-rewind', icon: FileText },
      { name: '/undo', label: 'Undo', description: 'Alias: /rewind', action: 'cli-rewind', icon: RefreshCw },
      { name: '/rename', label: 'Rename Session', description: 'Rename current session', action: 'cli-rename', icon: FileText, hasInput: true },
      { name: '/exit', label: 'Exit', description: 'Exit CLI, alias: /quit', action: 'cli-exit', icon: X },
      { name: '/quit', label: 'Quit', description: 'Alias: /exit', action: 'cli-exit', icon: X },
    ]
  },
  {
    name: 'Context & Memory',
    icon: Cpu,
    color: 'from-purple-500 to-pink-500',
    commands: [
      { name: '/compact', label: 'Compact Context', description: 'Free up context by summarizing', action: 'cli-compact', icon: RefreshCw },
      { name: '/context', label: 'Context Usage', description: 'Visualize context usage', action: 'cli-context', icon: Activity },
      { name: '/memory', label: 'Memory Files', description: 'Edit CLAUDE.md memory files', action: 'cli-memory', icon: FileText },
      { name: '/add-dir', label: 'Add Directory', description: 'Add working directory', action: 'cli-add-dir', icon: Plus, hasInput: true },
      { name: '/recap', label: 'Session Recap', description: 'Generate session summary', action: 'cli-recap', icon: FileText },
    ]
  },
  {
    name: 'Model & Effort',
    icon: Cpu,
    color: 'from-blue-500 to-cyan-500',
    commands: [
      { name: '/model', label: 'Change Model', description: 'Switch model (opus/sonnet/haiku)', action: 'cli-model', icon: Cpu, hasInput: true, options: ['opus', 'sonnet', 'haiku'] },
      { name: '/effort', label: 'Effort Level', description: 'Set effort (low/medium/high/max)', action: 'cli-effort', icon: Activity, hasInput: true, options: ['low', 'medium', 'high', 'xhigh', 'max', 'auto'] },
      { name: '/fast', label: 'Fast Mode', description: 'Toggle fast mode on/off', action: 'cli-fast', icon: Zap, hasInput: true, options: ['on', 'off'] },
    ]
  },
  {
    name: 'Agents & Plugins',
    icon: Package,
    color: 'from-orange-500 to-red-500',
    commands: [
      { name: '/agents', label: 'Manage Agents', description: 'Manage agent configurations', action: 'cli-agents', icon: List },
      { name: '/plugin', label: 'Plugin Manager', description: 'Manage plugins', action: 'cli-plugin', icon: Package },
      { name: '/skills', label: 'List Skills', description: 'List available skills', action: 'cli-skills', icon: Sparkles },
      { name: '/reload-plugins', label: 'Reload Plugins', description: 'Reload all active plugins', action: 'cli-reload-plugins', icon: RefreshCw },
    ]
  },
  {
    name: 'MCP Servers',
    icon: Server,
    color: 'from-teal-500 to-green-500',
    commands: [
      { name: '/mcp', label: 'MCP Manager', description: 'Manage MCP server connections', action: 'cli-mcp', icon: Server },
    ]
  },
  {
    name: 'Git & Review',
    icon: GitBranch,
    color: 'from-yellow-500 to-orange-500',
    commands: [
      { name: '/review', label: 'Review PR', description: 'Review pull request locally', action: 'cli-review', icon: Eye, hasInput: true },
      { name: '/security-review', label: 'Security Review', description: 'Analyze pending changes for vulnerabilities', action: 'cli-security-review', icon: Shield },
      { name: '/ultrareview', label: 'Ultra Review', description: 'Deep multi-agent code review in cloud', action: 'cli-ultrareview', icon: Eye, hasInput: true },
      { name: '/diff', label: 'Diff Viewer', description: 'View uncommitted changes', action: 'cli-diff', icon: GitBranch },
      { name: '/autofix-pr', label: 'AutoFix PR', description: 'Watch PR and push fixes', action: 'cli-autofix-pr', icon: Wrench, hasInput: true },
      { name: '/install-github-app', label: 'Install GitHub App', description: 'Setup Claude GitHub Actions', action: 'cli-install-github-app', icon: Globe },
    ]
  },
  {
    name: 'Permissions & Tools',
    icon: Shield,
    color: 'from-indigo-500 to-purple-500',
    commands: [
      { name: '/permissions', label: 'Manage Permissions', description: 'Manage allow/ask/deny rules', action: 'cli-permissions', icon: Shield },
      { name: '/allowed-tools', label: 'Allowed Tools', description: 'Alias: /permissions', action: 'cli-permissions', icon: Shield },
      { name: '/fewer-permission-prompts', label: 'Fewer Prompts', description: 'Reduce permission prompts', action: 'cli-fewer-prompts', icon: Wrench },
      { name: '/sandbox', label: 'Sandbox Mode', description: 'Toggle sandbox mode', action: 'cli-sandbox', icon: Shield },
    ]
  },
  {
    name: 'Plan & Batch',
    icon: FileText,
    color: 'from-pink-500 to-rose-500',
    commands: [
      { name: '/plan', label: 'Plan Mode', description: 'Enter plan mode', action: 'cli-plan', icon: FileText, hasInput: true },
      { name: '/ultraplan', label: 'Ultra Plan', description: 'Draft plan in ultraplan session', action: 'cli-ultraplan', icon: FileText, hasInput: true },
      { name: '/batch', label: 'Batch Changes', description: 'Large-scale parallel changes', action: 'cli-batch', icon: GitBranch, hasInput: true },
      { name: '/simplify', label: 'Simplify Code', description: 'Review and fix code issues', action: 'cli-simplify', icon: Wrench, hasInput: true },
    ]
  },
  {
    name: 'Loop & Schedule',
    icon: Timer,
    color: 'from-cyan-500 to-blue-500',
    commands: [
      { name: '/loop', label: 'Loop Mode', description: 'Run prompt repeatedly, alias: /proactive', action: 'cli-loop', icon: Repeat, hasInput: true },
      { name: '/proactive', label: 'Proactive', description: 'Alias: /loop', action: 'cli-loop', icon: Repeat },
      { name: '/schedule', label: 'Schedule Tasks', description: 'Create routines, alias: /routines', action: 'cli-schedule', icon: Timer, hasInput: true },
      { name: '/routines', label: 'Routines', description: 'Alias: /schedule', action: 'cli-schedule', icon: Timer },
      { name: '/tasks', label: 'Background Tasks', description: 'List/manage background tasks', action: 'cli-tasks', icon: List },
      { name: '/bashes', label: 'Bashes', description: 'Alias: /tasks', action: 'cli-tasks', icon: List },
    ]
  },
  {
    name: 'Auth & Setup',
    icon: User,
    color: 'from-gray-500 to-gray-600',
    commands: [
      { name: '/login', label: 'Login', description: 'Sign in to Anthropic account', action: 'cli-login', icon: User },
      { name: '/logout', label: 'Logout', description: 'Sign out from account', action: 'cli-logout', icon: X },
      { name: '/doctor', label: 'Run Doctor', description: 'Diagnose installation', action: 'cli-doctor', icon: Wrench },
      { name: '/init', label: 'Init Project', description: 'Initialize CLAUDE.md guide', action: 'cli-init', icon: FileText },
      { name: '/setup-bedrock', label: 'Setup Bedrock', description: 'Configure Amazon Bedrock', action: 'cli-setup-bedrock', icon: Server },
      { name: '/setup-vertex', label: 'Setup Vertex', description: 'Configure Google Vertex AI', action: 'cli-setup-vertex', icon: Server },
    ]
  },
  {
    name: 'Cost & Stats',
    icon: Activity,
    color: 'from-emerald-500 to-green-500',
    commands: [
      { name: '/cost', label: 'Token Cost', description: 'Show token usage statistics', action: 'cli-cost', icon: Activity },
      { name: '/usage', label: 'Plan Usage', description: 'Show usage limits and rate limits', action: 'cli-usage', icon: Activity },
      { name: '/stats', label: 'Usage Stats', description: 'Visualize daily usage', action: 'cli-stats', icon: Activity },
      { name: '/extra-usage', label: 'Extra Usage', description: 'Configure extra usage', action: 'cli-extra-usage', icon: Activity },
      { name: '/insights', label: 'Insights', description: 'Analyze session patterns', action: 'cli-insights', icon: Activity },
    ]
  },
  {
    name: 'Settings & Config',
    icon: Settings,
    color: 'from-violet-500 to-purple-500',
    commands: [
      { name: '/config', label: 'Settings', description: 'Open settings interface, alias: /settings', action: 'cli-config', icon: Settings },
      { name: '/settings', label: 'Settings', description: 'Alias: /config', action: 'cli-config', icon: Settings },
      { name: '/theme', label: 'Change Theme', description: 'Change color theme', action: 'cli-theme', icon: Settings },
      { name: '/color', label: 'Prompt Color', description: 'Set prompt bar color', action: 'cli-color', icon: Settings, hasInput: true },
      { name: '/statusline', label: 'Status Line', description: 'Configure status line', action: 'cli-statusline', icon: Settings },
      { name: '/keybindings', label: 'Keybindings', description: 'Open keybindings config', action: 'cli-keybindings', icon: Settings },
      { name: '/hooks', label: 'Hooks Config', description: 'View hook configurations', action: 'cli-hooks', icon: Settings },
      { name: '/status', label: 'Status', description: 'Show version/model/account', action: 'cli-status', icon: Activity },
    ]
  },
  {
    name: 'Copy & Export',
    icon: Copy,
    color: 'from-sky-500 to-blue-500',
    commands: [
      { name: '/copy', label: 'Copy Response', description: 'Copy last response to clipboard', action: 'cli-copy', icon: Copy, hasInput: true },
      { name: '/export', label: 'Export Chat', description: 'Export conversation as text', action: 'export-chat', icon: Download, hasInput: true },
    ]
  },
  {
    name: 'Remote & Web',
    icon: Globe,
    color: 'from-rose-500 to-pink-500',
    commands: [
      { name: '/remote-control', label: 'Remote Control', description: 'Make session available for remote, alias: /rc', action: 'cli-remote-control', icon: Globe },
      { name: '/rc', label: 'Remote Control', description: 'Alias: /remote-control', action: 'cli-remote-control', icon: Globe },
      { name: '/teleport', label: 'Teleport', description: 'Pull web session to terminal, alias: /tp', action: 'cli-teleport', icon: Globe },
      { name: '/tp', label: 'Teleport', description: 'Alias: /teleport', action: 'cli-teleport', icon: Globe },
      { name: '/web-setup', label: 'Web Setup', description: 'Connect GitHub to web', action: 'cli-web-setup', icon: Globe },
      { name: '/remote-env', label: 'Remote Env', description: 'Configure remote environment', action: 'cli-remote-env', icon: Settings },
    ]
  },
  {
    name: 'Desktop & Mobile',
    icon: Smartphone,
    color: 'from-fuchsia-500 to-purple-500',
    commands: [
      { name: '/desktop', label: 'Desktop App', description: 'Continue in Desktop app, alias: /app', action: 'cli-desktop', icon: Smartphone },
      { name: '/app', label: 'Desktop App', description: 'Alias: /desktop', action: 'cli-desktop', icon: Smartphone },
      { name: '/mobile', label: 'Mobile App', description: 'Show QR for mobile app', action: 'cli-mobile', icon: Smartphone },
      { name: '/ios', label: 'iOS App', description: 'Alias: /mobile', action: 'cli-mobile', icon: Smartphone },
      { name: '/android', label: 'Android App', description: 'Alias: /mobile', action: 'cli-mobile', icon: Smartphone },
      { name: '/voice', label: 'Voice Mode', description: 'Toggle push-to-talk voice', action: 'cli-voice', icon: Volume2 },
      { name: '/chrome', label: 'Chrome Setup', description: 'Configure Claude in Chrome', action: 'cli-chrome', icon: Globe },
    ]
  },
  {
    name: 'UI & Terminal',
    icon: Terminal,
    color: 'from-slate-500 to-gray-600',
    commands: [
      { name: '/tui', label: 'TUI Renderer', description: 'Set terminal UI renderer', action: 'cli-tui', icon: Terminal, hasInput: true, options: ['default', 'fullscreen'] },
      { name: '/focus', label: 'Focus View', description: 'Toggle focus view', action: 'cli-focus', icon: Eye },
      { name: '/terminal-setup', label: 'Terminal Setup', description: 'Configure terminal shortcuts', action: 'cli-terminal-setup', icon: Terminal },
      { name: '/ide', label: 'IDE Status', description: 'Manage IDE integrations', action: 'cli-ide', icon: Terminal },
    ]
  },
  {
    name: 'Help & Feedback',
    icon: HelpCircle,
    color: 'from-gray-400 to-gray-500',
    commands: [
      { name: '/help', label: 'Help', description: 'Show help and commands', action: 'show-help', icon: HelpCircle },
      { name: '/btw', label: 'Side Question', description: 'Ask quick side question', action: 'cli-btw', icon: HelpCircle, hasInput: true },
      { name: '/feedback', label: 'Feedback', description: 'Submit feedback, alias: /bug', action: 'cli-feedback', icon: HelpCircle, hasInput: true },
      { name: '/bug', label: 'Bug Report', description: 'Alias: /feedback', action: 'cli-feedback', icon: HelpCircle },
      { name: '/powerup', label: 'PowerUp', description: 'Discover features via lessons', action: 'cli-powerup', icon: Sparkles },
      { name: '/release-notes', label: 'Release Notes', description: 'View changelog', action: 'cli-release-notes', icon: FileText },
    ]
  },
  {
    name: 'Misc',
    icon: Sparkles,
    color: 'from-amber-500 to-yellow-500',
    commands: [
      { name: '/debug', label: 'Debug Mode', description: 'Enable debug logging', action: 'cli-debug', icon: Terminal, hasInput: true },
      { name: '/heapdump', label: 'Heap Dump', description: 'Write JS heap snapshot', action: 'cli-heapdump', icon: Activity },
      { name: '/upgrade', label: 'Upgrade Plan', description: 'Open upgrade page', action: 'cli-upgrade', icon: Download },
      { name: '/passes', label: 'Passes', description: 'Share free week with friends', action: 'cli-passes', icon: Sparkles },
      { name: '/stickers', label: 'Stickers', description: 'Order Claude stickers', action: 'cli-stickers', icon: Sparkles },
      { name: '/privacy-settings', label: 'Privacy Settings', description: 'View/update privacy settings', action: 'cli-privacy-settings', icon: Shield },
      { name: '/team-onboarding', label: 'Team Onboarding', description: 'Generate onboarding guide', action: 'cli-team-onboarding', icon: FileText },
    ]
  },
];

// Flatten all commands for filtering
export const getAllCommands = (categories) => {
  return categories.flatMap(cat =>
    cat.commands.map(cmd => ({ ...cmd, category: cat.name }))
  );
};