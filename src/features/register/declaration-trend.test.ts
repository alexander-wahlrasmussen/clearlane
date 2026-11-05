import { describe, expect, it } from 'vitest';
import { MockDeclarationsClient } from '../../mocks/mock-declarations-client';
import { testDeclarations } from '../../test/factories';
import { declarationTrendStart, monthEndDate, monthlyDeclarationCounts } from './declaration-trend';

describe('declaration trend', () => {
  const now = new Date('2026-11-05T11:00:00Z');
  const scope = { availableFrom: '2026-03-01', availableTo: '2026-08-26' };

  it('starts with the first month of the trailing 12-month period', () => {
    expect(declarationTrendStart(now)).toBe('2025-12-01');
  });

  it('returns the inclusive end date for a month, including leap years', () => {
    expect(monthEndDate('2026-04-01')).toBe('2026-04-30');
    expect(monthEndDate('2028-02-01')).toBe('2028-02-29');
  });

  it('does not present months outside data coverage as zero counts', () => {
    const series = monthlyDeclarationCounts(testDeclarations(), scope, now);

    expect(series).toHaveLength(12);
    expect(series[0]).toMatchObject({ month: '2025-12-01', count: null });
    expect(series.find((month) => month.month === '2026-03-01')?.count).toBeGreaterThan(0);
    expect(series.find((month) => month.month === '2026-09-01')?.count).toBeNull();
    expect(series.at(-1)).toMatchObject({ month: '2026-11-01', count: null });
  });

  it('counts declarations in their clearance month', () => {
    const declarations = testDeclarations().slice(0, 3).map((declaration) => ({
      ...declaration,
      clearanceDate: '2026-04-15',
    }));

    expect(
      monthlyDeclarationCounts(declarations, scope, now).find((month) => month.month === '2026-04-01')?.count,
    ).toBe(3);
  });

  it('reconciles each available monthly count with the exact register date filter', async () => {
    const client = new MockDeclarationsClient({ latencyMs: 0 });
    const declarations = await client.listAllDeclarations({});
    const series = monthlyDeclarationCounts(declarations, scope, now);

    for (const month of series.filter((item) => item.count !== null)) {
      const registerRows = await client.listAllDeclarations({
        fromDate: month.month,
        toDate: monthEndDate(month.month),
      });
      expect(month.count).toBe(registerRows.length);
    }
  });
});
