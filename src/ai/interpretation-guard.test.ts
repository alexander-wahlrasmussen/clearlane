import { describe, expect, it } from 'vitest';
import {
  InvalidInterpretationError,
  assertValidInterpretation,
  interpretationProblem,
  parseInterpretedQuestion,
} from './interpretation-guard';
import type { AggregateInterpretation, Interpretation } from './ask-types';

const base: AggregateInterpretation = {
  kind: 'aggregate', metric: 'value', period: 'all', country: 'all', type: 'all',
  grouping: 'none', goods: null, originCountry: null,
};

describe('interpretation guard', () => {
  it('accepts every well-formed kind', () => {
    const ok: Interpretation[] = [
      base,
      { ...base, country: 'DE', goods: { label: 'textiles', codePattern: '^(61|42)' }, originCountry: 'CN' },
      { kind: 'compare', field: 'period', a: 'q2', b: 'f07', base },
      { kind: 'compare', field: 'country', a: 'GB', b: 'DE', base },
      { kind: 'list', list: 'gaps' },
    ];
    for (const i of ok) expect(interpretationProblem(i)).toBeNull();
  });

  it('rejects values outside the closed vocabulary — the model is untrusted', () => {
    const period = { ...base, period: 'q3' } as unknown as Interpretation;
    expect(interpretationProblem(period)).toMatch(/period "q3"/);
    const country = { ...base, country: 'FR' } as Interpretation;
    expect(interpretationProblem(country)).toMatch(/country "FR"/);
    const regex = { ...base, goods: { label: 'x', codePattern: '^(61' } } as Interpretation;
    expect(interpretationProblem(regex)).toMatch(/invalid commodity-code pattern/);
    const cmp = { kind: 'compare', field: 'period', a: 'q2', b: 'FR', base } as unknown as Interpretation;
    expect(interpretationProblem(cmp)).toMatch(/not a valid period/);
    expect(() => assertValidInterpretation(period)).toThrow(InvalidInterpretationError);
  });

  it('parses a server response and refuses malformed ones', () => {
    const parsed = parseInterpretedQuestion({
      question: 'Total duty?',
      interpretation: { ...base, metric: 'duty' },
      confidence: { low: false },
    });
    expect(parsed.confidence.message).toBe('');
    expect(() => parseInterpretedQuestion({ question: 'x' })).toThrow(InvalidInterpretationError);
    expect(() => parseInterpretedQuestion(null)).toThrow(InvalidInterpretationError);
  });
});

describe('interpretation guard — extracts and unsupported reports', () => {
  const extract: Interpretation = {
    kind: 'extract',
    name: 'Declaration Summary',
    reportId: 'declaration-summary',
    view: {
      grain: 'declaration',
      columns: ['status', 'mrn', 'customsValueTotal'],
      filter: { period: '6m', country: 'all', type: 'all', status: 'all', search: '', gapsOnly: false },
      sort: { sort: 'date', order: 'desc' },
    },
  };

  it('accepts a well-formed extract and every known unsupported report', () => {
    expect(interpretationProblem(extract)).toBeNull();
    for (const report of ['vat', 'mdr', 'mcd', 'ec-sales', 'intrastat'] as const) {
      expect(interpretationProblem({ kind: 'unsupported', report })).toBeNull();
    }
  });

  it('rejects columns the registry does not offer at that grain — never drops them silently', () => {
    const unknown = { ...extract, view: { ...extract.view, columns: ['mrn', 'profitMargin'] } } as Interpretation;
    expect(interpretationProblem(unknown)).toMatch(/unknown column "profitMargin"/);
    const wrongGrain = { ...extract, view: { ...extract.view, columns: ['mrn', 'commodityCode'] } } as Interpretation;
    expect(interpretationProblem(wrongGrain)).toMatch(/not offered at declaration grain/);
  });

  it('rejects filters outside the register’s vocabulary', () => {
    const period = { ...extract, view: { ...extract.view, filter: { ...extract.view.filter, period: '12m' } } } as unknown as Interpretation;
    expect(interpretationProblem(period)).toMatch(/date range "12m"/);
    const status = { ...extract, view: { ...extract.view, filter: { ...extract.view.filter, status: 'Lost' } } } as unknown as Interpretation;
    expect(interpretationProblem(status)).toMatch(/status "Lost"/);
    const report = { kind: 'unsupported', report: 'payroll' } as unknown as Interpretation;
    expect(interpretationProblem(report)).toMatch(/unknown report "payroll"/);
  });
});
