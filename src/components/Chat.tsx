/**
 * Chat - Main chat component (Inspired by chatbot-ui design)
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useVoiceInteraction } from '../hooks/useVoiceRecognition';
import { useHybridTTS } from '../hooks/useHybridTTS';
import { useMessageHandler } from '../hooks/useMessageHandler';
import { useConversationManager } from '../hooks/useConversationManager';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import ConversationList from './ConversationList';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ChatModals from './ChatModals';
import VoicePanel from './VoicePanel';
import logger from '../utils/logger';
import type { Attachment } from '../types/message';

logger.setContext('Chat');

function Chat() {
  const { isConnected, sendMessage } = useWebSocket();

  const {
    messages,
    setMessages,
    isProcessing,
    setIsProcessing,
    sessionId,
    claudeReady,
    tokenUsage,
    streamBufferRef,
    messagesEndRef,
    clearMessages,
    addMessage,
    stopResponse,
  } = useMessageHandler();

  const {
    conversations,
    setConversations,
    activeConversationId,
    showConversationList,
    setShowConversationList,
    handleConversationSelect,
    handleConversationDelete,
    startNewConversation,
    saveMessagesToConversation,
    loadMessagesFromConversation,
  } = useConversationManager();

  // Create new conversation with clear messages
  const handleNewConversation = useCallback(() => {
    startNewConversation(clearMessages);
  }, [startNewConversation, clearMessages]);

  // Load messages when switching conversations
  useEffect(() => {
    if (activeConversationId) {
      const loadedMessages = loadMessagesFromConversation(activeConversationId);
      // New conversation (empty messages) - clear the display
      if (loadedMessages.length === 0 && messages.length > 0) {
        setMessages([]);
        logger.debug('New conversation - cleared messages');
      }
      // Existing conversation - load history
      else if (
        loadedMessages.length > 0 &&
        (loadedMessages.length !== messages.length ||
          loadedMessages[0].content !== messages[0]?.content)
      ) {
        setMessages(loadedMessages);
        logger.debug('Loaded messages from conversation:', {
          id: activeConversationId,
          count: loadedMessages.length,
        });
      }
    }
  }, [activeConversationId]);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [conversationMode, setConversationMode] = useState(false);

  const [showSkillManager, setShowSkillManager] = useState(false);
  const [showTokenStats, setShowTokenStats] = useState(false);
  const [showCommandSidebar, setShowCommandSidebar] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showReplayPanel, setShowReplayPanel] = useState(false);
  const [showMemoryStats, setShowMemoryStats] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const voiceStopSpeakingRef = useRef<(() => void) | null>(null);
  const voiceStoppedManuallyRef = useRef(false); // Flag to prevent auto-send after manual stop

  const sendToClaudeInternal = useCallback(
    (text: string) => {
      if ((!text.trim() && attachments.length === 0) || !isConnected || isProcessing) return;

      let fullContent = text.trim();
      if (attachments.length > 0) {
        const attachmentInfo = attachments
          .map(a =>
            a.isImage
              ? `[图片: ${a.name}]`
              : `\n---\n文件: ${a.name}\n${a.content.slice(0, 500)}\n---`
          )
          .join('\n');
        fullContent = fullContent + '\n' + attachmentInfo;
      }

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
      setAttachments([]);
      setIsProcessing(true);

      setTimeout(() => {
        setIsSending(false);
        setMessages(prev =>
          prev.map(m => (m.isSending && m.content === fullContent ? { ...m, isSending: false } : m))
        );
      }, 300);

      voiceStopSpeakingRef.current?.();
      sendMessage({ type: 'claude-command', command: fullContent, options: { cwd: '.' } });
      inputRef.current?.focus();
    },
    [isConnected, isProcessing, sendMessage, attachments, setMessages]
  );

  // Save messages to conversation whenever they change
  useEffect(() => {
    saveMessagesToConversation(messages);
  }, [messages, activeConversationId, saveMessagesToConversation]);

  const voice = useVoiceInteraction({
    language: 'zh-CN',
    onSpeechResult: useCallback(
      (text: string) => {
        // Check if user manually stopped - don't auto-send
        if (voiceStoppedManuallyRef.current) {
          voiceStoppedManuallyRef.current = false; // Reset flag
          logger.debug('Voice stopped manually, skipping auto-send');
          return;
        }
        if (text.trim()) sendToClaudeInternal(text);
      },
      [sendToClaudeInternal]
    ),
    autoSpeakResponse: true,
  });

  useEffect(() => {
    voiceStopSpeakingRef.current = voice.stopSpeaking || null;
  }, [voice.stopSpeaking]);

  const historyTTS = useHybridTTS({
    voice: 'af_sky',
    speed: 1.0,
    language: 'zh-CN',
    preferKokoro: true,
  });

  const handleVoiceClick = useCallback(() => {
    if (!voice.isSupported) {
      setMessages(prev => [...prev, { role: 'error', content: '浏览器不支持语音' }]);
      return;
    }
    if (!voice.isInitialized) {
      setMessages(prev => [...prev, { role: 'error', content: '语音未初始化' }]);
      return;
    }
    // If speaking, stop speaking (don't set manual stop flag for this case)
    if (voice.isSpeaking && voice.stopSpeaking) {
      voice.stopSpeaking();
      return;
    }
    // If listening and user clicks, they want to stop - set flag to prevent auto-send
    if (voice.isListening) {
      voiceStoppedManuallyRef.current = true;
      voice.stopListening?.();
      logger.debug('User clicked to stop listening manually');
      return;
    }
    // Starting new recording - reset the flag
    voiceStoppedManuallyRef.current = false;
    voice.startListening?.();
    logger.debug('User started new voice recording');
  }, [voice, setMessages]);

  const handleConversationModeClick = useCallback(() => {
    if (!conversationMode) {
      // Starting conversation mode - reset the flag
      voiceStoppedManuallyRef.current = false;
      setConversationMode(true);
      logger.debug('Starting conversation mode');
    } else {
      // Ending conversation mode - set flag to prevent auto-send
      voiceStoppedManuallyRef.current = true;
      setConversationMode(false);
      voice.stopListening?.();
      voice.stopSpeaking?.();
      logger.debug('User manually ended conversation mode');
    }
  }, [conversationMode, voice]);

  const handleStopAll = useCallback(() => {
    // Set flag to prevent auto-send after manual stop
    voiceStoppedManuallyRef.current = true;
    setIsProcessing(false);
    if (streamBufferRef.current) streamBufferRef.current = '';
    voice.stopSpeaking?.();
    voice.stopListening?.();
    if (conversationMode) setConversationMode(false);
    historyTTS.stop();
    stopResponse();
    logger.debug('User manually stopped all voice activity');
  }, [voice, conversationMode, historyTTS, streamBufferRef, setIsProcessing, stopResponse]);

  const handleCommandAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'new-session':
          sendMessage({ type: 'new-session' });
          startNewConversation(clearMessages);
          break;
        case 'clear-messages':
          clearMessages();
          break;
        case 'toggle-conversation-list':
          setShowConversationList(prev => !prev);
          break;
        case 'open-skill-manager':
          setShowSkillManager(true);
          break;
        case 'open-token-stats':
          setShowTokenStats(true);
          break;
        case 'toggle-voice-input':
          if (!conversationMode) handleVoiceClick();
          break;
        case 'toggle-conversation-mode':
          handleConversationModeClick();
          break;
        case 'stop-voice-all':
          handleStopAll();
          break;
        case 'escape':
          setShowSkillManager(false);
          setShowTokenStats(false);
          setShowCommandSidebar(false);
          setShowShortcutsHelp(false);
          break;
      }
    },
    [
      sendMessage,
      startNewConversation,
      clearMessages,
      handleVoiceClick,
      handleConversationModeClick,
      handleStopAll,
      conversationMode,
    ]
  );

  useKeyboardShortcuts({
    inputText,
    inputRef,
    isTyping: false,
    onAction: handleCommandAction,
    dependencies: {
      conversationMode,
      isListening: voice.isListening,
      isSpeaking: voice.isSpeaking,
    },
  });

  const startNewSession = useCallback(() => {
    sendMessage({ type: 'new-session' });
    startNewConversation(clearMessages);
  }, [sendMessage, startNewConversation, clearMessages]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = inputText.trim();
      if (text.startsWith('/')) {
        setShowCommandPalette(false);
        setInputText('');
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        return;
      }
      sendToClaudeInternal(inputText);
    },
    [inputText, sendToClaudeInternal, setMessages]
  );

  const handleCommandSelect = useCallback(
    (command: any) => {
      setShowCommandPalette(false);
      setInputText('');
      handleCommandAction(command.action);
    },
    [handleCommandAction]
  );

  const handleCompositionStart = useCallback(() => setIsComposing(true), []);
  const handleCompositionEnd = useCallback(() => setIsComposing(false), []);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Conversation List */}
      {showConversationList && (
        <ConversationList
          activeConversationId={activeConversationId}
          conversations={conversations}
          onConversationSelect={handleConversationSelect}
          onConversationCreate={handleNewConversation}
          onConversationDelete={handleConversationDelete}
          collapsed={false}
        />
      )}

      {/* Main chat area */}
      <div className={`flex-1 flex flex-col min-h-0 ${showConversationList ? 'ml-64' : ''}`}>
        <ChatHeader
          isConnected={isConnected}
          claudeReady={claudeReady}
          isProcessing={isProcessing}
          voice={voice}
          conversationMode={conversationMode}
          tokenUsage={tokenUsage}
          messagesLength={messages.length}
          showConversationList={showConversationList}
          onToggleConversationList={() => setShowConversationList(!showConversationList)}
          onNewSession={startNewSession}
          onStopResponse={handleStopAll}
          onOpenSkillManager={() => setShowSkillManager(true)}
          onOpenTokenStats={() => setShowTokenStats(true)}
          onOpenExport={() => setShowExportPanel(true)}
          onOpenReplay={() => setShowReplayPanel(true)}
          onOpenMemoryStats={() => setShowMemoryStats(true)}
          onToggleCommandSidebar={() => setShowCommandSidebar(!showCommandSidebar)}
          onOpenShortcutsHelp={() => setShowShortcutsHelp(true)}
          commandSidebarOpen={showCommandSidebar}
        />

        {/* Messages area */}
        <main className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            /* Clean welcome screen inspired by ChatGPT */
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto px-8">
              <div className="mb-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-foreground mb-2">
                How can I help you today?
              </h2>
              <p className="text-muted-foreground text-center mb-8 max-w-md text-sm">
                Start a conversation or try one of these suggestions.
              </p>

              {/* Quick action cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
                <button
                  onClick={() => sendToClaudeInternal('What can you do?')}
                  className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left group"
                >
                  <div className="text-sm font-medium text-foreground group-hover:text-primary">
                    What can you do?
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Learn about my capabilities
                  </div>
                </button>

                <button
                  onClick={() => sendToClaudeInternal('Explain this code')}
                  className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left group"
                >
                  <div className="text-sm font-medium text-foreground group-hover:text-primary">
                    Explain code
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Get code explanations</div>
                </button>

                <button
                  onClick={() => sendToClaudeInternal('Help me debug')}
                  className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left group"
                >
                  <div className="text-sm font-medium text-foreground group-hover:text-primary">
                    Debug issue
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Troubleshoot problems</div>
                </button>
              </div>
            </div>
          ) : (
            <MessageList
              messages={messages}
              isProcessing={isProcessing}
              isSending={isSending}
              messagesEndRef={messagesEndRef}
              onSpeakMessage={(content: string) => historyTTS.speak(content)}
              onQuickAction={sendToClaudeInternal}
              historyTTSSpeaking={historyTTS.isSpeaking}
              waveIndicatorActive={true}
              onStopResponse={handleStopAll}
            />
          )}

          {/* Voice Panel */}
          <div className="mt-4 px-4">
            <VoicePanel
              onUserSpeech={text => sendToClaudeInternal(text)}
              enabled={conversationMode}
              showWaveform={true}
              autoContinue={true}
              interruptionEnabled={true}
            />
          </div>
        </main>

        {/* Input area */}
        <ChatInput
          inputText={inputText}
          setInputText={setInputText}
          inputRef={inputRef}
          isConnected={isConnected}
          isProcessing={isProcessing}
          isSending={isSending}
          attachments={attachments}
          setAttachments={setAttachments}
          voice={voice}
          conversationMode={conversationMode}
          showCommandPalette={showCommandPalette}
          setShowCommandPalette={setShowCommandPalette}
          onSubmit={handleSubmit}
          onVoiceClick={handleVoiceClick}
          onConversationModeClick={handleConversationModeClick}
          onStopAll={handleStopAll}
          onCommandSelect={handleCommandSelect}
          sendMessage={sendMessage}
          handleCompositionStart={handleCompositionStart}
          handleCompositionEnd={handleCompositionEnd}
        />
      </div>

      {/* Modals */}
      <ChatModals
        showSkillManager={showSkillManager}
        setShowSkillManager={setShowSkillManager}
        showTokenStats={showTokenStats}
        setShowTokenStats={setShowTokenStats}
        showCommandSidebar={showCommandSidebar}
        setShowCommandSidebar={setShowCommandSidebar}
        showShortcutsHelp={showShortcutsHelp}
        setShowShortcutsHelp={setShowShortcutsHelp}
        showExportPanel={showExportPanel}
        setShowExportPanel={setShowExportPanel}
        showReplayPanel={showReplayPanel}
        setShowReplayPanel={setShowReplayPanel}
        showMemoryStats={showMemoryStats}
        setShowMemoryStats={setShowMemoryStats}
        messages={messages}
        tokenUsage={tokenUsage}
        sessionId={sessionId}
      />
    </div>
  );
}

export default Chat;
