import consola from 'consola';
import { env } from '../config/env.js';

/**
 * Minimal leveled logger.
 *
 * Every line is prefixed with an ISO timestamp and the level, e.g.
 * `[2026-01-01T12:00:00.000Z] INFO  Logged in as Loki!`. Messages below `LOG_LEVEL` (from the
 * environment) are dropped. Extra arguments are handed to `console` as-is, so passing an Error
 * prints its full stack trace:
 *
 *   Logger.error('Failed to sync commands:', error);
 *
 * warn/error go to stderr, debug/info go to stdout.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;

export type LogLevel = keyof typeof LEVELS;

const WRITERS: Record<LogLevel, (...data: unknown[]) => void> = {
  debug: consola.debug,
  info: consola.info,
  warn: consola.warn,
  error: consola.error,
};

function write(level: LogLevel, message: string, details: unknown[]): void {
  if (LEVELS[level] < LEVELS[env.LOG_LEVEL]) return;

  const prefix = `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)}`;
  WRITERS[level](`${prefix} ${message}`, ...details);
}

export const Logger = {
  debug: (message: string, ...details: unknown[]) => write('debug', message, details),
  info: (message: string, ...details: unknown[]) => write('info', message, details),
  warn: (message: string, ...details: unknown[]) => write('warn', message, details),
  error: (message: string, ...details: unknown[]) => write('error', message, details),
};
