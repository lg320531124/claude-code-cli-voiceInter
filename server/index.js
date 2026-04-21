#!/usr/bin/env node
/**
 * Claude Code CLI VoiceInter - Backend Server
 *
 * Persistent Claude CLI instance with stream-json mode.
 * One instance stays running, all messages go to the same instance.
 */

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { createInterface } from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');

// Server configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Claude CLI path
const CLAUDE_PATH = process.env.CLAUDE_PATH ||
  '/Users/lg/.nvm/versions/node/v22.22.0/lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe';

// Project path for Claude session
const PROJECT_PATH = '/Users/lg/project/cloudCliVoice';

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

// Heartbeat
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

// ============================================
// PERSISTENT CLAUDE INSTANCE
// ============================================

let claudeInstance = null;
let messageBuffer = '';
let isClaudeReady = false;
let pendingCommand = null;

/**
 * Start the persistent Claude instance
 */
function startClaudeInstance() {
  if (claudeInstance && !claudeInstance.killed) {
    console.log('[INFO] Claude instance already running');
    return;
  }

  console.log('[INFO] Starting persistent Claude instance...');
  console.log('[INFO] Claude path:', CLAUDE_PATH);
  console.log('[INFO] Project:', PROJECT_PATH);

  // Use stream-json mode for persistent communication
  claudeInstance = spawn(CLAUDE_PATH, [
    '--print',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--verbose',
    '--dangerously-skip-permissions'
  ], {
    cwd: PROJECT_PATH,
    env: {
      ...process.env,
      HOME: process.env.HOME || '/Users/lg'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Create readline interface for parsing JSON lines
  const stdoutRL = createInterface({
    input: claudeInstance.stdout,
    crlfDelay: Infinity
  });

  stdoutRL.on('line', (line) => {
    if (!line.trim()) return;

    console.log('[Claude] Output:', line.substring(0, 150));

    try {
      const msg = JSON.parse(line);
      handleClaudeMessage(msg);
    } catch (e) {
      // Not valid JSON, might be partial output
      console.log('[Claude raw]', line.substring(0, 100));
      // Send as plain text to clients
      broadcastToClients({
        type: 'claude-output',
        data: line
      });
    }
  });

  // Handle stderr
  claudeInstance.stderr.on('data', (data) => {
    const text = data.toString();
    console.log('[Claude stderr]', text.substring(0, 150));
  });

  // Handle process exit
  claudeInstance.on('close', (exitCode) => {
    console.log('[Claude] Instance exited with code:', exitCode);
    claudeInstance = null;
    isClaudeReady = false;

    broadcastToClients({
      type: 'claude-disconnected',
      exitCode
    });

    // Auto-restart after 2 seconds
    setTimeout(() => {
      console.log('[INFO] Auto-restarting Claude instance...');
      startClaudeInstance();
    }, 2000);
  });

  claudeInstance.on('error', (err) => {
    console.error('[Claude] Error:', err.message);
    broadcastToClients({
      type: 'error',
      error: err.message
    });
  });

  // Consider ready after a short delay (hooks take a moment to run)
  setTimeout(() => {
    console.log('[INFO] Claude instance ready');
    isClaudeReady = true;
    broadcastToClients({
      type: 'claude-ready',
      ready: true
    });

    // Send pending command if there is one
    if (pendingCommand) {
      sendCommandToClaude(pendingCommand);
      pendingCommand = null;
    }
  }, 3000);
}

/**
 * Handle a parsed JSON message from Claude
 */
function handleClaudeMessage(msg) {
  console.log('[Claude msg] type:', msg.type, 'subtype:', msg.subtype || '');

  // Map message types to frontend format
  if (msg.type === 'assistant') {
    // Extract content from message
    let content = '';
    if (msg.message?.content) {
      const textBlocks = msg.message.content.filter(c => c.type === 'text');
      content = textBlocks.map(c => c.text).join('');
      console.log('[Claude assistant] text blocks:', textBlocks.length, 'content length:', content.length);
    } else if (msg.content) {
      content = typeof msg.content === 'string' ? msg.content : '';
    }

    if (content.trim()) {
      console.log('[Claude assistant] sending content:', content.substring(0, 100));
      broadcastToClients({
        type: 'claude-response',
        data: {
          type: 'assistant',
          content: content.trim()
        }
      });

      // Signal completion
      broadcastToClients({
        type: 'complete'
      });
    }
  } else if (msg.type === 'result') {
    // Final result
    const content = msg.result || '';
    console.log('[Claude result] content:', content.substring(0, 100));
    if (content.trim()) {
      broadcastToClients({
        type: 'claude-response',
        data: {
          type: 'assistant',
          content: content.trim()
        }
      });
      broadcastToClients({
        type: 'complete'
      });
    }
  } else if (msg.type === 'error') {
    broadcastToClients({
      type: 'error',
      error: msg.error || msg.message || 'Unknown error'
    });
  } else if (msg.type === 'system') {
    // System messages (hooks, etc) - usually not shown to user
    console.log('[Claude system]', msg.subtype || '');
  } else if (msg.type === 'status') {
    broadcastToClients({
      type: 'status',
      message: msg.status || ''
    });
  } else {
    // Unknown type - send raw
    broadcastToClients({
      type: 'claude-output',
      data: msg
    });
  }
}

/**
 * Send a command to Claude via stdin
 */
function sendCommandToClaude(command) {
  if (!claudeInstance || claudeInstance.killed) {
    console.log('[WARN] Claude not running, starting...');
    pendingCommand = command;
    startClaudeInstance();
    return;
  }

  // Wait if not ready yet
  if (!isClaudeReady) {
    console.log('[WARN] Claude not ready yet, queuing command...');
    pendingCommand = command;
    return;
  }

  // stream-json input format
  const message = JSON.stringify({
    type: 'user',
    message: {
      role: 'user',
      content: command
    }
  }) + '\n';

  console.log('[Sending to Claude]', message.substring(0, 80));

  try {
    claudeInstance.stdin.write(message);
    pendingCommand = null;
  } catch (e) {
    console.error('[ERROR] Failed to write to stdin:', e.message);
    broadcastToClients({
      type: 'error',
      error: 'Failed to send message to Claude'
    });
  }
}

/**
 * Broadcast message to all connected WebSocket clients
 */
function broadcastToClients(message) {
  const json = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

// ============================================
// WEBSOCKET HANDLER
// ============================================

function handleChatConnection(ws) {
  console.log('[INFO] Chat WebSocket connected');

  // Send connection status
  ws.send(JSON.stringify({
    type: 'connected',
    claudeReady: isClaudeReady
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('[DEBUG] Received:', data.type);

      if (data.type === 'claude-command') {
        const { command } = data;

        console.log('[INFO] Command:', command);

        // Notify all clients we're processing
        broadcastToClients({
          type: 'status',
          message: 'Processing...'
        });

        // Send command to persistent Claude instance
        sendCommandToClaude(command);

      } else if (data.type === 'new-session') {
        // Kill current instance and start fresh
        if (claudeInstance && !claudeInstance.killed) {
          claudeInstance.kill();
          claudeInstance = null;
          isClaudeReady = false;
          pendingCommand = null;
        }

        ws.send(JSON.stringify({
          type: 'session-reset'
        }));

        // Start new instance
        setTimeout(() => startClaudeInstance(), 500);

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

// ============================================
// API ENDPOINTS
// ============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    claudeReady: isClaudeReady
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

// ============================================
// START SERVER
// ============================================

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 Claude Code CLI VoiceInter running at http://${HOST}:${PORT}`);
  console.log(`   WebSocket: ws://${HOST}:${PORT}/ws`);
  console.log(`   API: http://${HOST}:${PORT}/api`);
  console.log(`\n   Persistent Claude instance (stream-json mode)`);
  console.log(`   Claude path: ${CLAUDE_PATH}`);
  console.log('\nPress Ctrl+C to stop\n');

  // Start Claude instance immediately
  startClaudeInstance();
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', () => {
  console.log('\n[INFO] Shutting down...');

  // Kill Claude instance
  if (claudeInstance && !claudeInstance.killed) {
    console.log('[INFO] Stopping Claude instance...');
    claudeInstance.kill();
  }

  clearInterval(heartbeatCheck);

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