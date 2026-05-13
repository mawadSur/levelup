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

@Injectable()
export class AppLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    if (!isEnabled('log')) return;
    emit(buildEntry('info', message, context));
  }

  error(message: unknown, trace?: string, context?: string): void {
    if (!isEnabled('error')) return;
    emit(buildEntry('error', message, context, trace));
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
