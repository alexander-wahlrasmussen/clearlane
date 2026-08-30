import * as XLSX from 'xlsx';
import type { RegisterColumn, RegisterRow } from '../register/columns';
import { buildExportRows, type ExportRow } from './export-rows';

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  filename: string;
  /** Worksheet name for XLSX — "Declarations" or "Goods lines". */
  sheetName: string;
}

function toCsv(rows: ExportRow[]): string {
  return rows
    .map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function download(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Writes the given rows with the given (visible) columns — see export-rows.ts. */
export function exportRows(
  rows: readonly RegisterRow[],
  columns: readonly RegisterColumn[],
  opts: ExportOptions,
): void {
  const data = buildExportRows(rows, columns);
  if (opts.format === 'csv') {
    download(new Blob([toCsv(data)], { type: 'text/csv' }), `${opts.filename}.csv`);
    return;
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  download(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${opts.filename}.xlsx`,
  );
}

/** "Declaration Line Overview" → "declaration-line-overview", for filenames. */
export function fileSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'export';
}
