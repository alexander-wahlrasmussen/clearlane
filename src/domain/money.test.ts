import { describe, expect, it } from 'vitest';
import {
  CurrencyMismatchError,
  eurEquivalentMinor,
  formatEurCompact,
  formatMoney,
  money,
  sumMoney,
} from './money';

describe('Money', () => {
  it('refuses non-integer minor units', () => {
    expect(() => money(10.5, 'EUR')).toThrow();
  });

  it('never sums unlike currencies', () => {
    expect(() => sumMoney([money(100, 'EUR'), money(100, 'GBP')], 'EUR')).toThrow(
      CurrencyMismatchError,
    );
  });

  it('sums like currencies exactly', () => {
    expect(sumMoney([money(150, 'SEK'), money(250, 'SEK')], 'SEK')).toEqual(money(400, 'SEK'));
  });

  it('EUR equivalent uses only the declared rate', () => {
    expect(eurEquivalentMinor(money(100_00, 'GBP'), 1.17)).toBe(117_00);
  });

  it('formats with explicit currency, whole units', () => {
    expect(formatMoney(money(1_234_567_00, 'GBP'))).toBe('GBP 1,234,567');
    expect(formatEurCompact(3_200_000_00)).toBe('EUR 3.2M');
    expect(formatEurCompact(412_000_00)).toBe('EUR 412k');
  });
});
