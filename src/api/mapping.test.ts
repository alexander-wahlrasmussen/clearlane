import { describe, expect, it } from 'vitest';
import { parseWireField } from './mapping';
import { testDeclarations } from '../test/factories';

describe('mapping', () => {
  it('converts each sentinel to its field state', () => {
    expect(parseWireField<number>('§na').kind).toBe('not-applicable');
    expect(parseWireField<number>('§np').kind).toBe('not-populated');
    expect(parseWireField<number>('§nav').kind).toBe('not-available');
    expect(parseWireField<number>('§unv').kind).toBe('not-verified');
    expect(parseWireField(12.5)).toEqual({ kind: 'value', value: 12.5 });
  });

  it('maps the full synthetic dataset without unknown statuses', () => {
    const decls = testDeclarations();
    expect(decls.length).toBeGreaterThan(40);
    for (const d of decls) {
      expect(d.currency).toMatch(/^[A-Z]{3}$/);
      expect(d.lines.length).toBeGreaterThan(0);
    }
  });

  it('preserves the curated net-mass gap as not-populated (never a blank or zero)', () => {
    const gb = testDeclarations().find(
      (d) => d.countryCode === 'GB' && d.attention?.issue === 'Missing required information',
    );
    expect(gb).toBeDefined();
    expect(gb!.lines[1]!.netKg.kind).toBe('not-populated');
    expect(gb!.assurance.missing[0]!.field).toContain('Net mass');
  });

  it('money is integer minor units end to end', () => {
    for (const d of testDeclarations()) {
      expect(Number.isInteger(d.customsValueTotal.amountMinor)).toBe(true);
      for (const l of d.lines) expect(Number.isInteger(l.dutyAmount.amountMinor)).toBe(true);
    }
  });
});
