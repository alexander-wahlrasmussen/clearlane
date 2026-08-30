import { describe, expect, it } from 'vitest';
import { composeExtract, extractFromView, registerPeriodFor } from './extract-view';
import { BUILT_IN_VIEWS } from '../features/register/views';
import { DEFAULT_COLUMNS } from '../features/register/columns';

describe('extractFromView', () => {
  it('is the report, verbatim — a report is a question with a known interpretation', () => {
    const view = BUILT_IN_VIEWS[1]!;
    const e = extractFromView(view);
    expect(e).toEqual({
      kind: 'extract',
      name: view.name,
      reportId: view.id,
      view: { grain: view.grain, columns: view.columns, filter: view.filter, sort: view.sort },
    });
  });
});

describe('composeExtract', () => {
  it('starts from the named report and applies the question’s filters', () => {
    const e = composeExtract(BUILT_IN_VIEWS[0]!, { country: 'DE', type: 'import', period: '1m' });
    expect(e.reportId).toBe('declaration-summary');
    expect(e.view.columns).toEqual(BUILT_IN_VIEWS[0]!.columns);
    expect(e.view.filter).toMatchObject({ country: 'DE', type: 'import', period: '1m', status: 'all' });
  });

  it('is the Declaration Summary when rows are asked for without naming a report', () => {
    const e = composeExtract(null, { country: 'GB' });
    expect(e.reportId).toBe('declaration-summary');
    expect(e.view.filter.country).toBe('GB');
  });

  it('is the plain goods-line register at line grain, which no built-in report describes', () => {
    const e = composeExtract(null, { grain: 'line', country: 'GB' });
    expect(e.reportId).toBeNull();
    expect(e.name).toBe('Goods lines');
    expect(e.view.grain).toBe('line');
    expect(e.view.columns).toEqual(DEFAULT_COLUMNS.line);
    expect(e.view.filter.country).toBe('GB');
  });

  it('drops a named report when the asked grain differs from it', () => {
    const e = composeExtract(BUILT_IN_VIEWS[1]!, { grain: 'declaration' });
    expect(e.reportId).toBe('declaration-summary');
    expect(e.view.grain).toBe('declaration');
  });
});

describe('registerPeriodFor', () => {
  it('maps Ask periods to the register’s ranges and says when the range is wider', () => {
    expect(registerPeriodFor('m08')).toEqual({ period: '1m', exact: true });
    expect(registerPeriodFor('f06')).toEqual({ period: '3m', exact: true });
    expect(registerPeriodFor('all')).toEqual({ period: '6m', exact: true });
    expect(registerPeriodFor('f07')).toEqual({ period: '3m', exact: false });
    expect(registerPeriodFor('q2')).toEqual({ period: '6m', exact: false });
  });
});
