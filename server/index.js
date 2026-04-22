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
import fs from 'fs/promises';
import multer from 'multer';
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');

// Server configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Claude CLI path - use global claude command
const CLAUDE_PATH = process.env.CLAUDE_PATH || 'claude';

// VoiceMode 服务端点
const WHISPER_ENDPOINT = process.env.WHISPER_ENDPOINT || 'http://127.0.0.1:2022/v1';
const KOKORO_ENDPOINT = process.env.KOKORO_ENDPOINT || 'http://127.0.0.1:8880/v1';

async function checkService(url) {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

// Project path for Claude session (use current project or user's home)
const PROJECT_PATH = process.env.PROJECT_PATH || '/Users/lg/project/claude-code-cli-voiceInter';

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

  // Handle content block updates (streaming)
  if (msg.type === 'content_block_start' || msg.type === 'content_block_delta') {
    // Streaming content - send immediately
    if (msg.content_block?.type === 'text' || msg.delta?.type === 'text_delta') {
      const text = msg.delta?.text || '';
      if (text) {
        broadcastToClients({
          type: 'stream-delta',
          content: text
        });
      }
    }
  }

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

    // Extract usage info from assistant message
    if (msg.message?.usage) {
      broadcastToClients({
        type: 'token-usage',
        usage: {
          inputTokens: msg.message.usage.input_tokens || 0,
          outputTokens: msg.message.usage.output_tokens || 0
        }
      });
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
    // Final result with complete usage info
    const content = msg.result || '';
    console.log('[Claude result] content:', content.substring(0, 100));

    // Extract complete usage and cost info
    if (msg.usage || msg.total_cost_usd || msg.modelUsage) {
      const usageData = {
        totalCostUsd: msg.total_cost_usd || 0,
        inputTokens: msg.usage?.input_tokens || 0,
        outputTokens: msg.usage?.output_tokens || 0,
        cacheReadTokens: msg.usage?.cache_read_input_tokens || 0,
        cacheCreationTokens: msg.usage?.cache_creation_input_tokens || 0,
        durationMs: msg.duration_ms || 0,
        durationApiMs: msg.duration_api_ms || 0,
        modelUsage: msg.modelUsage || {}
      };

      console.log('[Claude result] cost:', usageData.totalCostUsd, 'input:', usageData.inputTokens, 'output:', usageData.outputTokens);

      broadcastToClients({
        type: 'token-usage-final',
        usage: usageData
      });
    }

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

      // ============================================
      // SKILL MANAGEMENT
      // ============================================
      } else if (data.type === 'list-skills') {
        try {
          const skillsDir = path.join(PROJECT_PATH, '.claude', 'skills');
          const skills = [];

          try {
            const files = await fs.readdir(skillsDir);
            for (const file of files) {
              if (file.endsWith('.md')) {
                const skillPath = path.join(skillsDir, file);
                const content = await fs.readFile(skillPath, 'utf-8');
                skills.push({
                  name: file.replace('.md', ''),
                  path: skillPath,
                  content: content.substring(0, 200) + (content.length > 200 ? '...' : '')
                });
              }
            }
          } catch (e) {
            // Skills directory doesn't exist
          }

          ws.send(JSON.stringify({
            type: 'skills-list',
            skills
          }));
        } catch (error) {
          console.error('[ERROR] List skills:', error.message);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to list skills'
          }));
        }

      } else if (data.type === 'list-all-skills') {
        // List all installed skills from all plugins
        try {
          const allSkills = [];
          const pluginsDir = path.join(os.homedir(), '.claude', 'plugins');

          // Check plugin cache directories
          const cacheDir = path.join(pluginsDir, 'cache');
          try {
            const cacheDirs = await fs.readdir(cacheDir);
            for (const dir of cacheDirs) {
              const marketplacePath = path.join(cacheDir, dir);
              try {
                const pluginNames = await fs.readdir(marketplacePath);
                for (const pluginName of pluginNames) {
                  const pluginPath = path.join(marketplacePath, pluginName);
                  try {
                    // Get version directories
                    const versions = await fs.readdir(pluginPath);
                    for (const version of versions) {
                      const versionPath = path.join(pluginPath, version);

                      // Check skills directory
                      const skillsPath = path.join(versionPath, 'skills');
                      try {
                        const skillDirs = await fs.readdir(skillsPath);
                        for (const skillDir of skillDirs) {
                          const skillFile = path.join(skillsPath, skillDir, 'SKILL.md');
                          try {
                            await fs.access(skillFile);
                            allSkills.push({
                              name: skillDir,
                              source: `${dir}/${pluginName}`,
                              type: 'skill'
                            });
                          } catch (e) {}
                        }
                      } catch (e) {}

                      // Also check .agents/skills
                      const agentsSkillsPath = path.join(versionPath, '.agents', 'skills');
                      try {
                        const skillDirs = await fs.readdir(agentsSkillsPath);
                        for (const skillDir of skillDirs) {
                          const skillFile = path.join(agentsSkillsPath, skillDir, 'SKILL.md');
                          try {
                            await fs.access(skillFile);
                            allSkills.push({
                              name: skillDir,
                              source: `${dir}/${pluginName}`,
                              type: 'skill'
                            });
                          } catch (e) {}
                        }
                      } catch (e) {}
                    }
                  } catch (e) {}
                }
              } catch (e) {}
            }
          } catch (e) {}

          // Check marketplaces
          const marketplacesDir = path.join(pluginsDir, 'marketplaces');
          try {
            const marketplaces = await fs.readdir(marketplacesDir);
            for (const marketplace of marketplaces) {
              const pluginSkillsPath = path.join(marketplacesDir, marketplace, 'plugin', 'skills');
              try {
                const skillDirs = await fs.readdir(pluginSkillsPath);
                for (const skillDir of skillDirs) {
                  const skillFile = path.join(pluginSkillsPath, skillDir, 'SKILL.md');
                  try {
                    await fs.access(skillFile);
                    allSkills.push({
                      name: skillDir,
                      source: marketplace,
                      type: 'skill'
                    });
                  } catch (e) {}
                }
              } catch (e) {}
            }
          } catch (e) {}

          ws.send(JSON.stringify({
            type: 'all-skills-list',
            skills: allSkills
          }));
        } catch (error) {
          console.error('[ERROR] List all skills:', error.message);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to list all skills'
          }));
        }

      } else if (data.type === 'create-skill') {
        try {
          const { name, content } = data;
          const skillsDir = path.join(PROJECT_PATH, '.claude', 'skills');

          // Ensure directory exists
          await fs.mkdir(skillsDir, { recursive: true });

          const skillPath = path.join(skillsDir, `${name}.md`);
          await fs.writeFile(skillPath, content, 'utf-8');

          console.log('[INFO] Skill created:', name);

          ws.send(JSON.stringify({
            type: 'skill-created',
            skill: { name, path: skillPath, content: content.substring(0, 200) }
          }));
        } catch (error) {
          console.error('[ERROR] Create skill:', error.message);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to create skill'
          }));
        }

      } else if (data.type === 'delete-skill') {
        try {
          const { name } = data;
          const skillPath = path.join(PROJECT_PATH, '.claude', 'skills', `${name}.md`);

          await fs.unlink(skillPath);
          console.log('[INFO] Skill deleted:', name);

          ws.send(JSON.stringify({
            type: 'skill-deleted',
            name
          }));
        } catch (error) {
          console.error('[ERROR] Delete skill:', error.message);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to delete skill'
          }));
        }

      } else if (data.type === 'get-skill') {
        try {
          const { name } = data;
          const skillPath = path.join(PROJECT_PATH, '.claude', 'skills', `${name}.md`);

          const content = await fs.readFile(skillPath, 'utf-8');

          ws.send(JSON.stringify({
            type: 'skill-content',
            name,
            content
          }));
        } catch (error) {
          console.error('[ERROR] Get skill:', error.message);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to get skill'
          }));
        }

      // ============================================
      // CLI COMMAND EXECUTION
      // ============================================
      } else if (data.type === 'cli-command') {
        try {
          const { command, args = [] } = data;
          console.log('[CLI] Executing:', command, args.join(' '));

          // Build full command
          const fullArgs = [command, ...args];

          // Spawn CLI process
          const cliProcess = spawn(CLAUDE_PATH, fullArgs, {
            cwd: PROJECT_PATH,
            env: {
              ...process.env,
              HOME: process.env.HOME || '/Users/lg'
            },
            stdio: ['pipe', 'pipe', 'pipe']
          });

          let output = '';
          let errorOutput = '';

          cliProcess.stdout.on('data', (data) => {
            output += data.toString();
          });

          cliProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });

          cliProcess.on('close', (exitCode) => {
            console.log('[CLI] Exit code:', exitCode);

            ws.send(JSON.stringify({
              type: 'cli-result',
              command: command,
              args: args,
              exitCode,
              output: output.trim(),
              error: errorOutput.trim()
            }));
          });

          cliProcess.on('error', (err) => {
            console.error('[CLI] Error:', err.message);
            ws.send(JSON.stringify({
              type: 'cli-error',
              command: command,
              error: err.message
            }));
          });

        } catch (error) {
          console.error('[ERROR] CLI command:', error.message);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to execute CLI command'
          }));
        }

      } else if (data.type === 'cli-command-with-input') {
        try {
          const { command, args = [], inputValue } = data;
          console.log('[CLI] Executing with input:', command, args.join(' '));

          // Build full command - add inputValue as argument if needed
          let fullArgs = [command, ...args];
          if (inputValue) {
            fullArgs.push(inputValue);
          }

          // Spawn CLI process
          const cliProcess = spawn(CLAUDE_PATH, fullArgs, {
            cwd: PROJECT_PATH,
            env: {
              ...process.env,
              HOME: process.env.HOME || '/Users/lg'
            },
            stdio: ['pipe', 'pipe', 'pipe']
          });

          let output = '';
          let errorOutput = '';

          cliProcess.stdout.on('data', (data) => {
            output += data.toString();
          });

          cliProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });

          cliProcess.on('close', (exitCode) => {
            console.log('[CLI] Exit code:', exitCode);

            ws.send(JSON.stringify({
              type: 'cli-result',
              command: command,
              args: fullArgs,
              exitCode,
              output: output.trim(),
              error: errorOutput.trim()
            }));
          });

          cliProcess.on('error', (err) => {
            console.error('[CLI] Error:', err.message);
            ws.send(JSON.stringify({
              type: 'cli-error',
              command: command,
              error: err.message
            }));
          });

        } catch (error) {
          console.error('[ERROR] CLI command:', error.message);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to execute CLI command'
          }));
        }
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

// 语音服务状态
app.get('/api/voice/status', async (req, res) => {
  const whisperOk = await checkService(WHISPER_ENDPOINT);
  const kokoroOk = await checkService(KOKORO_ENDPOINT);

  res.json({
    whisper: whisperOk ? 'running' : 'offline',
    kokoro: kokoroOk ? 'running' : 'offline',
    ready: whisperOk && kokoroOk
  });
});

// Whisper STT - 接收音频，返回转录文本
app.post('/api/voice/stt', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '需要音频文件' });
    }

    const audioBuffer = req.file.buffer;
    const language = req.body.language || 'auto';

    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer]), 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', language);

    const response = await fetch(`${WHISPER_ENDPOINT}/audio/transcriptions`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Whisper 服务响应错误: ${response.status}`);
    }

    const result = await response.json();
    res.json({ success: true, text: result.text });
  } catch (error) {
    console.error('[STT 错误]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Kokoro TTS - 接收文本，返回音频
app.post('/api/voice/tts', express.json(), async (req, res) => {
  try {
    const { text, voice = 'af_sky', speed = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: '需要文本内容' });
    }

    const response = await fetch(`${KOKORO_ENDPOINT}/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice,
        speed
      })
    });

    if (!response.ok) {
      throw new Error(`Kokoro 服务响应错误: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('[TTS 错误]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

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