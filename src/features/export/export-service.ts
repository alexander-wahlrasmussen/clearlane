import * as XLSX from 'xlsx';
import type { Declaration } from '../../domain/declaration';
import { buildExportRows, type ExportRow } from './export-rows';

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeLines: boolean;
  filename: string;
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

export function exportDeclarations(declarations: Declaration[], opts: ExportOptions): void {
  const rows = buildExportRows(declarations, opts.includeLines);
  if (opts.format === 'csv') {
    download(new Blob([toCsv(rows)], { type: 'text/csv' }), `${opts.filename}.csv`);
    return;
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Declarations');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  download(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${opts.filename}.xlsx`,
  );
}
