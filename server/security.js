// server/security.js
//
// Security utilities for the backend server
// - Input validation
// - Command sanitization
// - Rate limiting helpers

import logger from '../src/utils/logger.js';

/**
 * Sanitize command input to prevent injection
 * - Remove dangerous characters
 * - Limit length
 * - Check for dangerous patterns
 */
export function sanitizeCommand(command) {
  if (!command || typeof command !== 'string') {
    return null;
  }

  // Limit length (max 10KB)
  if (command.length > 10240) {
    return null;
  }

  // Remove control characters except newlines
  const sanitized = command.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Check for shell injection patterns
  const dangerousPatterns = [
    /\$\(/, // Command substitution
    /`[^`]+`/, // Command substitution (backticks)
    /\|.*\|/, // Pipes
    /;.*;/, // Multiple commands
    /\n.*\n.*\n.*\n/, // More than 3 newlines (unusual)
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      logger.warn('Potentially dangerous command pattern detected');
      return null;
    }
  }

  return sanitized;
}

/**
 * Validate CLI command structure
 * - Check allowed commands
 * - Validate arguments
 */
const ALLOWED_CLI_COMMANDS = [
  '--model',
  '--resume',
  '--continue',
  '--fork-session',
  '--disable-slash-commands',
  '--bare',
  '--verbose',
  '--debug',
  '--tmux',
  '--effort',
  '--fast',
  '--help',
  '--version',
  '--doctor',
  '--update',
  'agents',
  'auth',
  'setup-token',
  'plugin',
  'mcp',
];

export function validateCliCommand(command, args = []) {
  if (!command || typeof command !== 'string') {
    return { valid: false, error: 'Invalid command format' };
  }

  // Check if command is allowed
  const isAllowed = ALLOWED_CLI_COMMANDS.some(
    allowed => command === allowed || command.startsWith(allowed.split(' ')[0])
  );

  if (!isAllowed) {
    logger.warn('Blocked unauthorized CLI command:', { command });
    return { valid: false, error: 'Command not allowed' };
  }

  // Validate args
  for (const arg of args) {
    if (typeof arg !== 'string' || arg.length > 256) {
      return { valid: false, error: 'Invalid argument' };
    }
  }

  return { valid: true, command, args };
}

/**
 * Rate limiting (in-memory, per client ID with IP tracking)
 */
const rateLimitMap = new Map();

export function checkRateLimit(clientId, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId) || { count: 0, windowStart: now, ip: clientId };

  // Reset window if expired
  if (now - clientData.windowStart > windowMs) {
    clientData.count = 0;
    clientData.windowStart = now;
  }

  // Check limit
  if (clientData.count >= maxRequests) {
    logger.warn('Rate limit exceeded', { clientId, count: clientData.count });
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  clientData.count++;
  rateLimitMap.set(clientId, clientData);

  return { allowed: true, remaining: maxRequests - clientData.count };
}

/**
 * Clean up rate limit entries (call periodically)
 * Auto-cleanup runs every 5 minutes
 */
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer = null;

export function cleanupRateLimits(maxAge = 300000) {
  const now = Date.now();
  for (const [clientId, data] of rateLimitMap.entries()) {
    if (now - data.windowStart > maxAge) {
      rateLimitMap.delete(clientId);
    }
  }
}

export function startRateLimitCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => cleanupRateLimits(), CLEANUP_INTERVAL);
}

export function stopRateLimitCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

export default {
  sanitizeCommand,
  validateCliCommand,
  checkRateLimit,
  cleanupRateLimits,
};
