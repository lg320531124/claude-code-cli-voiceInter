import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useVoiceInteraction } from '../hooks/useVoiceRecognition';
import logger from '../utils/logger';
import {
  Send,
  Sparkles,
  User,
  Mic,
  Volume2,
  MoreHorizontal,
  RefreshCw,
  FileText,
  Settings,
  Activity,
  Terminal,
  CommandIcon,
  Keyboard,
  Radio,
  Download,
  Menu,
  PanelLeft,
  Play,
  MemoryStick,
  Paperclip,
  Image,
  X,
} from 'lucide-react';

// Lazy load modal components (only loaded when needed)
const SkillManager = lazy(() => import('./SkillManager'));
const TokenStats = lazy(() => import('./TokenStats'));
const CommandSidebar = lazy(() => import('./CommandSidebar'));
const ShortcutsHelp = lazy(() => import('./ShortcutsHelp'));
const ExportPanel = lazy(() => import('./ExportPanel'));
const ConversationReplay = lazy(() => import('./ConversationReplay'));
const MemoryStats = lazy(() => import('./MemoryStats'));

// Regular imports for always-visible components
import CommandPalette from './CommandPalette';
import VoicePanel, { useVoicePanelRef } from './VoicePanel';
import ConversationList from './ConversationList';
import RealtimeSubtitles, { SubtitlesControl } from './RealtimeSubtitles';
import { useHybridTTS } from '../hooks/useHybridTTS';
import { shortcuts, shortcutActions } from '../config/shortcuts';
import {
  loadConversations,
  saveConversations,
  getActiveConversationId,
  setActiveConversationId,
  createConversation,
  getConversation,
  updateConversation,
} from '../utils/conversationManager';

// Set context for Chat logs
logger.setContext('Chat');

function Chat() {
  const { isConnected, sendMessage, latestMessage } = useWebSocket();

  // 对话管理状态
  const [conversations, setConversations] = useState(() => loadConversations());
  const [activeConversationId, setActiveConversationId] = useState(() => {
    const saved = getActiveConversationId();
    if (saved) return saved;
    // 如果没有保存的活动对话，创建一个新的
    return null;
  });
  const [showConversationList, setShowConversationList] = useState(true);

  // 当前对话的消息
  const [messages, setMessages] = useState(() => {
    // 从活动对话加载消息
    const convId = getActiveConversationId();
    if (convId) {
      const convs = loadConversations();
      const conv = convs.find(c => c.id === convId);
      if (conv && conv.messages) {
        logger.debug('Loaded messages from conversation:', {
          id: conv.id,
          count: conv.messages.length,
        });
        return conv.messages.slice(-50);
      }
    }
    // 尝试从旧格式加载
    try {
      const saved = localStorage.getItem('claude-chat-messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        logger.debug('Loaded saved messages:', { count: parsed.length });
        return parsed.slice(-50);
      }
    } catch (e) {
      logger.warn('Failed to load saved messages:', { error: e });
    }
    return [];
  });

  // Stream buffer for accumulating streaming content
  const streamBufferRef = useRef('');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false); // 发送动画状态
  const [sessionId, setSessionId] = useState(null);
  const [claudeReady, setClaudeReady] = useState(false);
  const [isComposing, setIsComposing] = useState(false); // Input method composition state

  // File attachments
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // 保存消息到当前对话
  useEffect(() => {
    if (activeConversationId && messages.length > 0) {
      const updated = updateConversation(conversations, activeConversationId, { messages });
      setConversations(updated);
      saveConversations(updated);
    }
  }, [messages, activeConversationId]);

  // 切换对话
  const handleConversationSelect = useCallback(
    convId => {
      setActiveConversationId(convId);
      setActiveConversationId(convId);

      // 加载对话的消息
      const conv = getConversation(conversations, convId);
      if (conv && conv.messages) {
        setMessages(conv.messages.slice(-50));
      } else {
        setMessages([]);
      }
    },
    [conversations]
  );

  // 创建新对话
  const handleConversationCreate = useCallback(
    newConv => {
      const updated = [...conversations, newConv];
      setConversations(updated);
      saveConversations(updated);
    },
    [conversations]
  );

  // 删除对话
  const handleConversationDelete = useCallback(
    convId => {
      const updated = conversations.filter(c => c.id !== convId);
      setConversations(updated);
      saveConversations(updated);
    },
    [conversations]
  );

  // 开始新会话 - 现在会创建新对话
  const startNewConversation = useCallback(() => {
    const newConv = createConversation();
    const updated = [...conversations, newConv];
    setConversations(updated);
    saveConversations(updated);
    setActiveConversationId(newConv.id);
    setActiveConversationId(newConv.id);
    setMessages([]);
    setSessionId(null);
  }, [conversations]);
  const [showSkillManager, setShowSkillManager] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showTokenStats, setShowTokenStats] = useState(false);
  const [showCommandSidebar, setShowCommandSidebar] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showReplayPanel, setShowReplayPanel] = useState(false);
  const [showMemoryStats, setShowMemoryStats] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState(null);
  const [compactMode, setCompactMode] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const [conversationMode, setConversationMode] = useState(false); // 双向对话模式
  const voicePanelRef = useVoicePanelRef();

  // 实时字幕控制
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [subtitlePosition, setSubtitlePosition] = useState('bottom');
  const [showSubtitleInterim, setShowSubtitleInterim] = useState(true);
  const [currentTtsText, setCurrentTtsText] = useState('');
  const [currentSttText, setCurrentSttText] = useState('');

  const [currentModel, setCurrentModel] = useState('sonnet');
  const [effortLevel, setEffortLevel] = useState('medium');

  // Token usage tracking
  const [tokenUsage, setTokenUsage] = useState({
    session: {
      inputTokens: 0,
      outputTokens: 0,
      totalCostUsd: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      modelUsage: {},
      apiCallCount: 0, // API calls in current session
    },
    cumulative: {
      inputTokens: 0,
      outputTokens: 0,
      totalCostUsd: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      requests: 0,
      apiCallCount: 0, // Total API calls
    },
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const voiceErrorShownRef = useRef(new Set());
  const voiceOriginalInputRef = useRef(null); // null means not captured yet

  const handleVoiceResult = useCallback(text => {
    if (text.trim()) {
      sendToClaude(text);
    }
  }, []);

  const voice = useVoiceInteraction({
    language: 'zh-CN',
    onSpeechResult: handleVoiceResult,
    autoSpeakResponse: true,
  });

  // History message TTS (separate from conversation TTS)
  const historyTTS = useHybridTTS({
    voice: 'af_sky',
    speed: 1.0,
    language: 'zh-CN',
    preferKokoro: true,
  });

  // Speak message content
  const handleSpeakMessage = useCallback(
    content => {
      if (!content || !content.trim()) return;
      // Stop any current TTS
      historyTTS.stop();
      // Speak the message
      historyTTS.speak(content);
    },
    [historyTTS]
  );

  // Store original input when voice starts (only once)
  useEffect(() => {
    if (voice.isListening && voiceOriginalInputRef.current === null) {
      // Capture current input when starting to listen
      voiceOriginalInputRef.current = inputText;
    }
    if (!voice.isListening) {
      // Reset when voice stops
      voiceOriginalInputRef.current = null;
    }
  }, [voice.isListening, inputText]);

  // Show voice interim transcript appended to original input
  useEffect(() => {
    if (voice.interimTranscript && voice.isListening) {
      const original = voiceOriginalInputRef.current ?? '';
      const combined = original + (original ? ' ' : '') + voice.interimTranscript;
      setInputText(combined);
    }
  }, [voice.interimTranscript, voice.isListening]);

  // Show voice final transcript appended to original input (not auto-send)
  useEffect(() => {
    if (voice.transcript && voice.transcript.trim()) {
      const original = voiceOriginalInputRef.current ?? '';
      const combined = original + (original ? ' ' : '') + voice.transcript;
      setInputText(combined);
      voiceOriginalInputRef.current = null; // Reset after final
      inputRef.current?.focus();
    }
  }, [voice.transcript]);

  // Show voice error as message
  useEffect(() => {
    if (voice.error && voice.errorMessage) {
      // Only show error once per error change
      if (!voiceErrorShownRef.current.has(voice.error)) {
        voiceErrorShownRef.current.add(voice.error);
        setMessages(prev => [
          ...prev,
          {
            role: 'error',
            content: `⚠️ 语音错误：${voice.errorMessage}\n\n请检查：\n1. 麦克风是否正常工作\n2. 浏览器是否允许麦克风权限\n3. 是否使用 Chrome/Safari/Edge 浏览器`,
          },
        ]);
      }
    }
  }, [voice.error, voice.errorMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('claude-chat-messages', JSON.stringify(messages));
    } catch (e) {
      // localStorage might be full or disabled
      logger.warn('Failed to save messages:', { error: e });
    }
  }, [messages]);

  useEffect(() => {
    if (!latestMessage) return;

    logger.debug('Received message:', { type: latestMessage.type, data: latestMessage });

    const {
      type,
      data,
      error,
      message,
      sessionId: newSessionId,
      claudeReady: ready,
    } = latestMessage;

    if (type === 'connected') {
      setClaudeReady(true);
      if (newSessionId) setSessionId(newSessionId);
    }

    if (type === 'session-reset' && newSessionId) {
      setSessionId(newSessionId);
      setMessages([]);
    }

    if (type === 'status') {
      if (message === 'Processing...') {
        setIsProcessing(true);
        streamBufferRef.current = ''; // Reset stream buffer
      }
    }

    // Handle streaming content (real-time updates)
    if (type === 'stream-delta') {
      const content = latestMessage.content || '';
      if (content) {
        streamBufferRef.current += content;
        // 更新字幕文本 (流式响应)
        setCurrentTtsText(streamBufferRef.current);
        // Update UI with streaming content
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant' && lastMsg.isStreaming) {
            // Update existing streaming message
            return [...prev.slice(0, -1), { ...lastMsg, content: streamBufferRef.current }];
          }
          // Add new streaming message
          return [
            ...prev,
            { role: 'assistant', content: streamBufferRef.current, isStreaming: true },
          ];
        });
      }
    }

    // Handle final response
    if (type === 'claude-response' && data) {
      logger.debug('claude-response data:', { data });
      setIsProcessing(false);
      const content = data.content || '';
      if (content.trim()) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          // 防止重复，但允许更新（比如流式更新的内容）
          if (lastMsg?.role === 'assistant' && lastMsg.content === content) {
            logger.debug('Skipping duplicate message');
            return prev;
          }
          logger.debug('Adding assistant message:', {
            preview: content.substring(0, 50),
          });
          return [...prev, { role: 'assistant', content }];
        });
        // 更新字幕文本
        setCurrentTtsText(content);
        // 自动朗读响应
        if (voice.isSupported && voice.isSpeaking === false) {
          voice.speak(content);
        }
      }
    }

    if (type === 'complete') {
      setIsProcessing(false);
    }

    // Handle CLI result
    if (type === 'cli-result') {
      setIsProcessing(false);
      const { command, args, exitCode, output, error: cliError } = latestMessage;

      let content = `**CLI Result** (exit code: ${exitCode})\n\n`;
      content += `Command: \`claude ${command} ${args?.join(' ') || ''}\`\n\n`;

      if (output) {
        content += `**Output:**\n\`\`\`\n${output}\n\`\`\`\n`;
      }

      if (cliError) {
        content += `\n**Error:**\n\`\`\`\n${cliError}\n\`\`\`\n`;
      }

      if (!output && !cliError) {
        content += `_(No output)_`;
      }

      setMessages(prev => [...prev, { role: 'assistant', content }]);
    }

    if (type === 'cli-error') {
      setIsProcessing(false);
      const { command, error: cliError } = latestMessage;
      setMessages(prev => [
        ...prev,
        {
          role: 'error',
          content: `CLI Error (${command}): ${cliError}`,
        },
      ]);
    }

    if (type === 'error') {
      setIsProcessing(false);
      setMessages(prev => [...prev, { role: 'error', content: error || 'Unknown error' }]);
    }

    // Handle token usage updates (from assistant messages)
    if (type === 'token-usage') {
      const { usage } = latestMessage;
      setTokenUsage(prev => ({
        ...prev,
        session: {
          ...prev.session,
          inputTokens: usage.inputTokens || 0,
          outputTokens: usage.outputTokens || 0,
        },
      }));
    }

    // Handle final token usage (from result messages)
    if (type === 'token-usage-final') {
      const { usage } = latestMessage;
      setTokenUsage(prev => {
        const newCumulative = {
          inputTokens: prev.cumulative.inputTokens + (usage.inputTokens || 0),
          outputTokens: prev.cumulative.outputTokens + (usage.outputTokens || 0),
          totalCostUsd: prev.cumulative.totalCostUsd + (usage.totalCostUsd || 0),
          cacheReadTokens: prev.cumulative.cacheReadTokens + (usage.cacheReadTokens || 0),
          cacheCreationTokens:
            prev.cumulative.cacheCreationTokens + (usage.cacheCreationTokens || 0),
          requests: prev.cumulative.requests + 1,
          apiCallCount: usage.apiCallCount || prev.cumulative.apiCallCount + 1,
        };
        return {
          session: {
            inputTokens: usage.inputTokens || 0,
            outputTokens: usage.outputTokens || 0,
            totalCostUsd: usage.totalCostUsd || 0,
            cacheReadTokens: usage.cacheReadTokens || 0,
            cacheCreationTokens: usage.cacheCreationTokens || 0,
            modelUsage: usage.modelUsage || {},
            apiCallCount: usage.apiCallCount || 0,
          },
          cumulative: newCumulative,
        };
      });
    }
  }, [latestMessage, voice]);

  const sendToClaude = useCallback(
    text => {
      if ((!text.trim() && attachments.length === 0) || !isConnected || isProcessing) return;

      // Build message content with attachments
      let fullContent = text.trim();
      if (attachments.length > 0) {
        const attachmentInfo = attachments
          .map(a => {
            if (a.isImage) {
              return `[图片: ${a.name}]`;
            } else {
              // For text files, include content snippet
              const snippet = a.content.slice(0, 500);
              return `\n---\n文件: ${a.name}\n${snippet}${a.content.length > 500 ? '...(truncated)' : ''}\n---`;
            }
          })
          .join('\n');
        fullContent = fullContent + '\n' + attachmentInfo;
      }

      // 发送动画
      setIsSending(true);
      setMessages(prev => [
        ...prev,
        {
          role: 'user',
          content: fullContent,
          isSending: true,
          attachments:
            attachments.length > 0
              ? attachments.map(a => ({
                  name: a.name,
                  type: a.type,
                  isImage: a.isImage,
                  preview: a.isImage ? a.content : null,
                }))
              : undefined,
        },
      ]);
      setInputText('');
      setAttachments([]); // Clear attachments after sending
      setIsProcessing(true);

      // 短暂延迟后完成发送动画
      setTimeout(() => {
        setIsSending(false);
        // 更新消息状态为已发送
        setMessages(prev =>
          prev.map(m => (m.isSending && m.content === fullContent ? { ...m, isSending: false } : m))
        );
      }, 300);

      if (voice.stopSpeaking) {
        voice.stopSpeaking();
      }

      sendMessage({
        type: 'claude-command',
        command: fullContent,
        options: { cwd: '.' },
      });

      inputRef.current?.focus();
    },
    [isConnected, isProcessing, sendMessage, voice, attachments]
  );

  const startNewSession = useCallback(() => {
    sendMessage({ type: 'new-session' });
    // 创建新对话而不是清空消息
    startNewConversation();
  }, [sendMessage, startNewConversation]);

  // All CLI commands list for matching
  const allCommands = [
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

  const handleSubmit = e => {
    e?.preventDefault();

    const text = inputText.trim();

    // Check if it's a CLI command
    if (text.startsWith('/')) {
      const matchingCommand = allCommands.find(
        cmd => text === cmd.name || text.startsWith(cmd.name + ' ')
      );

      if (matchingCommand) {
        // Extract argument if present
        const argPart = text.startsWith(matchingCommand.name + ' ')
          ? text.slice(matchingCommand.name.length + 1)
          : null;

        // Create command object with potential argument
        const command = { ...matchingCommand };

        if (argPart && matchingCommand.hasInput) {
          // Execute CLI command with argument
          executeCliCommandWithArg(matchingCommand, argPart);
        } else {
          // Execute via command select
          handleCommandSelect(command);
        }

        setInputText('');
        setShowCommandPalette(false);
        return;
      }
    }

    // Regular message to Claude
    sendToClaude(inputText);
  };

  // Execute CLI command with argument
  const executeCliCommandWithArg = (command, arg) => {
    setIsProcessing(true);
    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        content: `${command.name} ${arg}`,
      },
    ]);

    // Build CLI args based on command
    let cliCommand = '';
    let cliArgs = [];

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
        // Generic: use arg as additional argument
        cliCommand = command.name.replace('/', '');
        cliArgs = arg.split(' ');
    }

    sendMessage({
      type: 'cli-command',
      command: cliCommand,
      args: cliArgs,
    });
  };

  const handleKeyDown = e => {
    // Don't send if input method is composing (e.g., typing Chinese)
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle input method composition events (for Chinese/Japanese/Korean input)
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // File attachment handlers
  const handleFileSelect = e => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleDragOver = e => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processFiles = files => {
    const validFiles = files.filter(file => {
      // Limit file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setMessages(prev => [
          ...prev,
          {
            role: 'error',
            content: `⚠️ 文件 "${file.name}" 超过 10MB 限制`,
          },
        ]);
        return false;
      }
      // Check file type (images, documents, code files)
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'text/markdown',
        'application/json',
        'text/csv',
      ];
      const allowedExtensions = [
        '.js',
        '.jsx',
        '.ts',
        '.tsx',
        '.py',
        '.java',
        '.go',
        '.rs',
        '.c',
        '.cpp',
        '.md',
        '.txt',
        '.json',
        '.yaml',
        '.yml',
      ];
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      return allowedTypes.includes(file.type) || allowedExtensions.includes(ext);
    });

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const attachment = {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          content: e.target.result,
          isImage: file.type.startsWith('image/'),
        };
        setAttachments(prev => [...prev, attachment]);
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const removeAttachment = id => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleVoiceClick = () => {
    logger.debug('Voice click:', {
      isSupported: voice.isSupported,
      isInitialized: voice.isInitialized,
    });

    // Check if voice is supported
    if (!voice.isSupported) {
      setMessages(prev => [
        ...prev,
        {
          role: 'error',
          content:
            '⚠️ 浏览器不支持语音识别功能。\n\n请使用以下浏览器：\n- Chrome (推荐)\n- Safari\n- Edge\n\nFirefox 目前不支持 Web Speech API。',
        },
      ]);
      return;
    }

    // Check if initialized
    if (!voice.isInitialized) {
      setMessages(prev => [
        ...prev,
        {
          role: 'error',
          content: '⚠️ 语音功能尚未初始化，请稍后再试。',
        },
      ]);
      return;
    }

    // Handle click
    if (voice.isSpeaking && voice.stopSpeaking) {
      voice.stopSpeaking();
    } else if (voice.toggleListening) {
      voice.toggleListening();
    }
  };

  // Handle conversation mode (bidirectional voice)
  const handleConversationModeClick = () => {
    setConversationMode(!conversationMode);
    if (!conversationMode) {
      // 进入对话模式时关闭原有的语音功能
      if (voice.isListening && voice.stopListening) {
        voice.stopListening();
      }
      if (voice.isSpeaking && voice.stopSpeaking) {
        voice.stopSpeaking();
      }
    }
  };

  // Handle user speech in conversation mode
  const handleConversationUserSpeech = text => {
    if (text.trim()) {
      setCurrentSttText(text);
      sendToClaude(text);
    }
  };

  // Handle assistant speech in conversation mode
  const handleConversationAssistantSpeech = text => {
    logger.debug('Assistant said:', { preview: text.substring(0, 50) });
    setCurrentTtsText(text);
  };

  // Handle voice command execution
  const handleVoiceCommandExecute = (action, commandId) => {
    logger.debug('Voice command executed:', { action, commandId });
    executeShortcutAction(action);
  };

  // Handle command palette selection
  const handleCommandSelect = command => {
    setInputText('');
    setShowCommandPalette(false);

    // Check if command requires input
    if (command.hasInput) {
      // Show input dialog or send to Claude for input
      if (command.options && command.options.length > 0) {
        // Show options in message
        const optionsContent = `**${command.label}**\n\nAvailable options: ${command.options.map(o => `\`${o}\``).join(', ')}\n\nPlease enter your choice:`;
        setMessages(prev => [...prev, { role: 'assistant', content: optionsContent }]);
      } else {
        // Prompt for input
        const promptContent = `**${command.label}**\n\n${command.description}\n\nPlease enter the value:`;
        setMessages(prev => [...prev, { role: 'assistant', content: promptContent }]);
      }
      return;
    }

    // Execute command
    switch (command.action) {
      // UI Commands
      case 'open-skill-manager':
        setShowSkillManager(true);
        break;
      case 'new-session':
        startNewSession();
        break;
      case 'clear-messages':
        setMessages([]);
        break;
      case 'export-chat':
        exportChat();
        break;
      case 'show-help':
        showHelp();
        break;
      case 'terminal-mode':
        sendToClaude(
          'I want to run terminal/shell commands. Help me execute commands in this project.'
        );
        break;

      // CLI Commands with direct execution
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
          // Execute CLI command if provided
          const parts = command.cli.split(' ');
          const cmd = parts[0] === 'claude' ? parts[1] : parts[0];
          const args = parts.slice(2);
          executeCliCommand(cmd, args);
        }
    }
  };

  // Execute CLI command and show result
  const executeCliCommand = (command, args = []) => {
    setIsProcessing(true);
    setMessages(prev => [
      ...prev,
      { role: 'user', content: `Executing: claude ${command} ${args.join(' ')}` },
    ]);

    sendMessage({
      type: 'cli-command',
      command,
      args,
    });
  };

  // Handle input change - show command palette on '/'
  const handleInputChange = e => {
    const value = e.target.value;
    setInputText(value);

    if (value.startsWith('/')) {
      setShowCommandPalette(true);
    } else {
      setShowCommandPalette(false);
    }
  };

  // Export chat as markdown
  const exportChat = () => {
    const content = messages
      .map(m => (m.role === 'user' ? `## User\n${m.content}` : `## Claude\n${m.content}`))
      .join('\n\n---\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Model cycling (opus → sonnet → haiku)
  const cycleModel = () => {
    const models = ['opus', 'sonnet', 'haiku'];
    const currentIndex = models.indexOf(currentModel);
    const nextIndex = (currentIndex + 1) % models.length;
    const nextModel = models[nextIndex];
    setCurrentModel(nextModel);
    executeCliCommand('--model', [nextModel]);
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `✅ 已切换模型至 **${nextModel}**`,
      },
    ]);
  };

  // Toggle fast mode
  const toggleFastMode = () => {
    const newMode = !fastMode;
    setFastMode(newMode);
    executeCliCommand('--fast', [newMode ? 'on' : 'off']);
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `✅ Fast 模式已 **${newMode ? '开启' : '关闭'}**`,
      },
    ]);
  };

  // Effort cycling (low → medium → high → max)
  const cycleEffort = () => {
    const efforts = ['low', 'medium', 'high', 'max'];
    const currentIndex = efforts.indexOf(effortLevel);
    const nextIndex = (currentIndex + 1) % efforts.length;
    const nextEffort = efforts[nextIndex];
    setEffortLevel(nextEffort);
    executeCliCommand('--effort', [nextEffort]);
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `✅ Effort 级别已切换至 **${nextEffort}**`,
      },
    ]);
  };

  // Execute shortcut action
  const executeShortcutAction = action => {
    switch (action) {
      case 'new-session':
        startNewSession();
        break;
      case 'clear-messages':
        setMessages([]);
        break;
      case 'export-chat':
        exportChat();
        break;
      case 'toggle-command-sidebar':
        setShowCommandSidebar(prev => !prev);
        break;
      case 'open-skill-manager':
        setShowSkillManager(true);
        break;
      case 'open-token-stats':
        setShowTokenStats(true);
        break;
      case 'toggle-model':
        cycleModel();
        break;
      case 'toggle-fast-mode':
        toggleFastMode();
        break;
      case 'toggle-effort':
        cycleEffort();
        break;
      case 'show-help':
        setShowShortcutsHelp(true);
        break;
      case 'toggle-sidebar':
        setShowCommandSidebar(prev => !prev);
        break;
      case 'toggle-compact-mode':
        setCompactMode(prev => !prev);
        break;
      case 'escape':
        // Close any open modal/sidebar
        if (showSkillManager) setShowSkillManager(false);
        else if (showTokenStats) setShowTokenStats(false);
        else if (showCommandSidebar) setShowCommandSidebar(false);
        else if (showShortcutsHelp) setShowShortcutsHelp(false);
        else if (showCommandPalette) {
          setShowCommandPalette(false);
          setInputText('');
        }
        break;
      case 'reload':
        window.location.reload();
        break;
      // Voice shortcuts
      case 'toggle-voice-input':
        if (!conversationMode) {
          handleVoiceClick();
        }
        break;
      case 'toggle-conversation-mode':
        handleConversationModeClick();
        break;
      case 'quick-voice-start':
        if (!conversationMode && !voice.isListening) {
          handleConversationModeClick();
        }
        break;
      case 'stop-voice-all':
        if (conversationMode) {
          handleConversationModeClick(); // Stop conversation mode
        } else if (voice.isListening) {
          voice.stopListening?.();
        } else if (voice.isSpeaking) {
          voice.stopSpeaking?.();
        }
        break;
      // Conversation shortcuts
      case 'new-conversation':
        startNewConversation();
        break;
      case 'prev-conversation':
        if (conversations.length > 0) {
          const currentIndex = conversations.findIndex(c => c.id === activeConversationId);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : conversations.length - 1;
          handleConversationSelect(conversations[prevIndex].id);
        }
        break;
      case 'next-conversation':
        if (conversations.length > 0) {
          const currentIndex = conversations.findIndex(c => c.id === activeConversationId);
          const nextIndex = currentIndex < conversations.length - 1 ? currentIndex + 1 : 0;
          handleConversationSelect(conversations[nextIndex].id);
        }
        break;
      case 'delete-conversation':
        if (activeConversationId) {
          handleConversationDelete(activeConversationId);
        }
        break;
      case 'toggle-conversation-list':
        setShowConversationList(prev => !prev);
        break;
      // Read last message
      case 'read-last-message':
        const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop();
        if (lastAssistantMsg && lastAssistantMsg.content) {
          handleSpeakMessage(lastAssistantMsg.content);
        }
        break;
      default:
        logger.warn('Unknown shortcut action:', { action });
    }
  };

  // Global keyboard shortcuts handler
  useEffect(() => {
    const handleGlobalKeyDown = e => {
      // Don't trigger shortcuts when typing in input (except for specific voice shortcuts)
      const isTypingInInput =
        document.activeElement === inputRef.current &&
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
          executeShortcutAction('toggle-voice-input');
          return;
        }

        // Ctrl+Shift+V (toggle conversation mode)
        if (key === 'V' && e.shiftKey) {
          e.preventDefault();
          executeShortcutAction('toggle-conversation-mode');
          return;
        }

        // Ctrl+Space (quick voice start)
        if (e.code === 'Space') {
          e.preventDefault();
          executeShortcutAction('quick-voice-start');
          return;
        }

        // Ctrl+Shift+S (stop all voice)
        if (key === 'S' && e.shiftKey) {
          e.preventDefault();
          executeShortcutAction('stop-voice-all');
          return;
        }

        // Conversation shortcuts - always active
        // Ctrl+Shift+N (new conversation)
        if (key === 'N' && e.shiftKey) {
          e.preventDefault();
          executeShortcutAction('new-conversation');
          return;
        }

        // Ctrl+Tab (next conversation)
        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault();
          executeShortcutAction('next-conversation');
          return;
        }

        // Ctrl+Shift+Tab (prev conversation)
        if (e.key === 'Tab' && e.shiftKey) {
          e.preventDefault();
          executeShortcutAction('prev-conversation');
          return;
        }

        // Ctrl+Shift+D (delete conversation)
        if (key === 'D' && e.shiftKey) {
          e.preventDefault();
          executeShortcutAction('delete-conversation');
          return;
        }

        // Ctrl+Shift+B (toggle conversation list)
        if (key === 'B' && e.shiftKey) {
          e.preventDefault();
          executeShortcutAction('toggle-conversation-list');
          return;
        }

        // Other shortcuts - skip if typing
        if (isTypingInInput) {
          return;
        }

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
          executeShortcutAction(shortcut.action);
        }
      }

      // Handle Escape key - stop voice operations first
      if (e.key === 'Escape') {
        e.preventDefault();
        // If voice is active, stop it first
        if (conversationMode || voice.isListening || voice.isSpeaking) {
          executeShortcutAction('stop-voice-all');
        } else {
          executeShortcutAction('escape');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    inputText,
    isConnected,
    showSkillManager,
    showTokenStats,
    showCommandSidebar,
    showShortcutsHelp,
    showCommandPalette,
    conversationMode,
    voice.isListening,
    voice.isSpeaking,
  ]);

  // Show help message
  const showHelp = () => {
    const helpContent = `**Claude Code CLI VoiceInter - Commands**

Type \`/\` in the input to see all available CLI commands.

**Session Commands:**
- \`/new\` - New session
- \`/resume\` - Resume previous session
- \`/continue\` - Continue recent session
- \`/fork\` - Fork current session

**Model & Agent:**
- \`/model\` - Change model (opus/sonnet/haiku)
- \`/agent\` - Set agent
- \`/agents\` - List agents
- \`/effort\` - Set effort level

**Skills & Plugins:**
- \`/skill\` - Open Skill Manager
- \`/plugin\` - List plugins
- \`/plugin-install\` - Install plugin
- \`/plugin-enable\` - Enable plugin

**MCP Servers:**
- \`/mcp\` - List MCP servers
- \`/mcp-add\` - Add MCP server
- \`/mcp-remove\` - Remove MCP server

**Auth & Setup:**
- \`/auth\` - Manage authentication
- \`/setup-token\` - Setup long-lived token
- \`/doctor\` - Check CLI health
- \`/update\` - Update CLI

**Git & Worktree:**
- \`/worktree\` - Create git worktree
- \`/tmux\` - Tmux session

**Chat Actions:**
- \`/clear\` - Clear messages
- \`/export\` - Export chat
- \`/terminal\` - Terminal mode
- \`/bare\` - Bare mode (minimal)
- \`/verbose\` - Verbose mode
- \`/debug\` - Debug mode

**Voice Features:**
- Click mic button for voice input
- Response auto-spoken

**Tips:**
- Messages preserve context
- Shift+Enter for new lines
- Commands with \`input\` label need additional input`;

    setMessages(prev => [...prev, { role: 'assistant', content: helpContent }]);
  };

  // Format message content (basic markdown-like formatting)
  const formatContent = content => {
    // Split by code blocks
    const parts = content.split(/```(\w*)\n?/g);

    return parts.map((part, i) => {
      if (i % 2 === 1) {
        // This is a code block language indicator, skip
        return null;
      }
      if (i % 2 === 2) {
        // This is code content
        return (
          <pre
            key={i}
            className="bg-black/30 rounded-xl p-4 my-3 overflow-x-auto text-sm font-mono"
          >
            <code>{part.trim()}</code>
          </pre>
        );
      }
      // Regular text
      return (
        <span key={i}>
          {part.split('\n').map((line, j) => (
            <React.Fragment key={j}>
              {line}
              {j < part.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </span>
      );
    });
  };

  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    const isError = msg.role === 'error';
    const isLast = index === messages.length - 1;
    const isMsgSending = msg.isSending && isSending;

    return (
      <div
        key={index}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} transition-all duration-300 ${
          isMsgSending ? 'opacity-70 scale-[0.98] animate-pulse' : 'animate-fade-in'
        }`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Avatar */}
        {!isUser && !isError && (
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 mr-3 shadow-lg shadow-purple-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`max-w-[75%] px-5 py-4 leading-relaxed transition-all duration-300 ${
            isUser
              ? `bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-3xl rounded-tr-xl shadow-lg ${
                  isMsgSending ? 'shadow-blue-400/40 animate-pulse' : 'shadow-blue-500/20'
                }`
              : isError
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 rounded-3xl'
                : 'bg-white/10 backdrop-blur-xl text-white/90 rounded-3xl rounded-tl-xl border border-white/10 shadow-xl'
          }`}
        >
          <div className="text-[15px] whitespace-pre-wrap">{formatContent(msg.content)}</div>

          {/* Message actions - speak button */}
          {!isError && msg.content && msg.content.trim() && (
            <div className="flex justify-end mt-2 gap-2">
              {/* Sending indicator */}
              {isMsgSending && (
                <span className="text-xs text-white/50 animate-pulse">发送中...</span>
              )}
              <button
                onClick={() => handleSpeakMessage(msg.content)}
                disabled={historyTTS.isSpeaking}
                className={`p-1 rounded transition-all ${
                  historyTTS.isSpeaking
                    ? 'text-purple-400 animate-pulse'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/10'
                }`}
                title={historyTTS.isSpeaking ? '正在朗读...' : '点击朗读'}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Typing indicator for last assistant message if processing */}
          {isLast && !isUser && !isError && isProcessing && (
            <div className="flex gap-1 mt-2">
              <span className="w-2 h-2 bg-white/50 rounded-full animate-pulse" />
              <span
                className="w-2 h-2 bg-white/50 rounded-full animate-pulse"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 bg-white/50 rounded-full animate-pulse"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          )}
        </div>

        {/* User Avatar */}
        {isUser && (
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shrink-0 ml-3 shadow-lg">
            <User className="w-4 h-4 text-white/70" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>
      {/* 主布局: 左侧固定对话列表 + 右侧聊天区域 */}
      {/* 左侧对话列表 - 已固定定位 */}
      {showConversationList && (
        <ConversationList
          activeConversationId={activeConversationId}
          conversations={conversations}
          onConversationSelect={handleConversationSelect}
          onConversationCreate={handleConversationCreate}
          onConversationDelete={handleConversationDelete}
          collapsed={false}
        />
      )}
      {/* 右侧聊天区域 - 添加左侧偏移 */}
      <div className={`flex-1 flex flex-col min-h-screen ${showConversationList ? 'ml-64' : ''}`}>
        {/* Header */}
        <header className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center gap-4">
            {/* 切换对话列表按钮 */}
            <button
              onClick={() => setShowConversationList(!showConversationList)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white/70 hover:text-white"
              title={showConversationList ? '隐藏对话列表' : '显示对话列表'}
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            {/* Logo */}
            <div
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30"
              title="Claude Code CLI VoiceInter"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>

            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight">Claude Voice</h1>
              <p
                className="text-sm text-white/50 flex items-center gap-2"
                title="WebSocket 连接状态 • Claude 会话是否就绪"
              >
                <span
                  className={`inline-flex items-center gap-1.5 ${isConnected ? 'text-green-400' : 'text-red-400'}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
                  />
                  {isConnected ? '已连接' : '离线'}
                </span>
                {claudeReady && <span className="text-white/30">•</span>}
                {claudeReady && <span className="text-purple-400">会话就绪</span>}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Voice status indicators */}
            {voice.isListening && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 animate-pulse">
                <Mic className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">Listening...</span>
              </div>
            )}

            {voice.isSpeaking && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30">
                <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="text-sm text-purple-400">Speaking...</span>
              </div>
            )}

            {/* New session button */}
            <button
              onClick={startNewSession}
              disabled={!isConnected}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
              title="🔄 开始新会话 - 清除当前对话历史，启动新的 Claude 会话"
            >
              <RefreshCw className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
            </button>

            {/* Skill Manager button */}
            <button
              onClick={() => setShowSkillManager(true)}
              disabled={!isConnected}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
              title="📄 Skill 管理器 - 导入、创建和管理 Claude Skills"
            >
              <FileText className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
            </button>

            {/* Token Stats button */}
            <button
              onClick={() => setShowTokenStats(true)}
              disabled={!isConnected}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group relative"
              title="📊 Token 统计 - 查看 API 使用量、成本和缓存效率"
            >
              <Activity className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              {tokenUsage.cumulative.totalCostUsd > 0 && (
                <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-green-500/80 text-xs text-white font-medium">
                  ${tokenUsage.cumulative.totalCostUsd.toFixed(4)}
                </span>
              )}
            </button>

            {/* Export button */}
            <button
              onClick={() => setShowExportPanel(true)}
              disabled={messages.length === 0}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
              title="💾 导出对话 - 下载对话记录为 JSON/Markdown/TXT"
            >
              <Download className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
            </button>

            {/* Replay button */}
            <button
              onClick={() => setShowReplayPanel(true)}
              disabled={messages.length === 0}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
              title="🔄 对话回放 - 朗读历史对话记录"
            >
              <Play className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
            </button>

            {/* Memory Stats button */}
            <button
              onClick={() => setShowMemoryStats(true)}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 group"
              title="📊 内存统计 - 查看缓存使用情况和清理选项"
            >
              <MemoryStick className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              {memoryUsage && memoryUsage.formatted && (
                <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-green-500/80 text-xs text-white font-medium">
                  {memoryUsage.formatted}
                </span>
              )}
            </button>

            {/* CLI Commands button */}
            <button
              onClick={() => setShowCommandSidebar(!showCommandSidebar)}
              disabled={!isConnected}
              className={`p-3 rounded-2xl backdrop-blur-xl border transition-all duration-200 disabled:opacity-50 group ${
                showCommandSidebar
                  ? 'bg-purple-500/30 border-purple-500/50'
                  : 'bg-white/10 border-white/10 hover:bg-white/20'
              }`}
              title="💻 CLI 命令面板 - 可视化选择和执行所有 Claude CLI 命令"
            >
              <Terminal className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
            </button>

            {/* Keyboard Shortcuts button */}
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 group"
              title="⌨️ 键盘快捷键 - 显示所有可用快捷键"
            >
              <Keyboard className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
            </button>

            {/* Subtitles Control */}
            <SubtitlesControl
              enabled={showSubtitles}
              onToggle={setShowSubtitles}
              position={subtitlePosition}
              onPositionChange={setSubtitlePosition}
              showInterim={showSubtitleInterim}
              onShowInterimChange={setShowSubtitleInterim}
            />
          </div>
        </header>

        {/* Messages Container */}
        <main className="relative flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Empty state */}
            {messages.length === 0 && !isProcessing && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-white/10 flex items-center justify-center mb-6 shadow-xl">
                  <Sparkles className="w-10 h-10 text-purple-400" />
                </div>

                <h2 className="text-2xl font-medium text-white mb-3">How can I help you today?</h2>

                <p className="text-white/50 max-w-md">
                  Type a message or click the microphone to speak. I'll remember our conversation
                  context.
                </p>

                {/* Quick action suggestions */}
                <div className="flex gap-3 mt-8">
                  {['What can you do?', 'Explain this code', 'Help me debug'].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => sendToClaude(suggestion)}
                      className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-sm text-white/70 hover:bg-white/20 hover:text-white transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map(renderMessage)}

            {/* Invisible scroll anchor */}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* Input Area - 固定在底部 */}
        <footer className="sticky bottom-0 z-20 px-6 py-4 bg-slate-900/90 backdrop-blur-xl border-t border-white/10">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-end gap-4">
              {/* Text Input with Voice Button inside */}
              <div className="flex-1 relative flex items-end">
                {/* Command Palette */}
                <CommandPalette
                  inputText={inputText}
                  onSelectCommand={handleCommandSelect}
                  visible={showCommandPalette}
                />

                {/* Attachment Preview */}
                {attachments.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 flex gap-2 p-2 bg-gray-800/90 rounded-xl border border-gray-700/50 overflow-x-auto max-w-full">
                    {attachments.map(attachment => (
                      <div key={attachment.id} className="relative flex-shrink-0 group">
                        {attachment.isImage ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700">
                            <img
                              src={attachment.content}
                              alt={attachment.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center p-2">
                            <FileText className="w-6 h-6 text-gray-400" />
                            <span className="text-xs text-gray-400 mt-1 truncate w-full text-center">
                              {attachment.name.slice(0, 8)}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-0 left-0 right-0 text-xs text-gray-400 bg-gray-900/80 px-1 truncate rounded-b">
                          {attachment.name.slice(0, 12)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  placeholder={
                    attachments.length > 0
                      ? '添加描述或直接发送...'
                      : 'Message Claude... or type / for commands'
                  }
                  disabled={isProcessing}
                  rows={1}
                  className={`w-full px-6 py-4 pr-14 backdrop-blur-xl border rounded-3xl text-white placeholder-white/40 focus:outline-none resize-none transition-all duration-200 disabled:opacity-50 text-[15px] ${
                    attachments.length > 0
                      ? 'border-blue-500/40 bg-blue-500/10'
                      : inputText.trim() && !isProcessing
                        ? 'bg-white/15 border-purple-500/40 shadow-lg shadow-purple-500/10'
                        : 'bg-white/10 border-white/10 focus:border-purple-500/50 focus:bg-white/15'
                  }`}
                  style={{
                    minHeight: '56px',
                    maxHeight: '200px',
                    height: 'auto',
                  }}
                />

                {/* Voice Buttons - inside input on the right */}
                <div className="absolute right-3 bottom-3 flex gap-2">
                  {/* File Upload Button */}
                  <button
                    type="button"
                    onClick={openFileDialog}
                    disabled={isProcessing || !isConnected}
                    title="📎 上传文件/图片"
                    className="h-[40px] w-[40px] rounded-xl flex items-center justify-center transition-all duration-200 border bg-white/10 backdrop-blur-xl border-white/10 text-white/60 hover:bg-white/20 hover:text-white hover:border-white/20 disabled:opacity-40"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.java,.go,.rs,.c,.cpp,.yaml,.yml,.pdf,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {/* Conversation Mode Button */}
                  <button
                    type="button"
                    onClick={handleConversationModeClick}
                    disabled={isProcessing || !isConnected}
                    title={conversationMode ? '结束对话模式' : '开始双向对话'}
                    className={`h-[40px] w-[40px] rounded-xl flex items-center justify-center transition-all duration-200 border ${
                      conversationMode
                        ? 'bg-gradient-to-r from-green-500 to-teal-500 border-green-400/50 text-white shadow-lg shadow-green-500/30'
                        : 'bg-white/10 backdrop-blur-xl border-white/10 text-white/60 hover:bg-white/20 hover:text-white hover:border-white/20'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Radio className="w-5 h-5" />
                  </button>

                  {/* Single Voice Button */}
                  <button
                    type="button"
                    onClick={handleVoiceClick}
                    disabled={isProcessing || !isConnected || conversationMode}
                    title={
                      !voice.isSupported
                        ? '⚠️ 浏览器不支持语音'
                        : voice.isListening
                          ? '🔴 点击停止录音'
                          : '🎤 点击开始语音输入'
                    }
                    className={`h-[40px] w-[40px] rounded-xl flex items-center justify-center transition-all duration-200 border ${
                      conversationMode
                        ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed opacity-50'
                        : voice.isListening
                          ? 'bg-gradient-to-r from-red-500 to-orange-500 border-red-400/50 text-white shadow-lg shadow-red-500/30 animate-pulse'
                          : voice.isSpeaking
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400/50 text-white shadow-lg shadow-purple-500/30'
                            : !voice.isSupported
                              ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                              : 'bg-white/10 backdrop-blur-xl border-white/10 text-white/60 hover:bg-white/20 hover:text-white hover:border-white/20'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {voice.isSpeaking ? (
                      <Volume2 className="w-5 h-5 animate-pulse" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Listening indicator - above the input */}
                {!conversationMode && voice.isListening && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-red-500/20 backdrop-blur-xl rounded-xl border border-red-500/30">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs text-red-400 font-medium">录音中...</span>
                      {voice.interimTranscript && (
                        <span className="text-sm text-white/80 truncate max-w-[200px]">
                          "{voice.interimTranscript}"
                        </span>
                      )}
                      <button
                        onClick={handleVoiceClick}
                        className="ml-auto text-xs text-red-400 hover:text-red-300"
                      >
                        点击停止
                      </button>
                    </div>
                  </div>
                )}

                {/* Conversation Mode Panel - above the input */}
                {conversationMode && (
                  <div className="absolute bottom-full left-0 right-0 mb-4">
                    <VoicePanel
                      onUserSpeech={handleConversationUserSpeech}
                      onAssistantSpeech={handleConversationAssistantSpeech}
                      onInterimTranscript={setCurrentSttText}
                      onCommandExecute={handleVoiceCommandExecute}
                      enabled={isConnected && !isProcessing}
                      showWaveform={true}
                      autoContinue={true}
                      interruptionEnabled={true}
                    />
                  </div>
                )}

                {/* Processing indicator */}
                {isProcessing && (
                  <div className="absolute right-16 bottom-3">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || !isConnected || isProcessing}
                title="发送消息给 Claude (Enter)"
                className={`h-[56px] w-[56px] rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg transition-all duration-200 disabled:opacity-50 disabled:shadow-none group ${
                  isSending
                    ? 'scale-95 shadow-purple-300/40 animate-pulse'
                    : 'shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105'
                }`}
              >
                <Send
                  className={`w-5 h-5 text-white group-disabled:opacity-50 transition-transform ${
                    isSending ? 'animate-bounce' : ''
                  }`}
                />
              </button>
            </form>

            {/* Hint */}
            <p className="text-center text-xs text-white/30 mt-4">
              💡 Tips: Enter 发送 | Shift+Enter 换行 | 输入 / 显示 84 命令 | ⌨️ ⌘? 快捷键 | 🎤
              语音填充输入框后手动发送 | 📊 Token统计
            </p>
          </div>
        </footer>
      </div>{' '}
      {/* 结束右侧聊天区域 */}
      {/* Lazy-loaded Modal Components */}
      <Suspense fallback={null}>
        <SkillManager isOpen={showSkillManager} onClose={() => setShowSkillManager(false)} />
      </Suspense>
      <Suspense fallback={null}>
        <TokenStats
          isOpen={showTokenStats}
          onClose={() => setShowTokenStats(false)}
          tokenUsage={tokenUsage}
        />
      </Suspense>
      {showExportPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Suspense fallback={<div className="text-white">Loading...</div>}>
            <ExportPanel messages={messages} onClose={() => setShowExportPanel(false)} />
          </Suspense>
        </div>
      )}
      <Suspense fallback={null}>
        <ConversationReplay
          messages={messages}
          isOpen={showReplayPanel}
          onClose={() => setShowReplayPanel(false)}
        />
      </Suspense>
      <Suspense fallback={null}>
        <MemoryStats isOpen={showMemoryStats} onClose={() => setShowMemoryStats(false)} />
      </Suspense>
      <Suspense fallback={null}>
        <CommandSidebar
          isOpen={showCommandSidebar}
          onClose={() => setShowCommandSidebar(false)}
          onCommandSelect={handleCommandSelect}
        />
      </Suspense>
      <Suspense fallback={null}>
        <ShortcutsHelp isOpen={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />
      </Suspense>
      {/* Realtime Subtitles - not lazy (always visible when enabled) */}
      <RealtimeSubtitles
        sttText={currentSttText}
        ttsText={currentTtsText}
        isListening={voice.isListening}
        isSpeaking={voice.isSpeaking}
        enabled={showSubtitles}
        position={subtitlePosition}
        showInterim={showSubtitleInterim}
        onClose={() => setShowSubtitles(false)}
      />
    </div>
  );
}

export default Chat;
