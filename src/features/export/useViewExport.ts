import type { DeclarationFilter, ListSort } from '../../api/declarations-client';
import { useDeclarationsClient } from '../../api/queries';
import { useToast } from '../../app/ToastContext';
import { GRAIN_LABEL, type Grain, type RegisterColumn, type RegisterRow } from '../register/columns';
import { exportRows } from './export-service';

export interface ViewExport {
  grain: Grain;
  filter: DeclarationFilter;
  sort: ListSort;
  columns: readonly RegisterColumn[];
  filename: string;
  format: 'csv' | 'xlsx';
}

/**
 * Exports a view — the full filtered set at its grain, with the columns shown.
 * Shared by the register and by extract answers, so "the file is exactly what
 * is on screen" holds in both places. Resolves to whether a file was written;
 * on failure the user is told and nothing is downloaded.
 */
export function useViewExport(): (e: ViewExport) => Promise<boolean> {
  const client = useDeclarationsClient();
  const toast = useToast();
  return async (e) => {
    try {
      const rows: RegisterRow[] =
        e.grain === 'declaration'
          ? (await client.listAllDeclarations(e.filter, e.sort)).map((d) => ({ declaration: d, line: null }))
          : await client.listAllGoodsLines(e.filter, e.sort);
      exportRows(rows, e.columns, { format: e.format, filename: e.filename, sheetName: GRAIN_LABEL[e.grain] });
    } catch (err) {
      console.error('Export failed', err);
      toast('Export failed — no file was downloaded. Try again.');
      return false;
    }
    toast('Export ready — file downloaded');
    return true;
  };
}
