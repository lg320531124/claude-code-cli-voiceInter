import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import logger from '../utils/logger';

// Set context for WebSocket logs
logger.setContext('WS');

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
 * WebSocket Provider Hook with enhanced connection quality and adaptive reconnect
 */
function useWebSocketProvider() {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('未知');
  const [latestMessage, setLatestMessage] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const messageQueueRef = useRef([]);
  const processingQueueRef = useRef(false);
  const pingLatenciesRef = useRef([]);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Measure connection latency
  const measureLatency = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const startTime = Date.now();
    wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: startTime }));
  }, []);

  // Calculate connection quality from latency measurements
  const updateConnectionQuality = useCallback(() => {
    if (pingLatenciesRef.current.length === 0) return;

    const avgLatency =
      pingLatenciesRef.current.reduce((a, b) => a + b, 0) / pingLatenciesRef.current.length;

    const quality =
      avgLatency < 50 ? '优秀' : avgLatency < 100 ? '良好' : avgLatency < 200 ? '一般' : '较差';
    setConnectionQuality(quality);
  }, []);

  // Adaptive reconnect with exponential backoff
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current++;
    if (reconnectAttemptsRef.current > maxReconnectAttempts) {
      logger.warn('Max reconnect attempts reached');
      setConnectionQuality('离线');
      return;
    }

    const delay = Math.min(
      1000 * Math.pow(2, reconnectAttemptsRef.current), // 指数退避
      30000 // 最大30秒
    );

    logger.info(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, []);

  // Process message queue one by one to ensure all messages are handled
  const processQueue = () => {
    if (processingQueueRef.current || messageQueueRef.current.length === 0) {
      return;
    }

    processingQueueRef.current = true;
    const message = messageQueueRef.current.shift();

    // Use requestAnimationFrame to ensure React state update completes
    requestAnimationFrame(() => {
      setLatestMessage(message);
      processingQueueRef.current = false;

      // Process next message if queue not empty
      if (messageQueueRef.current.length > 0) {
        processQueue();
      }
    });
  };

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      const wsUrl = buildWebSocketUrl();
      logger.debug('Connecting to:', { wsUrl });

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        logger.info('Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts
        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          // Handle pong for latency measurement
          if (data.type === 'pong') {
            const latency = Date.now() - (data.timestamp || Date.now());
            pingLatenciesRef.current.push(latency);
            // Keep last 10 measurements
            if (pingLatenciesRef.current.length > 10) {
              pingLatenciesRef.current.shift();
            }
            updateConnectionQuality();
            return;
          }

          logger.debug('Received:', { type: data.type });

          // Add to queue and process
          messageQueueRef.current.push(data);
          processQueue();
        } catch (error) {
          logger.error('Parse error:', { error });
        }
      };

      ws.onclose = () => {
        logger.info('Disconnected');
        setIsConnected(false);
        setConnectionQuality('离线');
        wsRef.current = null;

        // Adaptive reconnect
        reconnect();
      };

      ws.onerror = error => {
        logger.error('WebSocket error:', { error });
      };
    } catch (error) {
      logger.error('Connection error:', { error });
      reconnect();
    }
  }, [reconnect, updateConnectionQuality]);

  // Send message
  const sendMessage = message => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      logger.warn('Not connected', { state: wsRef.current?.readyState });
    }
  };

  // Ping interval to keep connection alive and measure latency
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        measureLatency();
      }
    }, 15000);

    return () => clearInterval(pingInterval);
  }, [isConnected, measureLatency]);

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

  const value = useMemo(
    () => ({
      ws: wsRef.current,
      isConnected,
      connectionQuality,
      sendMessage,
      latestMessage,
    }),
    [isConnected, connectionQuality, latestMessage]
  );

  return value;
}

/**
 * WebSocket Provider Component
 */
export function WebSocketProvider({ children }) {
  const wsData = useWebSocketProvider();

  return <WebSocketContext.Provider value={wsData}>{children}</WebSocketContext.Provider>;
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
