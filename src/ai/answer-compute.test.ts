import { describe, expect, it } from 'vitest';
import { computeAggregate, computeCompare, computeList } from './answer-compute';
import type { AggregateInterpretation } from './ask-types';
import { eurEquivalentMinor } from '../domain/money';
import { hasDataGap, type Declaration } from '../domain/declaration';
import { testDeclarations } from '../test/factories';

const COMMODITY_GROUPS = 25;

/** The mock dataset carries ten commodities; widen it past the breakdown cap. */
function manyCommodities(): Declaration[] {
  return testDeclarations().map((d, di) => ({
    ...d,
    lines: d.lines.map((l, li) => ({
      ...l,
      description: `Commodity ${String(((di * 7 + li) % COMMODITY_GROUPS) + 1).padStart(2, '0')}`,
    })),
  }));
}

const AS_OF = '2026-08-26';

const base: AggregateInterpretation = {
  kind: 'aggregate',
  metric: 'duty',
  period: 'all',
  country: 'all',
  type: 'all',
  grouping: 'none',
  goods: null,
  originCountry: null,
};

describe('answer-compute', () => {
  it('aggregate total equals the manual EUR-equivalent sum over its own evidence', () => {
    const decls = testDeclarations();
    const answer = computeAggregate(base, decls);
    const manual = decls
      .filter((d) => answer.evidenceMrns.includes(d.mrn))
      .reduce(
        (s, d) => s + d.lines.reduce((t, l) => t + eurEquivalentMinor(l.dutyAmount, d.declaredFxToEur), 0),
        0,
      );
    expect(answer.headline).toContain('EUR');
    expect(answer.count).toBe(answer.evidenceMrns.length);
    // The headline is formatted from exactly this figure.
    expect(answer.headline).toBe(`EUR ${Math.round(manual / 100).toLocaleString('en-GB')}`);
  });

  it('every answer carries a complete evidence list (principle #6)', () => {
    const decls = testDeclarations();
    const gaps = computeList({ kind: 'list', list: 'gaps' }, decls, AS_OF);
    expect(gaps.evidenceMrns.sort()).toEqual(decls.filter(hasDataGap).map((d) => d.mrn).sort());
  });

  it('compare sides are computed independently and share a scale', () => {
    const decls = testDeclarations();
    const r = computeCompare(
      { kind: 'compare', field: 'type', a: 'import', b: 'export', base: { ...base, metric: 'value' } },
      decls,
    );
    expect(Math.max(r.a.widthPct, r.b.widthPct)).toBe(100);
    expect(r.evidenceMrns.length).toBe(r.count);
  });

  it('a capped breakdown states its denominator instead of quietly dropping the tail', () => {
    const answer = computeAggregate({ ...base, metric: 'value', grouping: 'commodity' }, manyCommodities());
    expect(answer.rows).toHaveLength(10);
    // The headline covers every group, so the rows alone do not add up to it —
    // the note is what keeps the two reconciled (principles #3 and #4).
    const shownShare = answer.rows.reduce((s, r) => s + Number(r.shareLabel.replace(/[^\d]/g, '')), 0);
    expect(shownShare).toBeLessThan(100);
    expect(answer.rowsNote).toContain(`of ${COMMODITY_GROUPS} commodities`);
    expect(answer.rowsNote).toContain(`The remaining ${COMMODITY_GROUPS - 10}`);
    expect(answer.rowsNote).toContain('included in the total above');
  });

  it('a breakdown that shows every group carries no note', () => {
    const answer = computeAggregate({ ...base, metric: 'value', grouping: 'country' }, testDeclarations());
    expect(answer.rows.length).toBeLessThanOrEqual(10);
    expect(answer.rowsNote).toBeNull();
  });

  it('a row with a real value never gets a zero-width bar', () => {
    const answer = computeAggregate({ ...base, metric: 'value', grouping: 'commodity' }, manyCommodities());
    const drawn = answer.rows.filter((r) => !r.valueLabel.endsWith(' 0'));
    expect(drawn.length).toBeGreaterThan(0);
    for (const r of drawn) expect(r.widthPct).toBeGreaterThan(0);
  });

  it('an empty scope yields count 0, never an invented number', () => {
    const r = computeAggregate({ ...base, country: 'GB', type: 'transit', period: 'm03' }, []);
    expect(r.count).toBe(0);
    expect(r.evidenceMrns).toEqual([]);
  });
});
