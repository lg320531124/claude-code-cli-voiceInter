#!/usr/bin/env node
/**
 * CloudCLI Voice - Simplified Backend Server
 *
 * A minimal WebSocket server that bridges the frontend to Claude Code SDK.
 * Based on CloudCLI (claudecodeui) architecture, simplified for voice interaction.
 */

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');

// Server configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Create Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json({ limit: '50mb' }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(APP_ROOT, 'dist')));
}

// WebSocket server
const wss = new WebSocketServer({ server });

// Connected clients
const connectedClients = new Set();

// Active sessions
const activeSessions = new Map();

/**
 * WebSocket Writer - Wrapper for WebSocket to send messages
 */
class WebSocketWriter {
  constructor(ws) {
    this.ws = ws;
    this.sessionId = null;
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  setSessionId(sessionId) {
    this.sessionId = sessionId;
    this.send({ type: 'session-id', sessionId });
  }

  getSessionId() {
    return this.sessionId;
  }
}

/**
 * Handle chat WebSocket connections
 */
function handleChatConnection(ws) {
  console.log('[INFO] Chat WebSocket connected');

  connectedClients.add(ws);
  const writer = new WebSocketWriter(ws);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('[DEBUG] Received:', data.type);

      if (data.type === 'claude-command') {
        console.log('[DEBUG] User message:', data.command);
        console.log('[DEBUG] Project:', data.options?.cwd || process.cwd());

        // Import Claude SDK dynamically
        const { queryClaudeSDK } = await import('./claude-sdk.js');

        await queryClaudeSDK(data.command, data.options || {}, writer);
      } else if (data.type === 'abort-session') {
        console.log('[DEBUG] Abort session:', data.sessionId);

        const session = activeSessions.get(data.sessionId);
        if (session && session.controller) {
          session.controller.abort();
          activeSessions.delete(data.sessionId);
          writer.send({ type: 'session-aborted', sessionId: data.sessionId });
        }
      } else if (data.type === 'ping') {
        writer.send({ type: 'pong' });
      }
    } catch (error) {
      console.error('[ERROR] Chat error:', error.message);
      writer.send({
        type: 'error',
        error: error.message
      });
    }
  });

  ws.on('close', () => {
    console.log('[INFO] Chat client disconnected');
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('[ERROR] WebSocket error:', error.message);
  });
}

// WebSocket connection handler
wss.on('connection', (ws, request) => {
  const url = request.url;
  console.log('[INFO] Client connected to:', url);

  const pathname = url.split('?')[0];

  if (pathname === '/ws/chat' || pathname === '/ws') {
    handleChatConnection(ws);
  } else {
    console.log('[WARN] Unknown WebSocket path:', pathname);
    ws.close();
  }
});

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/projects', async (req, res) => {
  try {
    const claudeProjectsPath = path.join(os.homedir(), '.claude', 'projects');
    const fs = await import('fs/promises');

    let projects = [];
    try {
      const dirs = await fs.readdir(claudeProjectsPath);
      projects = dirs.filter(dir => {
        // Filter out hidden files and non-directories
        return !dir.startsWith('.') && dir.includes('-');
      }).map(dir => ({
        name: dir,
        path: path.join(claudeProjectsPath, dir)
      }));
    } catch (e) {
      // Projects directory doesn't exist yet
    }

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all for SPA in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(APP_ROOT, 'dist', 'index.html'));
  });
}

// Start server
server.listen(PORT, HOST, () => {
  console.log(`\n🚀 CloudCLI Voice Server running at http://${HOST}:${PORT}`);
  console.log(`   WebSocket: ws://${HOST}:${PORT}/ws`);
  console.log(`   API: http://${HOST}:${PORT}/api`);
  console.log('\nPress Ctrl+C to stop\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[INFO] Shutting down...');
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });
  server.close(() => {
    console.log('[INFO] Server closed');
    process.exit(0);
  });
});

export { activeSessions, WebSocketWriter };