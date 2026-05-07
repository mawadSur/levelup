/**
 * CSV generation utilities for LevelUp AI Academy reports.
 *
 * Design decisions:
 * - UTF-8 BOM (0xEF 0xBB 0xBF) is prepended so Excel opens the file without
 *   needing the import wizard and correctly decodes accented characters.
 * - Line endings are CRLF (\r\n) per the RFC 4180 spec; Excel on Windows
 *   expects this.
 * - Values containing commas, double-quotes or newlines are wrapped in
 *   double-quotes, and any embedded double-quote is escaped as two consecutive
 *   double-quotes ("").
 *
 * This is a per-process utility — it does NOT depend on any NestJS DI context.
 */

const UTF8_BOM = '﻿';

/**
 * Escape a single CSV field value.
 * Returns the field wrapped in double-quotes if it contains a comma, double-
 * quote, or newline; otherwise returns the raw string.
 */
export function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Needs quoting if it contains comma, double-quote, newline, or carriage-return
  if (/[,"\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a complete CSV string from a header row and data rows.
 * Prepends UTF-8 BOM and uses CRLF line endings.
 *
 * @param headers  Column header labels (must not contain PII).
 * @param rows     Array of row arrays, one value per column.  Values are
 *                 automatically escaped.
 */
export function buildCsv(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
): string {
  const lines: string[] = [];

  lines.push(headers.map(escapeCsvField).join(','));

  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(','));
  }

  // CRLF between lines; also terminate the last line with CRLF
  return UTF8_BOM + lines.join('\r\n') + '\r\n';
}
