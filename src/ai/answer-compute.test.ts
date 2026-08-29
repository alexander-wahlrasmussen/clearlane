import { describe, expect, it } from 'vitest';
import { computeAggregate, computeCompare, computeList } from './answer-compute';
import type { AggregateInterpretation } from './ask-types';
import { eurEquivalentMinor } from '../domain/money';
import { hasDataGap } from '../domain/declaration';
import { testDeclarations } from '../test/factories';

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

  it('an empty scope yields count 0, never an invented number', () => {
    const r = computeAggregate({ ...base, country: 'GB', type: 'transit', period: 'm03' }, []);
    expect(r.count).toBe(0);
    expect(r.evidenceMrns).toEqual([]);
  });
});
