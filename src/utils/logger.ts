// src/utils/logger.ts
//
// Structured logging utility
// - Replaces console.log with JSON structured logs
// - Supports log levels (DEBUG, INFO, WARN, ERROR)
// - Configurable log level
// - Production mode silencing

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  [key: string]: unknown;
}

interface LoggerOptions {
  level?: LogLevel;
}

class Logger {
  private level: number;
  private context: string;
  private isProduction: boolean;

  constructor(options: LoggerOptions = {}) {
    const level = options.level || 'INFO';
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    this.context = '';
    this.isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  }

  setLevel(level: LogLevel): void {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  }

  setContext(context: string): void {
    this.context = context;
  }

  log(level: LogLevel, message: string, data: Record<string, unknown> = {}): void {
    if (LOG_LEVELS[level] < this.level) return;

    // In production, only log WARN and ERROR
    if (this.isProduction && LOG_LEVELS[level] < LOG_LEVELS.WARN) return;

    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...data,
    };

    if (level === 'ERROR') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'WARN') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    this.log('DEBUG', msg, data);
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.log('INFO', msg, data);
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    this.log('WARN', msg, data);
  }

  error(msg: string, data?: Record<string, unknown>): void {
    this.log('ERROR', msg, data);
  }

  // Convenience method for logging with a temporary context
  withContext(context: string): {
    debug: (msg: string, data?: Record<string, unknown>) => void;
    info: (msg: string, data?: Record<string, unknown>) => void;
    warn: (msg: string, data?: Record<string, unknown>) => void;
    error: (msg: string, data?: Record<string, unknown>) => void;
    end: () => void;
  } {
    const originalContext = this.context;
    this.context = context;
    return {
      debug: (msg, data) => this.debug(msg, data),
      info: (msg, data) => this.info(msg, data),
      warn: (msg, data) => this.warn(msg, data),
      error: (msg, data) => this.error(msg, data),
      end: () => {
        this.context = originalContext;
      },
    };
  }
}

// Create singleton instance
const getLogLevel = (): LogLevel => {
  if (typeof process === 'undefined') return 'INFO';
  const envLevel = process.env?.LOG_LEVEL;
  if (envLevel && LOG_LEVELS[envLevel as LogLevel] !== undefined) {
    return envLevel as LogLevel;
  }
  return 'INFO';
};

const logger = new Logger({ level: getLogLevel() });

export { Logger, logger };
export type { LogLevel, LogEntry };
export default logger;
