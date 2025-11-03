import { originalConsole } from '../logger';
import type { LogDestination, LogLevel, LogMessage } from '../types';
import { formatLogArgs } from '../utils';

const isDevelopment =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

const RESET = '\x1b[0m';

/**
 * Get ANSI color code for log level
 */
function getLevelColor(level: LogLevel): string {
  if (!isDevelopment) return '';

  const colors: Record<LogLevel, string> = {
    debug: '\x1b[90m', // gray/dark gray
    error: '\x1b[31m', // red
    info: '\x1b[36m', // cyan
    warn: '\x1b[33m', // yellow
  };

  return colors[level] || '';
}

/**
 * Get a formatted log level string
 */
function formatLevel(level: LogLevel): string {
  return level.toUpperCase().padEnd(5);
}

export class ConsoleDestination implements LogDestination {
  write(message: LogMessage): void {
    const { level, namespace, args, timestamp } = message;
    const formattedArgs = formatLogArgs(args);
    const formattedLevel = formatLevel(level);
    const baseMessage = `[${timestamp.toISOString()}] ${formattedLevel} ${namespace}: ${formattedArgs}`;

    // Color the entire line in development
    const color = getLevelColor(level);
    const formattedMessage = color
      ? `${color}${baseMessage}${RESET}`
      : baseMessage;

    originalConsole[level](formattedMessage);
  }
}
