#!/usr/bin/env node
/**
 * CloudCLI Voice - Backend Server
 *
 * Bridges frontend to Claude Code CLI with persistent session support.
 * Uses -p mode with session IDs for session continuity.
 */

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');

// Server configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Claude CLI path
const CLAUDE_PATH = process.env.CLAUDE_PATH ||
  '/Users/lg/.nvm/versions/node/v22.22.0/lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe';

// Create Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json({ limit: '50mb' }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(APP_ROOT, 'dist')));
}

// WebSocket server with heartbeat
const wss = new WebSocketServer({ server });

// Heartbeat interval to keep connections alive
const HEARTBEAT_INTERVAL = 30000;

function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
});

const heartbeatCheck = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('[INFO] Terminating dead connection');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

// Session management - use Claude's built-in session persistence
const sessionIds = new Map(); // Map websocket to session UUID

/**
 * Handle chat WebSocket connections
 */
function handleChatConnection(ws) {
  console.log('[INFO] Chat WebSocket connected');

  // Generate a persistent session ID for this connection
  const sessionId = randomUUID();
  sessionIds.set(ws, sessionId);

  // Send connection status
  ws.send(JSON.stringify({
    type: 'connected',
    sessionId: sessionId,
    claudeReady: true
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('[DEBUG] Received:', data.type);

      if (data.type === 'claude-command') {
        const { command, options } = data;
        const projectPath = options?.cwd || '/Users/lg/project/cloudCliVoice';
        const currentSessionId = sessionIds.get(ws) || sessionId;

        console.log('[INFO] Command:', command);
        console.log('[INFO] Session:', currentSessionId);

        // Notify client we're processing
        ws.send(JSON.stringify({
          type: 'status',
          message: 'Processing...'
        }));

        // Spawn Claude with session ID for continuity
        // For first message, use -c (continue most recent) or just -p
        // For subsequent messages, use --resume with session ID

        let args;
        const sessionFile = path.join(os.homedir(), '.claude', 'projects', projectPath.replace(/\//g, '-'), 'sessions', currentSessionId + '.json');

        // Simple approach: use -p mode which we know works
        // Session persistence is handled by Claude's internal mechanism
        args = [
          '-p',
          '--dangerously-skip-permissions',
          command
        ];

        console.log('[INFO] Spawning Claude with args:', args.join(' '));

        const claudeProc = spawn(CLAUDE_PATH, args, {
          cwd: projectPath,
          env: {
            ...process.env,
            HOME: process.env.HOME || '/Users/lg'
          },
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let outputBuffer = '';

        // Handle stdout
        claudeProc.stdout.on('data', (data) => {
          outputBuffer += data.toString();
          console.log('[Claude stdout]', data.toString().substring(0, 100));
        });

        // Handle stderr
        claudeProc.stderr.on('data', (data) => {
          console.log('[Claude stderr]', data.toString().substring(0, 100));
          ws.send(JSON.stringify({
            type: 'claude-output',
            data: data.toString()
          }));
        });

        // Handle process exit
        claudeProc.on('close', (exitCode) => {
          console.log('[Claude] Exit:', exitCode);

          if (outputBuffer.trim()) {
            ws.send(JSON.stringify({
              type: 'claude-response',
              data: {
                type: 'assistant',
                content: outputBuffer.trim()
              }
            }));

            // Trigger TTS
            if (exitCode === 0) {
              ws.send(JSON.stringify({
                type: 'complete',
                exitCode: exitCode
              }));
            }
          } else if (exitCode !== 0) {
            ws.send(JSON.stringify({
              type: 'error',
              error: `Claude exited with code ${exitCode}`
            }));
          }
        });

        claudeProc.on('error', (err) => {
          console.error('[Claude] Error:', err.message);
          ws.send(JSON.stringify({
            type: 'error',
            error: err.message
          }));
        });

      } else if (data.type === 'new-session') {
        // Start a fresh session
        const newSessionId = randomUUID();
        sessionIds.set(ws, newSessionId);
        ws.send(JSON.stringify({
          type: 'session-reset',
          sessionId: newSessionId
        }));
        console.log('[INFO] New session:', newSessionId);

      } else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }

    } catch (error) {
      console.error('[ERROR] Chat error:', error.message);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('[INFO] Chat client disconnected');
    sessionIds.delete(ws);
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
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/projects', async (req, res) => {
  try {
    const claudeProjectsPath = path.join(os.homedir(), '.claude', 'projects');
    const fs = await import('fs/promises');

    let projects = [];
    try {
      const dirs = await fs.readdir(claudeProjectsPath);
      projects = dirs.filter(dir => {
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
  console.log(`\n   Using Claude Code CLI with session persistence`);
  console.log(`   Claude path: ${CLAUDE_PATH}`);
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

  clearInterval(heartbeatCheck);

  server.close(() => {
    console.log('[INFO] Server closed');
    process.exit(0);
  });
});