import type { Declaration } from '../../domain/declaration';
import type { Money } from '../../domain/money';
import type { FieldValue } from '../../domain/field-value';
import { fv, isValue, NOT_AVAILABLE } from '../../domain/field-value';
import { sumMoney } from '../../domain/money';

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

/**
 * Goods origin is declared per goods line, so a declaration has one origin only
 * when every line agrees. Never collapse several origins into the first one.
 */
export function lineOriginSummary(d: Declaration): string {
  const distinct = [...new Set(d.lines.map((l) => l.originCountry))];
  if (distinct.length === 0) return 'Not available';
  if (distinct.length === 1) return distinct[0] as string;
  return `Several — see goods lines (${distinct.length} origins)`;
}

/**
 * Declaration-level excise, summed from the goods lines that declare it. When no
 * line declares excise the field state is carried up rather than shown as zero
 * or as "Not applicable" — excise is optional on all three declaration types.
 */
export function exciseTotal(d: Declaration): FieldValue<Money> {
  const declared = d.lines.map((l) => l.excise).filter(isValue);
  if (declared.length > 0) return fv(sumMoney(declared.map((f) => f.value), d.currency));
  return d.lines[0]?.excise ?? NOT_AVAILABLE;
}

export function fxNote(d: Declaration): string {
  return d.declaredFxToEur === 1
    ? 'Declared in EUR — no conversion applied.'
    : `Declared conversion rate: 1 ${d.currency} = ${d.declaredFxToEur} EUR. EUR equivalents use this declared rate only.`;
}
