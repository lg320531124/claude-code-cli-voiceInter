// src/components/chat/ChatMessages.jsx
//
// Messages container - Message list rendering, empty state

import React from 'react';
import { Sparkles } from 'lucide-react';

function ChatMessages({ messages, isProcessing, isSending, messagesEndRef, renderMessage, onQuickAction }) {
  return (
    <main className="relative flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Empty state */}
        {messages.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-white/10 flex items-center justify-center mb-6 shadow-xl">
              <Sparkles className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-2xl font-medium text-white mb-3">How can I help you today?</h2>
            <p className="text-white/50 max-w-md">Type a message or click the microphone to speak. I'll remember our conversation context.</p>
            
            {/* Quick action suggestions */}
            <div className="flex gap-3 mt-8">
              {['What can you do?', 'Explain this code', 'Help me debug'].map(suggestion => (
                <button key={suggestion} onClick={() => onQuickAction?.(suggestion)} className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-sm text-white/70 hover:bg-white/20 hover:text-white transition-all">
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => renderMessage(msg, idx))}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="h-4" />
      </div>
    </main>
  );
}

export default ChatMessages;
