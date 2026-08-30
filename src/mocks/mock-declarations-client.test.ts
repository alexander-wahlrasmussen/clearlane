import { beforeAll, describe, expect, it } from 'vitest';
import { MockDeclarationsClient } from './mock-declarations-client';
import type { GoodsLineRow, ListParams } from '../api/declarations-client';

// No artificial latency — this suite makes many paginated calls.
const client = new MockDeclarationsClient({ latencyMs: 0 });
const base: Omit<ListParams, 'page'> = {
  filter: {},
  sort: 'date',
  order: 'desc',
  pageSize: 20,
};

async function allPages(params: Omit<ListParams, 'page'>): Promise<GoodsLineRow[]> {
  const rows: GoodsLineRow[] = [];
  for (let page = 1; ; page++) {
    const res = await client.listGoodsLines({ ...params, page });
    rows.push(...res.items);
    if (rows.length >= res.total || res.items.length === 0) return rows;
  }
}

describe('MockDeclarationsClient.listGoodsLines', () => {
  let declarationCount = 0;
  let lineCount = 0;

  beforeAll(async () => {
    const declarations = await client.listAllDeclarations({});
    declarationCount = declarations.length;
    lineCount = declarations.reduce((s, d) => s + d.lines.length, 0);
  });

  it('reports every goods line of the filtered declarations', async () => {
    const first = await client.listGoodsLines({ ...base, page: 1 });
    expect(first.total).toBe(lineCount);
    expect(first.total).toBeGreaterThan(declarationCount);
  });

  it('paginates without dropping or duplicating a line', async () => {
    const rows = await allPages(base);
    expect(rows.length).toBe(lineCount);
    const keys = rows.map((r) => `${r.declaration.mrn}#${r.line.lineNo}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('carries the parent declaration on every row', async () => {
    const rows = await allPages(base);
    for (const r of rows) {
      expect(r.declaration.mrn).toBeTruthy();
      expect(r.declaration.lines.some((l) => l.lineNo === r.line.lineNo)).toBe(true);
      // Line money is denominated in its declaration's currency.
      expect(r.line.customsValue.currency).toBe(r.declaration.currency);
    }
  });

  it('honours the same filter as the declaration grain', async () => {
    const filter = { type: 'import' as const, country: 'DE' };
    const declarations = await client.listAllDeclarations(filter);
    const expected = declarations.reduce((s, d) => s + d.lines.length, 0);
    const res = await client.listGoodsLines({ ...base, filter, page: 1 });
    expect(res.total).toBe(expected);
    for (const r of res.items) {
      expect(r.declaration.type).toBe('import');
      expect(r.declaration.countryCode).toBe('DE');
    }
  });

  it('sorts descending by customs value at the declared rate', async () => {
    const res = await client.listGoodsLines({
      ...base,
      sort: 'customsValue',
      order: 'desc',
      page: 1,
    });
    const eur = (r: GoodsLineRow) =>
      r.line.customsValue.amountMinor * r.declaration.declaredFxToEur;
    for (let i = 1; i < res.items.length; i++) {
      expect(eur(res.items[i - 1]!)).toBeGreaterThanOrEqual(eur(res.items[i]!));
    }
  });

  it('keeps a declaration’s lines in declared order when the sort key ties', async () => {
    const rows = await allPages({ ...base, sort: 'date', order: 'desc' });
    const byMrn = new Map<string, number[]>();
    for (const r of rows) {
      const list = byMrn.get(r.declaration.mrn) ?? [];
      list.push(r.line.lineNo);
      byMrn.set(r.declaration.mrn, list);
    }
    for (const [mrn, lineNos] of byMrn) {
      expect(lineNos, mrn).toEqual([...lineNos].sort((a, b) => a - b));
    }
  });
});

describe('MockDeclarationsClient.listAllGoodsLines', () => {
  const client = new MockDeclarationsClient({ latencyMs: 0 });

  it('returns every line of the filtered set, in the order the register shows it', async () => {
    const filter = { country: 'DE' as const };
    const all = await client.listAllGoodsLines(filter, { sort: 'duty', order: 'asc' });
    const declarations = await client.listAllDeclarations(filter);
    expect(all.length).toBe(declarations.reduce((s, d) => s + d.lines.length, 0));

    const firstPage = await client.listGoodsLines({ filter, sort: 'duty', order: 'asc', page: 1, pageSize: 20 });
    expect(all.slice(0, 20).map((r) => `${r.declaration.mrn}#${r.line.lineNo}`)).toEqual(
      firstPage.items.map((r) => `${r.declaration.mrn}#${r.line.lineNo}`),
    );
  });

  it('listAllDeclarations follows the requested sort', async () => {
    const asc = await client.listAllDeclarations({}, { sort: 'date', order: 'asc' });
    const dates = asc.map((d) => d.clearanceDate);
    expect([...dates].sort()).toEqual(dates);
  });
});

describe('MockDeclarationsClient filter by MRN set', () => {
  it('returns exactly the named declarations, combined with the other filters', async () => {
    const all = await client.listAllDeclarations({});
    const picked = all.slice(0, 5).map((d) => d.mrn);
    const rows = await client.listAllDeclarations({ mrns: picked });
    expect(rows.map((d) => d.mrn).sort()).toEqual([...picked].sort());

    const imports = await client.listAllDeclarations({ mrns: picked, type: 'import' });
    expect(imports.every((d) => d.type === 'import' && picked.includes(d.mrn))).toBe(true);

    const lines = await client.listGoodsLines({ ...base, filter: { mrns: picked }, page: 1 });
    expect(lines.total).toBe(all.slice(0, 5).reduce((s, d) => s + d.lines.length, 0));

    const summary = await client.getRegisterSummary({ mrns: picked });
    expect(summary.total).toBe(5);
  });
});
