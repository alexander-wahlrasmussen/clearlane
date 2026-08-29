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
