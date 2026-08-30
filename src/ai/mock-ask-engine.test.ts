import { describe, expect, it } from 'vitest';
import { interpretQuestion } from './mock-ask-engine';

describe('interpretQuestion', () => {
  it('maps a duty question with country and period', () => {
    const r = interpretQuestion('How much duty did we pay in Germany since June?');
    expect(r.interpretation).toMatchObject({
      kind: 'aggregate',
      metric: 'duty',
      country: 'DE',
      period: 'f06',
    });
    expect(r.confidence.low).toBe(false);
  });

  it('recognises comparisons of the same field type', () => {
    const r = interpretQuestion('Compare imports vs exports');
    expect(r.interpretation).toMatchObject({ kind: 'compare', field: 'type', a: 'import', b: 'export' });
  });

  it('routes data-quality questions to lists', () => {
    expect(interpretQuestion('Declarations with data gaps').interpretation).toMatchObject({
      kind: 'list',
      list: 'gaps',
    });
    expect(interpretQuestion('What is awaiting release?').interpretation).toMatchObject({
      kind: 'list',
      list: 'awaiting',
    });
  });

  it('lowers confidence when words cannot be used, and says which', () => {
    const r = interpretQuestion('duty on flux capacitors');
    expect(r.confidence.low).toBe(true);
    expect(r.confidence.message).toContain('flux');
  });

  it('lowers confidence when nothing was recognised', () => {
    const r = interpretQuestion('what is it all for');
    expect(r.confidence.low).toBe(true);
  });
});

describe('interpretQuestion — reports', () => {
  it('opens a built-in report by name as an extract, with the question’s filters', () => {
    const r = interpretQuestion('Declaration line overview for Germany this month');
    expect(r.interpretation).toMatchObject({
      kind: 'extract',
      reportId: 'declaration-line-overview',
      view: { grain: 'line', filter: { country: 'DE', period: '1m' } },
    });
    expect(r.confidence.low).toBe(false);
  });

  it('treats a request for rows as an extract from the Declaration Summary', () => {
    const r = interpretQuestion('Show released import declarations in Sweden');
    expect(r.interpretation).toMatchObject({
      kind: 'extract',
      reportId: 'declaration-summary',
      view: { grain: 'declaration', filter: { country: 'SE', type: 'import', status: 'Released' } },
    });
  });

  it('says so when the register’s date ranges are wider than the period asked for', () => {
    const r = interpretQuestion('Declaration summary for Q2');
    expect(r.interpretation).toMatchObject({ kind: 'extract', view: { filter: { period: '6m' } } });
    expect(r.confidence.low).toBe(true);
    expect(r.confidence.message).toMatch(/date ranges/);
  });

  it('keeps data-quality lists as lists even when phrased as a request for rows', () => {
    expect(interpretQuestion('List declarations with data gaps').interpretation).toMatchObject({
      kind: 'list',
      list: 'gaps',
    });
  });

  it('answers a request for a report the data cannot produce with the reason, not an approximation', () => {
    expect(interpretQuestion('VAT report for Q2').interpretation).toEqual({ kind: 'unsupported', report: 'vat' });
    expect(interpretQuestion('Can I get the Intrastat return?').interpretation).toEqual({ kind: 'unsupported', report: 'intrastat' });
    expect(interpretQuestion('EC sales list for July').interpretation).toEqual({ kind: 'unsupported', report: 'ec-sales' });
    expect(interpretQuestion('manifest discrepancy report').interpretation).toEqual({ kind: 'unsupported', report: 'mdr' });
    expect(interpretQuestion('MCD report').interpretation).toEqual({ kind: 'unsupported', report: 'mcd' });
  });

  it('does not mistake a VAT figure for a VAT report', () => {
    expect(interpretQuestion('Monthly VAT trend for imports').interpretation).toMatchObject({ kind: 'aggregate', metric: 'vat' });
  });
});
