import { LoggerService, LogLevel } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

type LogEntry = {
  level: string;
  timestamp: string;
  context?: string;
  message: string;
  trace?: string;
  [key: string]: unknown;
};

const LOG_LEVEL_ORDER: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];

function activeLevel(): LogLevel {
  const raw = process.env['LOG_LEVEL'] ?? 'log';
  const level = raw as LogLevel;
  return LOG_LEVEL_ORDER.includes(level) ? level : 'log';
}

function isEnabled(level: LogLevel): boolean {
  const active = activeLevel();
  return LOG_LEVEL_ORDER.indexOf(level) >= LOG_LEVEL_ORDER.indexOf(active);
}

function emit(entry: LogEntry): void {
  process.stdout.write(JSON.stringify(entry) + '\n');
}

function buildEntry(level: string, message: unknown, context?: string, trace?: string): LogEntry {
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    message: typeof message === 'string' ? message : JSON.stringify(message),
  };
  if (context) entry['context'] = context;
  if (trace) entry['trace'] = trace;
  return entry;
}

// ---------------------------------------------------------------------------
// In-memory error ring buffer (debug-only)
// ---------------------------------------------------------------------------
//
// Render captures stdout to its own log store but we don't have programmatic
// access to it from this process. To unblock debugging "An unexpected error
// occurred (request <id>)" tickets where the user can't share a full stack
// trace, we keep the last N error log entries here and expose them via the
// admin-gated GET /api/admin-ops/recent-errors endpoint.
//
// Memory cap: BUFFER_SIZE × ~2KB per entry = ~100KB max. Safe even on the
// smallest Render plan. We push only entries already destined for stdout, so
// this does NOT change what gets logged — it just retains a peek-able copy.

export interface CapturedErrorEntry {
  timestamp: string;
  message: string;
  context?: string;
  trace?: string;
}

const BUFFER_SIZE = 50;
const _errorBuffer: CapturedErrorEntry[] = [];

function pushError(entry: CapturedErrorEntry): void {
  _errorBuffer.push(entry);
  if (_errorBuffer.length > BUFFER_SIZE) {
    _errorBuffer.shift();
  }
}

/**
 * Snapshot of the in-memory error buffer. Newest-first ordering so the most
 * recent failure is at index 0. Returns an array copy so callers cannot
 * mutate the live buffer.
 */
export function getRecentErrors(): CapturedErrorEntry[] {
  return [..._errorBuffer].reverse();
}

@Injectable()
export class AppLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    if (!isEnabled('log')) return;
    emit(buildEntry('info', message, context));
  }

  error(message: unknown, trace?: string, context?: string): void {
    if (!isEnabled('error')) return;
    const entry = buildEntry('error', message, context, trace);
    emit(entry);
    // Retain a copy for /api/admin-ops/recent-errors. Casting through the
    // captured shape so this stays type-safe even if buildEntry adds keys.
    pushError({
      timestamp: entry.timestamp,
      message: entry.message,
      ...(typeof entry['context'] === 'string' ? { context: entry['context'] } : {}),
      ...(typeof entry['trace'] === 'string' ? { trace: entry['trace'] } : {}),
    });
  }

  warn(message: unknown, context?: string): void {
    if (!isEnabled('warn')) return;
    emit(buildEntry('warn', message, context));
  }

  debug(message: unknown, context?: string): void {
    if (!isEnabled('debug')) return;
    emit(buildEntry('debug', message, context));
  }

  verbose(message: unknown, context?: string): void {
    if (!isEnabled('verbose')) return;
    emit(buildEntry('verbose', message, context));
  }

  fatal(message: unknown, context?: string): void {
    if (!isEnabled('fatal')) return;
    emit(buildEntry('fatal', message, context));
  }
}
