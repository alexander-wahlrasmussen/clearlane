import { describe, expect, it } from 'vitest';
import { buildExportRows, EXPORT_HEADER } from './export-rows';
import { testDeclarations } from '../../test/factories';

describe('buildExportRows', () => {
  const decls = testDeclarations().slice(0, 5);

  it('declaration totals appear only on declaration rows — never double-counted', () => {
    const rows = buildExportRows(decls, true);
    const customsValueCol = EXPORT_HEADER.indexOf('Customs value');
    const lineRows = rows.filter((r) => r[0] === 'Goods line');
    expect(lineRows.length).toBeGreaterThan(0);
    for (const r of lineRows) expect(r[customsValueCol]).toBe('');
    const declRows = rows.filter((r) => r[0] === 'Declaration');
    const summed = declRows.reduce((s, r) => s + Number(r[customsValueCol]), 0);
    const expected = decls.reduce((s, d) => s + Math.round(d.customsValueTotal.amountMinor / 100), 0);
    expect(summed).toBe(expected);
  });

  it('without goods lines the file has exactly one row per declaration', () => {
    const rows = buildExportRows(decls, false);
    expect(rows.length).toBe(1 + decls.length);
  });

  it('every row is exactly as wide as the header', () => {
    for (const r of buildExportRows(decls, true)) expect(r.length).toBe(EXPORT_HEADER.length);
  });

  it('departure and goods-line origin never share a column', () => {
    const departure = EXPORT_HEADER.indexOf('Departure');
    const origin = EXPORT_HEADER.indexOf('Origin');
    expect(departure).toBeGreaterThan(-1);
    expect(origin).toBeGreaterThan(-1);
    expect(departure).not.toBe(origin);
    for (const r of buildExportRows(decls, true)) {
      if (r[0] === 'Declaration') expect(r[origin]).toBe('');
      if (r[0] === 'Goods line') expect(r[departure]).toBe('');
    }
  });

  it('currency is stated on every row', () => {
    const cur = EXPORT_HEADER.indexOf('Currency');
    for (const r of buildExportRows(decls, true).slice(1)) {
      expect(String(r[cur])).toMatch(/^[A-Z]{3}$/);
    }
  });
});
