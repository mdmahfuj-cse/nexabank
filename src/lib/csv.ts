/** CSV export. Values are raw — no currency symbols, no thousands separators. */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

function escapeCell(input: string | number): string {
  const text = String(input ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: readonly T[], columns: ReadonlyArray<CsvColumn<T>>): string {
  const head = columns.map((column) => escapeCell(column.header)).join(',');
  const body = rows
    .map((row) => columns.map((column) => escapeCell(column.value(row))).join(','))
    .join('\n');
  return `${head}\n${body}`;
}

/** Trigger a download without leaving the page. */
export function downloadText(
  filename: string,
  text: string,
  mime = 'text/plain;charset=utf-8;',
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** A byte-order mark, so Excel opens the file as UTF-8 rather than guessing. */
export function downloadCsv(filename: string, csv: string): void {
  downloadText(filename, `﻿${csv}`, 'text/csv;charset=utf-8;');
}
