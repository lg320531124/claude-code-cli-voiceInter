#!/usr/bin/env node
/**
 * CloudCLI Voice - Backend Server
 *
 * Bridges frontend to Claude Code CLI using child_process spawn.
 * Uses your existing Claude Code authentication (~/.claude).
 */

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { spawn } from 'child_process';

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

// Active sessions (pty processes)
const activeSessions = new Map();

/**
 * Handle chat WebSocket connections
 */
function handleChatConnection(ws) {
  console.log('[INFO] Chat WebSocket connected');

  let currentSession = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('[DEBUG] Received:', data.type);

      if (data.type === 'claude-command') {
        const { command, options } = data;
        const projectPath = options?.cwd || process.cwd();
        const sessionId = options?.sessionId;

        console.log('[INFO] Command:', command);
        console.log('[INFO] Project:', projectPath);

        // Check if we have an existing session
        if (sessionId && activeSessions.has(sessionId)) {
          currentSession = activeSessions.get(sessionId);
          // Send command to existing process
          currentSession.proc.stdin.write(command + '\n');
          return;
        }

        // Create new session
        const newSessionId = sessionId || `session-${Date.now()}`;

        // Send session ID to client
        ws.send(JSON.stringify({
          type: 'session-id',
          sessionId: newSessionId
        }));

        // Send status (only once)
        ws.send(JSON.stringify({
          type: 'status',
          message: 'Processing your request...'
        }));

        // Spawn Claude Code CLI
        console.log('[INFO] Spawning Claude Code CLI...');

        // Use absolute path to claude.exe binary
        const claudePath = '/Users/lg/.nvm/versions/node/v22.22.0/lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe';
        console.log('[INFO] Claude path:', claudePath);
        console.log('[INFO] Command:', command);

        const claudeProc = spawn(claudePath, ['-p', '--dangerously-skip-permissions', command], {
          cwd: projectPath || '/Users/lg',
          env: {
            ...process.env,
            HOME: process.env.HOME || '/Users/lg'
          },
          stdio: ['ignore', 'pipe', 'pipe']  // Ignore stdin, pipe stdout/stderr
        });

        currentSession = {
          id: newSessionId,
          proc: claudeProc,
          ws: ws,
          buffer: ''
        };

        activeSessions.set(newSessionId, currentSession);

        // Handle stdout
        claudeProc.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('[Claude] Output:', output.substring(0, 100));

          // Only send as final response (not streaming output)
          if (output.trim()) {
            ws.send(JSON.stringify({
              type: 'claude-response',
              sessionId: newSessionId,
              data: {
                type: 'assistant',
                content: output.trim()
              }
            }));
          }
        });

        // Handle stderr
        claudeProc.stderr.on('data', (data) => {
          console.log('[Claude] Error:', data.toString().substring(0, 100));
          ws.send(JSON.stringify({
            type: 'claude-output',
            sessionId: newSessionId,
            data: data.toString()
          }));
        });

        // Handle process exit
        claudeProc.on('close', (exitCode) => {
          console.log('[Claude] Exit:', exitCode);
          ws.send(JSON.stringify({
            type: 'complete',
            sessionId: newSessionId,
            exitCode: exitCode
          }));
          activeSessions.delete(newSessionId);
        });

        claudeProc.on('error', (err) => {
          console.error('[Claude] Error:', err.message);
          ws.send(JSON.stringify({
            type: 'error',
            sessionId: newSessionId,
            error: err.message
          }));
        });

      } else if (data.type === 'abort-session') {
        const sessionId = data.sessionId;
        if (activeSessions.has(sessionId)) {
          const session = activeSessions.get(sessionId);
          session.proc.kill();
          activeSessions.delete(sessionId);
          ws.send(JSON.stringify({
            type: 'aborted',
            sessionId: sessionId
          }));
        }
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
    // Don't kill the PTY on disconnect - let it continue
    // User can reconnect later
  });

  ws.on('error', (error) => {
    console.error('[ERROR] WebSocket error:', error.message);
  });
}

/**
 * Parse Claude output for structured messages
 */
function parseAndSendStructured(data, ws, sessionId) {
  // Claude Code outputs structured data in certain formats
  // Try to detect and parse it

  // Look for JSONL format (JSON lines)
  const lines = data.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(line.trim());

        // Check if it's a Claude message
        if (parsed.message || parsed.type) {
          ws.send(JSON.stringify({
            type: 'claude-response',
            sessionId: sessionId,
            data: parsed
          }));
        }
      } catch (e) {
        // Not valid JSON, ignore
      }
    }
  }

  // Look for assistant response markers
  if (data.includes('assistant:') || data.includes('Claude:')) {
    // Extract the response text
    const responseMatch = data.match(/(?:assistant|Claude):\s*(.*)/);
    if (responseMatch) {
      ws.send(JSON.stringify({
        type: 'claude-response',
        sessionId: sessionId,
        data: {
          type: 'assistant',
          content: responseMatch[1]
        }
      }));
    }
  }
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
  console.log(`\n   Using real Claude Code CLI (spawn)`);
  console.log(`   Make sure 'claude' command is available in your terminal`);
  console.log('\nPress Ctrl+C to stop\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[INFO] Shutting down...');

  // Kill all active processes
  for (const [id, session] of activeSessions) {
    try {
      session.proc.kill();
    } catch (e) {
      // Ignore errors
    }
  }

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