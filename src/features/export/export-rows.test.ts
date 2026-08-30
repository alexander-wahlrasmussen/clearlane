import { describe, expect, it } from 'vitest';
import { buildExportRows, exportColumns } from './export-rows';
import {
  columnsForGrain,
  DEFAULT_COLUMNS,
  REGISTER_COLUMNS,
  resolveColumns,
  type RegisterRow,
} from '../register/columns';
import { FIELD_STATE_LABEL } from '../../domain/field-value';
import { testDeclarations } from '../../test/factories';

const decls = testDeclarations().slice(0, 12);
const declRows: RegisterRow[] = decls.map((d) => ({ declaration: d, line: null }));
const lineRows: RegisterRow[] = decls.flatMap((d) => d.lines.map((line) => ({ declaration: d, line })));
const STATE_LABELS = new Set(Object.values(FIELD_STATE_LABEL));

describe('buildExportRows', () => {
  it('writes the visible columns, in order, under their catalogue labels', () => {
    const visible = resolveColumns(['mrn', 'status', 'country']);
    const rows = buildExportRows(declRows, visible);
    expect(rows[0]).toEqual(['MRN', 'Status', 'Declaration country']);
    expect(rows[1]).toEqual([decls[0]!.mrn, decls[0]!.status, decls[0]!.countryName]);
    expect(rows.length).toBe(1 + decls.length);
  });

  it('adds Currency beside an amount when the user has not chosen it — and only then', () => {
    const withAmount = exportColumns(resolveColumns(['mrn', 'customsValueTotal']));
    expect(withAmount.map((c) => c.id)).toEqual(['mrn', 'customsValueTotal', 'currency']);

    const chosen = exportColumns(resolveColumns(['mrn', 'currency', 'customsValueTotal']));
    expect(chosen.map((c) => c.id)).toEqual(['mrn', 'currency', 'customsValueTotal']);

    const noAmount = exportColumns(resolveColumns(['mrn', 'status']));
    expect(noAmount.map((c) => c.id)).toEqual(['mrn', 'status']);
  });

  it('every row is exactly as wide as the header, at both grains', () => {
    for (const grain of ['declaration', 'line'] as const) {
      const rows = grain === 'declaration' ? declRows : lineRows;
      const out = buildExportRows(rows, columnsForGrain(grain));
      const width = out[0]!.length;
      for (const r of out) expect(r.length).toBe(width);
    }
  });

  it('never writes a blank: every offered column exports a value or a field-state label', () => {
    for (const grain of ['declaration', 'line'] as const) {
      const rows = grain === 'declaration' ? declRows : lineRows;
      for (const c of columnsForGrain(grain)) {
        for (const r of rows) {
          const v = c.exportValue(r);
          expect(v, `${c.id} at ${grain} grain`).not.toBe('');
          expect(v, `${c.id} at ${grain} grain`).not.toBeNull();
        }
      }
    }
  });

  it('field states export as their labels, not as zeros', () => {
    const excise = REGISTER_COLUMNS.find((c) => c.id === 'excise')!;
    const quota = REGISTER_COLUMNS.find((c) => c.id === 'quota')!;
    const netMass = REGISTER_COLUMNS.find((c) => c.id === 'netMass')!;
    const allLines = testDeclarations().flatMap((d) => d.lines.map((line) => ({ declaration: d, line })));
    const notApplicable = allLines.find((r) => r.line.quotaReference.kind === 'not-applicable');
    const notAvailable = allLines.find((r) => r.line.excise.kind === 'not-available');
    const notPopulated = allLines.find((r) => r.line.netKg.kind === 'not-populated');
    expect(notApplicable, 'dataset has a not-applicable quota').toBeDefined();
    expect(notAvailable, 'dataset has a not-available excise').toBeDefined();
    expect(notPopulated, 'dataset has a not-populated net mass').toBeDefined();
    expect(quota.exportValue(notApplicable!)).toBe('Not applicable');
    expect(excise.exportValue(notAvailable!)).toBe('Not available');
    expect(netMass.exportValue(notPopulated!)).toBe('Not populated');
    // And a real value is a number, so a spreadsheet can sum the column.
    const populated = allLines.find((r) => r.line.netKg.kind === 'value')!;
    expect(typeof netMass.exportValue(populated)).toBe('number');
    for (const r of allLines.slice(0, 50)) {
      const v = excise.exportValue(r);
      expect(typeof v === 'number' || STATE_LABELS.has(String(v))).toBe(true);
    }
  });

  it('declaration totals are never offered at goods-line grain, so a line file cannot double-count', () => {
    const lineIds = new Set(columnsForGrain('line').map((c) => c.id));
    for (const id of ['customsValueTotal', 'dutyTotal', 'vatTotal', 'invoiceTotal']) {
      expect(lineIds.has(id), id).toBe(false);
    }
    // The line-level customs value column sums back to the declaration total.
    const d = decls[0]!;
    const rows = buildExportRows(
      d.lines.map((line) => ({ declaration: d, line })),
      resolveColumns(['lineCustomsValue']),
    );
    const summed = rows.slice(1).reduce((s, r) => s + Number(r[0]), 0);
    expect(summed).toBe(Math.round(d.customsValueTotal.amountMinor / 100));
  });

  it('dates export as ISO and a missing release date as "Not yet released"', () => {
    const released = declRows.find((r) => r.declaration.releaseDate)!;
    const unreleased = declRows.find((r) => !r.declaration.releaseDate);
    const col = REGISTER_COLUMNS.find((c) => c.id === 'releaseDate')!;
    expect(col.exportValue(released)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if (unreleased) expect(col.exportValue(unreleased)).toBe('Not yet released');
  });

  it('currency is stated on every row of the default column sets', () => {
    for (const grain of ['declaration', 'line'] as const) {
      const rows = grain === 'declaration' ? declRows : lineRows;
      const out = buildExportRows(rows, resolveColumns(DEFAULT_COLUMNS[grain]));
      const cur = out[0]!.indexOf('Invoice currency');
      expect(cur).toBeGreaterThan(-1);
      for (const r of out.slice(1)) expect(String(r[cur])).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('column labels are unique within a grain', () => {
    for (const grain of ['declaration', 'line'] as const) {
      const labels = columnsForGrain(grain).map((c) => c.label);
      expect(new Set(labels).size, labels.join(', ')).toBe(labels.length);
    }
  });
});
