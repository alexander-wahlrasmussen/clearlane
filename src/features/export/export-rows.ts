import { registerColumn, type ExportCell, type RegisterColumn, type RegisterRow } from '../register/columns';

/**
 * Export row building. The file is the register as shown: the same grain, the
 * same columns in the same order, every row of the filtered set.
 *
 * Two things the column registry guarantees make this safe to sum:
 *  - Declaration totals (customs value, duty, VAT summed from the lines) are only
 *    offered at declaration grain, so a goods-line file never repeats a header
 *    total on every line and a declaration file never lists its lines.
 *  - The four field states export as their labels — "Not populated", never a
 *    blank or a zero (principle #1).
 *
 * Amounts are whole units in the declared currency (principle #2), so Currency
 * is written whenever an amount is, even if the user did not choose it.
 */
export type ExportRow = ExportCell[];

/** The columns actually written: the visible set, plus Currency beside any amount. */
export function exportColumns(visible: readonly RegisterColumn[]): RegisterColumn[] {
  const needsCurrency = visible.some((c) => c.amount) && !visible.some((c) => c.id === 'currency');
  if (!needsCurrency) return [...visible];
  const currency = registerColumn('currency');
  if (!currency) throw new Error('The column registry has no currency column');
  return [...visible, currency];
}

export function buildExportRows(
  rows: readonly RegisterRow[],
  visible: readonly RegisterColumn[],
): ExportRow[] {
  const columns = exportColumns(visible);
  return [columns.map((c) => c.label), ...rows.map((r) => columns.map((c) => c.exportValue(r)))];
}
