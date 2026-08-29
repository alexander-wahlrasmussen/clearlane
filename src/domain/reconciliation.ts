import type { Declaration } from './declaration';
import { moneyEquals, sumMoney } from './money';

/**
 * Principle #4: totals must reconcile. Goods lines must sum exactly to the
 * declaration totals, and the UI states whether they do. A mismatch is shown,
 * not hidden.
 */
export interface ReconciliationResult {
  customsValue: boolean;
  duty: boolean;
  vat: boolean;
  reconciled: boolean;
}

export function reconcile(d: Declaration): ReconciliationResult {
  const cur = d.currency;
  const customsValue = moneyEquals(
    sumMoney(d.lines.map((l) => l.customsValue), cur),
    d.customsValueTotal,
  );
  const duty = moneyEquals(sumMoney(d.lines.map((l) => l.dutyAmount), cur), d.dutyTotal);
  const vat = moneyEquals(sumMoney(d.lines.map((l) => l.vatAmount), cur), d.vatTotal);
  return { customsValue, duty, vat, reconciled: customsValue && duty && vat };
}
