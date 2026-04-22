// src/utils/logger.js
//
// Structured logging utility
// - Replaces console.log with JSON structured logs
// - Supports log levels (DEBUG, INFO, WARN, ERROR)
// - Configurable log level
// - Production mode silencing

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor(level = 'INFO') {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    this.context = '';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  setLevel(level) {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  }

  setContext(context) {
    this.context = context;
  }

  log(level, message, data = {}) {
    if (LOG_LEVELS[level] < this.level) return;

    // In production, only log WARN and ERROR
    if (this.isProduction && LOG_LEVELS[level] < LOG_LEVELS.WARN) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...data
    };

    if (level === 'ERROR') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'WARN') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  debug(msg, data) { this.log('DEBUG', msg, data); }
  info(msg, data) { this.log('INFO', msg, data); }
  warn(msg, data) { this.log('WARN', msg, data); }
  error(msg, data) { this.log('ERROR', msg, data); }

  // Convenience method for logging with a temporary context
  withContext(context) {
    const originalContext = this.context;
    this.context = context;
    return {
      debug: (msg, data) => this.debug(msg, data),
      info: (msg, data) => this.info(msg, data),
      warn: (msg, data) => this.warn(msg, data),
      error: (msg, data) => this.error(msg, data),
      end: () => { this.context = originalContext; }
    };
  }
}

// Create singleton instance
const logger = new Logger(
  typeof process !== 'undefined' ? (process.env.LOG_LEVEL || 'INFO') : 'INFO'
);

export { Logger, logger };
export default logger;