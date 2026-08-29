import { describe, expect, it } from 'vitest';
import { reconcile } from './reconciliation';
import { money } from './money';
import { testDeclarations } from '../test/factories';

describe('reconcile', () => {
  it('every synthetic declaration reconciles (generator sums lines into totals)', () => {
    for (const d of testDeclarations()) {
      expect(reconcile(d).reconciled).toBe(true);
    }
  });

  it('reports a mismatch instead of hiding it', () => {
    const d = structuredClone(testDeclarations()[0]!);
    d.dutyTotal = money(d.dutyTotal.amountMinor + 100, d.currency);
    const r = reconcile(d);
    expect(r.duty).toBe(false);
    expect(r.reconciled).toBe(false);
    expect(r.customsValue).toBe(true);
  });
});
