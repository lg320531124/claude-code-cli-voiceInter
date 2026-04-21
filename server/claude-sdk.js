/**
 * Claude SDK Integration - Simplified
 *
 * This module provides direct SDK integration with Claude using @anthropic-ai/claude-agent-sdk.
 * Based on CloudCLI's claude-sdk.js, simplified for voice interaction.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import crypto from 'crypto';
import path from 'path';
import os from 'os';

// Active sessions tracking
const activeSessions = new Map();

/**
 * Generate unique session ID
 */
function generateSessionId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Map options to SDK format
 */
function mapOptionsToSDK(options = {}) {
  const sdkOptions = {};

  // Working directory
  if (options.cwd) {
    sdkOptions.cwd = options.cwd;
  } else {
    sdkOptions.cwd = process.cwd();
  }

  // Permission mode - bypass for simplicity
  sdkOptions.permissionMode = 'bypassPermissions';

  // Model selection
  sdkOptions.model = options.model || 'sonnet';

  // System prompt preset
  sdkOptions.systemPrompt = {
    type: 'preset',
    preset: 'claude_code'
  };

  // Setting sources for CLAUDE.md loading
  sdkOptions.settingSources = ['project', 'user', 'local'];

  // Tools preset
  sdkOptions.tools = { type: 'preset', preset: 'claude_code' };

  // Resume session if provided
  if (options.sessionId) {
    sdkOptions.resume = options.sessionId;
  }

  return sdkOptions;
}

/**
 * Query Claude SDK and stream results to WebSocket
 *
 * @param {string} command - User message/command
 * @param {Object} options - Query options (cwd, sessionId, model)
 * @param {WebSocketWriter} writer - WebSocket writer for streaming
 */
async function queryClaudeSDK(command, options = {}, writer) {
  let sessionId = options.sessionId || generateSessionId();
  writer.setSessionId(sessionId);

  // Send status message
  writer.send({
    type: 'status',
    message: 'Processing...',
    sessionId
  });

  try {
    // Map options to SDK format
    const sdkOptions = mapOptionsToSDK(options);

    console.log('[SDK] Starting query with model:', sdkOptions.model);
    console.log('[SDK] Working directory:', sdkOptions.cwd);

    // Create abort controller for this session
    const controller = new AbortController();
    activeSessions.set(sessionId, { controller, writer });

    // Query the SDK
    const result = await query({
      prompt: command,
      options: sdkOptions,
      abortController: controller
    });

    // Stream messages to frontend
    for (const message of result.messages || []) {
      // Handle different message types
      if (message.type === 'assistant' || message.role === 'assistant') {
        // Extract text content
        let textContent = '';
        if (typeof message.content === 'string') {
          textContent = message.content;
        } else if (Array.isArray(message.content)) {
          for (const block of message.content) {
            if (block.type === 'text' && block.text) {
              textContent += block.text;
            }
          }
        }

        if (textContent) {
          writer.send({
            type: 'claude-response',
            sessionId,
            data: {
              type: 'assistant',
              content: textContent
            }
          });
        }
      } else if (message.type === 'result') {
        writer.send({
          type: 'claude-response',
          sessionId,
          data: {
            type: 'result',
            content: message.content || message.result || ''
          }
        });
      }
    }

    // Send completion
    writer.send({
      type: 'complete',
      sessionId,
      success: true
    });

    // Cleanup session
    activeSessions.delete(sessionId);

    return { success: true, sessionId };

  } catch (error) {
    console.error('[SDK] Error:', error.message);

    // Check if aborted
    if (error.name === 'AbortError') {
      writer.send({
        type: 'aborted',
        sessionId,
        message: 'Session aborted'
      });
    } else {
      writer.send({
        type: 'error',
        sessionId,
        error: error.message
      });
    }

    activeSessions.delete(sessionId);
    return { success: false, error: error.message, sessionId };
  }
}

/**
 * Abort an active session
 */
async function abortClaudeSDKSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session && session.controller) {
    session.controller.abort();
    activeSessions.delete(sessionId);
    return true;
  }
  return false;
}

/**
 * Check if session is active
 */
function isClaudeSDKSessionActive(sessionId) {
  return activeSessions.has(sessionId);
}

/**
 * Get all active sessions
 */
function getActiveClaudeSDKSessions() {
  return Array.from(activeSessions.keys());
}

export {
  queryClaudeSDK,
  abortClaudeSDKSession,
  isClaudeSDKSessionActive,
  getActiveClaudeSDKSessions
};