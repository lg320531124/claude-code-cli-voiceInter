import React from 'react';
import { WebSocketProvider } from './contexts/WebSocketContext';
import Chat from './components/Chat';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <WebSocketProvider>
        <Chat />
      </WebSocketProvider>
    </ErrorBoundary>
  );
}

export default App;
