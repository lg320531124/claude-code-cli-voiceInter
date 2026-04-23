/**
 * Chat - Main chat component (refactored version)
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
import RealtimeSubtitles from './RealtimeSubtitles';
import logger from '../utils/logger';

logger.setContext('Chat');

function Chat() {
  const { isConnected, sendMessage } = useWebSocket();

  // Message handling
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

  // Conversation management
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
  } = useConversationManager();

  // Save messages to conversation
  useEffect(() => {
    saveMessagesToConversation(messages);
  }, [messages, saveMessagesToConversation]);

  // Voice interaction
  const voice = useVoiceInteraction({
    language: 'zh-CN',
    onSpeechResult: useCallback((text: string) => {
      if (text.trim()) sendToClaudeInternal(text);
    }, []),
    autoSpeakResponse: true,
  });

  // History TTS
  const historyTTS = useHybridTTS({
    voice: 'af_sky',
    speed: 1.0,
    language: 'zh-CN',
    preferKokoro: true,
  });

  // Input state
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Conversation mode
  const [conversationMode, setConversationMode] = useState(false);

  // Modal states
  const [showSkillManager, setShowSkillManager] = useState(false);
  const [showTokenStats, setShowTokenStats] = useState(false);
  const [showCommandSidebar, setShowCommandSidebar] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showReplayPanel, setShowReplayPanel] = useState(false);
  const [showMemoryStats, setShowMemoryStats] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Subtitles
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [currentTtsText, setCurrentTtsText] = useState('');
  const [currentSttText, setCurrentSttText] = useState('');

  // Send message to Claude (defined early to be used in callbacks)
  const sendToClaudeInternal = useCallback(
    (text: string) => {
      if ((!text.trim() && attachments.length === 0) || !isConnected || isProcessing) return;

      let fullContent = text.trim();
      if (attachments.length > 0) {
        const attachmentInfo = attachments
          .map(a => a.isImage ? `[图片: ${a.name}]` : `\n---\n文件: ${a.name}\n${a.content.slice(0, 500)}\n---`)
          .join('\n');
        fullContent = fullContent + '\n' + attachmentInfo;
      }

      setIsSending(true);
      setMessages(prev => [...prev, {
        role: 'user',
        content: fullContent,
        isSending: true,
        attachments: attachments.length > 0 ? attachments.map(a => ({
          name: a.name,
          type: a.type,
          isImage: a.isImage,
          preview: a.isImage ? a.content : null,
        })) : undefined,
      }]);
      setInputText('');
      setAttachments([]);
      setIsProcessing(true);

      setTimeout(() => {
        setIsSending(false);
        setMessages(prev =>
          prev.map(m => (m.isSending && m.content === fullContent ? { ...m, isSending: false } : m))
        );
      }, 300);

      voice.stopSpeaking?.();
      sendMessage({ type: 'claude-command', command: fullContent, options: { cwd: '.' } });
      inputRef.current?.focus();
    },
    [isConnected, isProcessing, sendMessage, voice, attachments, setMessages]
  );

  // Command handler actions
  const handleCommandAction = useCallback((action: string) => {
    switch (action) {
      case 'new-session':
        sendMessage({ type: 'new-session' });
        startNewConversation();
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
  }, [sendMessage, startNewConversation, clearMessages, handleVoiceClick, handleConversationModeClick, handleStopAll, conversationMode]);

  // Keyboard shortcuts
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

  // Voice handlers
  const handleVoiceClick = useCallback(() => {
    if (!voice.isSupported) {
      setMessages(prev => [...prev, { role: 'error', content: '⚠️ 浏览器不支持语音识别。请使用 Chrome/Safari/Edge。' }]);
      return;
    }
    if (!voice.isInitialized) {
      setMessages(prev => [...prev, { role: 'error', content: '⚠️ 语音功能尚未初始化，请稍后再试。' }]);
      return;
    }
    if (voice.isSpeaking && voice.stopSpeaking) {
      voice.stopSpeaking();
    } else if (voice.toggleListening) {
      voice.toggleListening();
    }
  }, [voice, setMessages]);

  const handleConversationModeClick = useCallback(() => {
    setConversationMode(!conversationMode);
    if (!conversationMode) {
      voice.stopListening?.();
      voice.stopSpeaking?.();
    }
  }, [conversationMode, voice]);

  const handleStopAll = useCallback(() => {
    setIsProcessing(false);
    if (streamBufferRef.current) streamBufferRef.current = '';
    voice.stopSpeaking?.();
    voice.stopListening?.();
    if (conversationMode) setConversationMode(false);
    historyTTS.stop();
    stopResponse();
  }, [voice, conversationMode, historyTTS, streamBufferRef, setIsProcessing, stopResponse]);

  // New session
  const startNewSession = useCallback(() => {
    sendMessage({ type: 'new-session' });
    startNewConversation();
  }, [sendMessage, startNewConversation]);

  // Handle submit
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();

    if (text.startsWith('/')) {
      setShowCommandPalette(false);
      setInputText('');
      // Handle commands
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      return;
    }

    sendToClaudeInternal(inputText);
  }, [inputText, sendToClaudeInternal, setMessages]);

  // Command select handler
  const handleCommandSelect = useCallback((command: any) => {
    setShowCommandPalette(false);
    setInputText('');
    handleCommandAction(command.action);
  }, [handleCommandAction]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Conversation List */}
      {showConversationList && (
        <ConversationList
          activeConversationId={activeConversationId}
          conversations={conversations}
          onConversationSelect={handleConversationSelect}
          onConversationCreate={startNewConversation}
          onConversationDelete={handleConversationDelete}
          collapsed={false}
        />
      )}

      {/* Main chat area */}
      <div className={`flex-1 flex flex-col min-h-screen ${showConversationList ? 'ml-64' : ''}`}>
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

        <main className="relative flex-1 overflow-y-auto px-6 py-4">
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

          {/* Voice Panel for conversation mode */}
          {conversationMode && (
            <VoicePanel
              onUserSpeech={(text: string) => { setCurrentSttText(text); sendToClaudeInternal(text); }}
              onAssistantSpeech={setCurrentTtsText}
              onInterimTranscript={setCurrentSttText}
              enabled={isConnected && !isProcessing}
              showWaveform={true}
              autoContinue={true}
              interruptionEnabled={true}
            />
          )}
        </main>

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
          handleCompositionStart={() => setIsComposing(true)}
          handleCompositionEnd={() => setIsComposing(false)}
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
        tokenUsage={tokenUsage}
        messages={messages}
        onCommandSelect={handleCommandSelect}
      />

      {/* Subtitles */}
      <RealtimeSubtitles
        sttText={currentSttText}
        ttsText={currentTtsText}
        isListening={voice.isListening}
        isSpeaking={voice.isSpeaking}
        enabled={showSubtitles}
        position="bottom"
        onClose={() => setShowSubtitles(false)}
      />
    </div>
  );
}

export default Chat;