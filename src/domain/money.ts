/**
 * Money is integer minor units + a currency — never floats for duty/VAT.
 * Non-negotiable principle #2: never sum unlike currencies. `sumMoney` throws
 * on a currency mismatch rather than producing a wrong number.
 */
export interface Money {
  /** Integer, minor units (cents/pence/öre). */
  amountMinor: number;
  currency: string;
}

export class CurrencyMismatchError extends Error {
  constructor(a: string, b: string) {
    super(`Refusing to add ${a} to ${b} — unlike currencies are never summed`);
    this.name = 'CurrencyMismatchError';
  }
}

export const money = (amountMinor: number, currency: string): Money => {
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`Money must be integer minor units, got ${amountMinor}`);
  }
  return { amountMinor, currency };
};

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function sumMoney(items: Money[], currency: string): Money {
  return items.reduce((acc, m) => addMoney(acc, m), money(0, currency));
}

export function moneyEquals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amountMinor === b.amountMinor;
}

/**
 * EUR equivalent using ONLY the conversion rate declared on that declaration —
 * never a live FX feed (principle #2). Returns integer minor units.
 */
export function eurEquivalentMinor(m: Money, declaredFxToEur: number): number {
  return Math.round(m.amountMinor * declaredFxToEur);
}

const gb = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

/** "GBP 12,345" — whole units, declared currency shown explicitly. */
export function formatMoney(m: Money): string {
  return `${m.currency} ${gb.format(Math.round(m.amountMinor / 100))}`;
}

export function formatEurMinor(amountMinor: number): string {
  return `EUR ${gb.format(Math.round(amountMinor / 100))}`;
}

/** "EUR 3.2M" / "EUR 412k" for summary cards. */
export function formatEurCompact(amountMinor: number): string {
  const units = amountMinor / 100;
  if (units >= 1e6) return `EUR ${(units / 1e6).toFixed(1)}M`;
  return `EUR ${gb.format(Math.round(units / 1e3))}k`;
}

export function formatCount(n: number): string {
  return gb.format(n);
}
