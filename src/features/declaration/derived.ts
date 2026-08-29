import type { Declaration } from '../../domain/declaration';
import type { Money } from '../../domain/money';
import { isValue } from '../../domain/field-value';

/** Whole units, no currency prefix — for tables whose header states the currency. */
export function units(m: Money): string {
  return Math.round(m.amountMinor / 100).toLocaleString('en-GB');
}

/** "12%" / "Free" for rates; caller renders the not-applicable state itself. */
export function rateLabel(pct: number): string {
  return pct === 0 ? 'Free' : `${pct}%`;
}

/** Duty/VAT amounts of zero render as an em dash (nothing was due), never "0". */
export function amountOrDash(m: Money): string {
  return m.amountMinor === 0 ? '—' : units(m);
}

/**
 * Additional references declared on goods lines. Returns null when no line
 * carries one so the caller renders a labelled field state, never a blank.
 */
export function additionalRefs(d: Declaration): string | null {
  const refs = d.lines
    .map((l) => (isValue(l.additionalReference) ? l.additionalReference.value : null))
    .filter((x): x is string => x !== null);
  return refs.length > 0 ? refs.join(', ') : null;
}

export function fxNote(d: Declaration): string {
  return d.declaredFxToEur === 1
    ? 'Declared in EUR — no conversion applied.'
    : `Declared conversion rate: 1 ${d.currency} = ${d.declaredFxToEur} EUR. EUR equivalents use this declared rate only.`;
}
