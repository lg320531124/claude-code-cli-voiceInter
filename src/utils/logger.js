/**
 * Logger utility - Simple logging for server
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel = process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] : LOG_LEVELS.INFO;

let context = 'App';

function setContext(ctx) {
  context = ctx;
}

function formatMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `${timestamp} [${level}] [${context}] ${message}${dataStr}`;
}

function debug(message, data) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.debug(formatMessage('DEBUG', message, data));
  }
}

function info(message, data) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.info(formatMessage('INFO', message, data));
  }
}

function warn(message, data) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn(formatMessage('WARN', message, data));
  }
}

function error(message, data) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    console.error(formatMessage('ERROR', message, data));
  }
}

export default {
  setContext,
  debug,
  info,
  warn,
  error,
  LOG_LEVELS,
};