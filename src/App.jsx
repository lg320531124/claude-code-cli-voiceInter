import React from 'react';
import { WebSocketProvider } from './contexts/WebSocketContext';
import Chat from './components/Chat';

function App() {
  return (
    <WebSocketProvider>
      <div className="app">
        <header className="app-header">
          <h1>CloudCLI Voice</h1>
          <p>Claude Code with Voice Interaction</p>
        </header>
        <main className="app-main">
          <Chat />
        </main>
      </div>
    </WebSocketProvider>
  );
}

export default App;