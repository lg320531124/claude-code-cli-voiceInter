import React from 'react';
import { WebSocketProvider } from './contexts/WebSocketContext';
import Chat from './components/Chat';

function App() {
  return (
    <WebSocketProvider>
      <Chat />
    </WebSocketProvider>
  );
}

export default App;