/**
 * JSON-line logger for the worker process.
 *
 * Each line is a JSON object with:
 *   level     - "debug" | "info" | "warn" | "error"
 *   timestamp - ISO 8601 string
 *   jobId     - current job ID (optional, set via withJobId)
 *   message   - log message
 *   ...rest   - any additional metadata fields
 *
 * Usage:
 *   logger.info('job started', { jobId: job.id, queue: 'cert-pdf' });
 *   const jobLogger = logger.withJobId(job.id);
 *   jobLogger.debug('processing', { step: 'load-cert' });
 */

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

function activeLevel(): LogLevel {
  const raw = (process.env['LOG_LEVEL'] ?? 'info').toLowerCase();
  return LOG_LEVELS.includes(raw as LogLevel) ? (raw as LogLevel) : 'info';
}

function isEnabled(level: LogLevel): boolean {
  const order: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
  return order[level] >= order[activeLevel()];
}

type Meta = Record<string, unknown>;

interface LogEntry extends Meta {
  level: LogLevel;
  timestamp: string;
  message: string;
  jobId?: string;
}

function emit(entry: LogEntry): void {
  process.stdout.write(JSON.stringify(entry) + '\n');
}

function log(level: LogLevel, message: string, jobId?: string, meta?: Meta): void {
  if (!isEnabled(level)) return;
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    ...meta,
  };
  if (jobId !== undefined) {
    entry['jobId'] = jobId;
  }
  emit(entry);
}

export interface Logger {
  debug(message: string, meta?: Meta): void;
  info(message: string, meta?: Meta): void;
  warn(message: string, meta?: Meta): void;
  error(message: string, meta?: Meta): void;
  /** Returns a child logger that always attaches the given jobId. */
  withJobId(jobId: string): Logger;
}

function makeLogger(jobId?: string): Logger {
  return {
    debug: (message, meta) => log('debug', message, jobId, meta),
    info: (message, meta) => log('info', message, jobId, meta),
    warn: (message, meta) => log('warn', message, jobId, meta),
    error: (message, meta) => log('error', message, jobId, meta),
    withJobId: (id: string) => makeLogger(id),
  };
}

/** Root logger — use directly or call `.withJobId(job.id)` inside a handler. */
export const logger: Logger = makeLogger();
