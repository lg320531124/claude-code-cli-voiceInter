/**
 * Chat - Main chat component (Modern UI Design)
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
  } = useConversationManager();

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
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
          name: a.name, type: a.type, isImage: a.isImage, preview: a.isImage ? a.content : null,
        })) : undefined,
      }]);
      setInputText('');
      setAttachments([]);
      setIsProcessing(true);

      setTimeout(() => {
        setIsSending(false);
        setMessages(prev => prev.map(m => (m.isSending && m.content === fullContent ? { ...m, isSending: false } : m)));
      }, 300);

      voiceStopSpeakingRef.current?.();
      sendMessage({ type: 'claude-command', command: fullContent, options: { cwd: '.' } });
      inputRef.current?.focus();
    },
    [isConnected, isProcessing, sendMessage, attachments, setMessages]
  );

  useEffect(() => { saveMessagesToConversation(messages); }, [messages, saveMessagesToConversation]);

  const voice = useVoiceInteraction({
    language: 'zh-CN',
    onSpeechResult: useCallback((text: string) => { if (text.trim()) sendToClaudeInternal(text); }, [sendToClaudeInternal]),
    autoSpeakResponse: true,
  });

  useEffect(() => { voiceStopSpeakingRef.current = voice.stopSpeaking || null; }, [voice.stopSpeaking]);

  const historyTTS = useHybridTTS({ voice: 'af_sky', speed: 1.0, language: 'zh-CN', preferKokoro: true });

  const handleVoiceClick = useCallback(() => {
    if (!voice.isSupported) {
      setMessages(prev => [...prev, { role: 'error', content: '⚠️ 浏览器不支持语音识别' }]);
      return;
    }
    if (!voice.isInitialized) {
      setMessages(prev => [...prev, { role: 'error', content: '⚠️ 语音功能尚未初始化' }]);
      return;
    }
    if (voice.isSpeaking && voice.stopSpeaking) voice.stopSpeaking();
    else if (voice.toggleListening) voice.toggleListening();
  }, [voice, setMessages]);

  const handleConversationModeClick = useCallback(() => {
    setConversationMode(!conversationMode);
    if (!conversationMode) { voice.stopListening?.(); voice.stopSpeaking?.(); }
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

  const handleCommandAction = useCallback((action: string) => {
    switch (action) {
      case 'new-session': sendMessage({ type: 'new-session' }); startNewConversation(); break;
      case 'clear-messages': clearMessages(); break;
      case 'toggle-conversation-list': setShowConversationList(prev => !prev); break;
      case 'open-skill-manager': setShowSkillManager(true); break;
      case 'open-token-stats': setShowTokenStats(true); break;
      case 'toggle-voice-input': if (!conversationMode) handleVoiceClick(); break;
      case 'toggle-conversation-mode': handleConversationModeClick(); break;
      case 'stop-voice-all': handleStopAll(); break;
      case 'escape': setShowSkillManager(false); setShowTokenStats(false); setShowCommandSidebar(false); setShowShortcutsHelp(false); break;
    }
  }, [sendMessage, startNewConversation, clearMessages, handleVoiceClick, handleConversationModeClick, handleStopAll, conversationMode]);

  useKeyboardShortcuts({
    inputText, inputRef, isTyping: false, onAction: handleCommandAction,
    dependencies: { conversationMode, isListening: voice.isListening, isSpeaking: voice.isSpeaking },
  });

  const startNewSession = useCallback(() => { sendMessage({ type: 'new-session' }); startNewConversation(); }, [sendMessage, startNewConversation]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (text.startsWith('/')) { setShowCommandPalette(false); setInputText(''); setMessages(prev => [...prev, { role: 'user', content: text }]); return; }
    sendToClaudeInternal(inputText);
  }, [inputText, sendToClaudeInternal, setMessages]);

  const handleCommandSelect = useCallback((command: any) => {
    setShowCommandPalette(false); setInputText(''); handleCommandAction(command.action);
  }, [handleCommandAction]);

  const handleCompositionStart = useCallback(() => setIsComposing(true), []);
  const handleCompositionEnd = useCallback(() => setIsComposing(false), []);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-violet-500/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-cyan-500/10 via-transparent to-transparent rounded-full blur-3xl" />
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
            /* Modern welcome screen */
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto px-8">
              <div className="relative mb-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-white/90 mb-3">How can I help you today?</h2>
              <p className="text-white/50 text-center mb-10 max-w-md">
                Chat with Claude using voice or text. Start a conversation or try one of these suggestions.
              </p>

              {/* Quick action cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
                <button
                  onClick={() => sendToClaudeInternal('What can you do?')}
                  className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/30 transition-all duration-300 text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.95-.083-1.876-.548-2.473M12 21a9 9 0 02-6.364-2.636l-.707-.707" />
                    </svg>
                  </div>
                  <span className="text-sm text-white/80 group-hover:text-white transition-colors">What can you do?</span>
                </button>

                <button
                  onClick={() => sendToClaudeInternal('Explain this code')}
                  className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/30 transition-all duration-300 text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <span className="text-sm text-white/80 group-hover:text-white transition-colors">Explain code</span>
                </button>

                <button
                  onClick={() => sendToClaudeInternal('Help me debug')}
                  className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/30 transition-all duration-300 text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-white/80 group-hover:text-white transition-colors">Debug issue</span>
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
              onUserSpeech={(text) => sendToClaudeInternal(text)}
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