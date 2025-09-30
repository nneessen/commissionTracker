// src/services/base/logger.ts
/**
 * Environment-based logging service
 * Only logs in development mode, silent in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  context?: string;
}

class Logger {
  private isDevelopment = import.meta.env.MODE === 'development';
  private isDebugEnabled = import.meta.env.VITE_DEBUG === 'true';

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const context = entry.context ? `[${entry.context}]` : '';
    return `${timestamp} ${context} ${entry.level.toUpperCase()}: ${entry.message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment) {
      // In production, only log errors
      return level === 'error';
    }

    if (!this.isDebugEnabled && level === 'debug') {
      // Debug logs only when explicitly enabled
      return false;
    }

    return true;
  }

  private log(level: LogLevel, message: string, data?: any, context?: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      context,
    };

    const formattedMessage = this.formatMessage(entry);

    switch (level) {
      case 'debug':
        if (data) {
          console.debug(formattedMessage, data);
        } else {
          console.debug(formattedMessage);
        }
        break;
      case 'info':
        if (data) {
          console.info(formattedMessage, data);
        } else {
          console.info(formattedMessage);
        }
        break;
      case 'warn':
        if (data) {
          console.warn(formattedMessage, data);
        } else {
          console.warn(formattedMessage);
        }
        break;
      case 'error':
        if (data) {
          console.error(formattedMessage, data);
        } else {
          console.error(formattedMessage);
        }
        break;
    }
  }

  debug(message: string, data?: any, context?: string): void {
    this.log('debug', message, data, context);
  }

  info(message: string, data?: any, context?: string): void {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: any, context?: string): void {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: any, context?: string): void {
    this.log('error', message, data, context);
  }

  // Specific auth-related logging
  auth(event: string, data?: any): void {
    this.info(`Auth event: ${event}`, data, 'Auth');
  }

  // Track performance
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  // Group related logs
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing or custom instances
export { Logger, LogLevel, LogEntry };