import React, { createContext, useContext, useRef, useState, useEffect, useMemo } from 'react';

const WebSocketContext = createContext(null);

/**
 * Build WebSocket URL based on current location
 */
function buildWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = window.location.port || (protocol === 'wss:' ? '443' : '80');

  // In development, connect to backend port directly
  if (process.env.NODE_ENV !== 'production') {
    return `${protocol}//${host}:3001/ws`;
  }

  return `${protocol}//${host}:${port}/ws`;
}

/**
 * WebSocket Provider Hook
 */
function useWebSocketProvider() {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestMessage, setLatestMessage] = useState(null);
  const reconnectTimeoutRef = useRef(null);

  // Connect to WebSocket
  const connect = () => {
    try {
      const wsUrl = buildWebSocketUrl();
      console.log('[WS] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS] Received:', data.type);
          setLatestMessage(data);
        } catch (error) {
          console.error('[WS] Parse error:', error);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Auto reconnect after 3 seconds
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WS] Reconnecting...');
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };

    } catch (error) {
      console.error('[WS] Connection error:', error);
    }
  };

  // Send message
  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Not connected, state:', wsRef.current?.readyState);
    }
  };

  // Ping interval to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000);

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const value = useMemo(() => ({
    ws: wsRef.current,
    isConnected,
    sendMessage,
    latestMessage
  }), [isConnected, latestMessage]);

  return value;
}

/**
 * WebSocket Provider Component
 */
export function WebSocketProvider({ children }) {
  const wsData = useWebSocketProvider();

  return (
    <WebSocketContext.Provider value={wsData}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook to use WebSocket context
 */
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}

export default WebSocketContext;