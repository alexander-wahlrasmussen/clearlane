import { describe, expect, it } from 'vitest';
import {
  FIELD_STATE_LABEL,
  fv,
  isValue,
  mapValue,
  NOT_POPULATED,
  valueOr,
} from './field-value';

describe('FieldValue', () => {
  it('wraps real values', () => {
    const f = fv(42);
    expect(isValue(f)).toBe(true);
    expect(valueOr(f, 0)).toBe(42);
  });

  it('keeps the four states distinct from values', () => {
    expect(isValue(NOT_POPULATED)).toBe(false);
    expect(valueOr(NOT_POPULATED, 'fallback')).toBe('fallback');
  });

  it('mapValue transforms only real values', () => {
    expect(mapValue(fv(2), (n) => n * 10)).toEqual(fv(20));
    expect(mapValue(NOT_POPULATED, (n: number) => n * 10)).toBe(NOT_POPULATED);
  });

  it('labels are plain British English, never internal codes', () => {
    expect(Object.values(FIELD_STATE_LABEL)).toEqual([
      'Not applicable',
      'Not available',
      'Not populated',
      'Not verified',
    ]);
  });
});
