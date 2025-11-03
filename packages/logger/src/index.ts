import { Logger } from './logger';
import type { LogLevel } from './types';

// Helper function to parse LOG_LEVEL environment variable
function getLogLevelFromEnv(): LogLevel | undefined {
  if (typeof process === 'undefined') return undefined;

  const logLevel = process.env.LOG_LEVEL;
  if (!logLevel) return undefined;

  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const normalizedLevel = logLevel.toLowerCase() as LogLevel;

  if (validLevels.includes(normalizedLevel)) {
    return normalizedLevel;
  }

  // Invalid level, ignore it
  return undefined;
}

// Create and export a default logger instance
export const defaultLogger = new Logger({
  defaultNamespace: 'seawatts-startup',
  minLogLevel: getLogLevelFromEnv(),
});

// Export a debug function that uses the default logger
export const debug = (namespace: string) => defaultLogger.debug(namespace);

// Export info, warn, and error functions that use the default logger
export const info = (namespace: string) => defaultLogger.info(namespace);
export const warn = (namespace: string) => defaultLogger.warn(namespace);
export const error = (namespace: string) => defaultLogger.error(namespace);

// Export everything else
export { Logger };
export type { LoggerProps } from './logger';

// Enable debug namespaces based on environment variable (similar to debug package)
if (typeof process !== 'undefined') {
  if (process.env.DEBUG) {
    // Split and enable each namespace from DEBUG env var
    for (const namespace of process.env.DEBUG.split(',')) {
      defaultLogger.enableNamespace(namespace.trim());
    }
  } else {
    // Default to enabling 'seawatts-startup:*' if no DEBUG env var is set
    defaultLogger.enableNamespace('seawatts-startup:*');
  }
}

export * from './logger';
export * from './types';
