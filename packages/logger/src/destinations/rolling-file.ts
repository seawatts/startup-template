import { appendFile, mkdir, rename, unlink } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import type { LogDestination, LogMessage } from '../types';
import { formatLogArgs } from '../utils';

export interface RollingFileDestinationProps {
  /**
   * Base filepath for the log file
   * Example: ./logs/app.log
   */
  filepath: string;

  /**
   * Maximum size of each log file in bytes before rolling
   * Default: 10MB
   */
  maxSize?: number;

  /**
   * Maximum number of backup files to keep
   * Default: 5
   */
  maxFiles?: number;

  /**
   * Interval in milliseconds to force rotation regardless of size
   * Default: 24 hours
   */
  rotationInterval?: number;

  /**
   * Whether to create the directory if it doesn't exist
   * Default: true
   */
  createDirectory?: boolean;
}

export class RollingFileDestination implements LogDestination {
  private filepath: string;
  private maxSize: number;
  private maxFiles: number;
  private rotationInterval: number;
  private currentSize = 0;
  private lastRotation: number = Date.now();
  private rotationTimeout: Timer | null = null;

  constructor(props: RollingFileDestinationProps) {
    this.filepath = props.filepath;
    this.maxSize = props.maxSize ?? 10 * 1024 * 1024; // 10MB default
    this.maxFiles = props.maxFiles ?? 5;
    this.rotationInterval = props.rotationInterval ?? 1 * 60 * 60 * 1000; // 1 hour default

    if (props.createDirectory !== false) {
      mkdir(dirname(this.filepath), { recursive: true }).catch((error) => {
        console.error('Failed to create directory:', error);
      });
    }

    // Schedule time-based rotation
    if (this.rotationInterval > 0) {
      this.scheduleRotation();
    }
  }

  private scheduleRotation() {
    if (this.rotationTimeout) {
      clearTimeout(this.rotationTimeout);
    }

    const now = Date.now();
    const nextRotation = this.lastRotation + this.rotationInterval;
    const delay = Math.max(0, nextRotation - now);

    this.rotationTimeout = setTimeout(() => {
      this.rotate().catch((error) => {
        console.error('Failed to rotate log file:', error);
      });
      this.scheduleRotation();
    }, delay);
  }

  private async rotate(): Promise<void> {
    // Create a timestamped backup of the current log file
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const backupPath = this.getBackupPath(timestamp);

    try {
      const sourceFile = Bun.file(this.filepath);
      if (await sourceFile.exists()) {
        await rename(this.filepath, backupPath);
      }
    } catch (error) {
      console.error(
        `Failed to rotate log file from ${this.filepath} to ${backupPath}:`,
        error,
      );
    }

    // Clean up old log files if we exceed maxFiles
    await this.cleanupOldLogs();

    this.currentSize = 0;
    this.lastRotation = Date.now();
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const dir = dirname(this.filepath);
      const ext = extname(this.filepath);
      const base = basename(this.filepath, ext);

      // Get all log files matching the pattern
      const dirHandle = await Bun.file(dir).exists();
      if (!dirHandle) return;

      // Read directory and filter for backup log files
      const files: string[] = [];
      for await (const entry of new Bun.Glob(`${base}.*${ext}`).scan(dir)) {
        if (entry !== basename(this.filepath)) {
          files.push(join(dir, entry));
        }
      }

      // Sort by modification time (oldest first)
      const filesWithStats = await Promise.all(
        files.map(async (file) => {
          const stat = await Bun.file(file).stat();
          return { file, mtime: stat.mtime };
        }),
      );

      filesWithStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      // Delete oldest files if we exceed maxFiles
      const filesToDelete = filesWithStats.slice(
        0,
        Math.max(0, filesWithStats.length - this.maxFiles + 1),
      );
      for (const { file } of filesToDelete) {
        try {
          await unlink(file);
        } catch (error) {
          console.error(`Failed to delete old log file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  private getBackupPath(timestamp: string): string {
    const dir = dirname(this.filepath);
    const ext = extname(this.filepath);
    const base = basename(this.filepath, ext);
    return join(dir, `${base}.${timestamp}${ext}`);
  }

  private async checkRotation(messageSize: number): Promise<void> {
    if (this.currentSize + messageSize > this.maxSize) {
      await this.rotate();
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await mkdir(dirname(this.filepath), { recursive: true });
    } catch (error) {
      console.error('Failed to create directory:', error);
      throw error;
    }
  }

  async write(message: LogMessage): Promise<void> {
    const { level, namespace, args, timestamp } = message;
    const formattedArgs = formatLogArgs(args);
    const formattedMessage = `[${timestamp.toISOString()}] [${level.toUpperCase()}] ${namespace}: ${formattedArgs}\n`;
    const messageSize = new TextEncoder().encode(formattedMessage).length;

    try {
      await this.checkRotation(messageSize);
      await appendFile(this.filepath, formattedMessage);
      this.currentSize += messageSize;
    } catch (error) {
      // If the error is ENOENT (file or directory doesn't exist), try to recreate the directory and retry
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        try {
          await this.ensureDirectoryExists();
          await appendFile(this.filepath, formattedMessage);
          this.currentSize += messageSize;
          return;
        } catch (retryError) {
          console.error('Failed to recover and write to log file:', retryError);
          throw retryError;
        }
      }

      console.error('Failed to write to log file:', error);
      throw error;
    }
  }
}
