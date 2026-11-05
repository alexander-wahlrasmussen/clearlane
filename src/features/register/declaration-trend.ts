import type { DataScope } from '../../api/declarations-client';
import type { Declaration } from '../../domain/declaration';

export interface MonthlyDeclarationCount {
  month: string;
  label: string;
  count: number | null;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function declarationTrendStart(now: Date): string {
  return isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)));
}

export function monthEndDate(monthStart: string): string {
  const date = new Date(`${monthStart}T00:00:00Z`);
  return isoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
}

export function monthlyDeclarationCounts(
  declarations: readonly Declaration[],
  scope: Pick<DataScope, 'availableFrom' | 'availableTo'>,
  now: Date,
): MonthlyDeclarationCount[] {
  const today = isoDate(now);
  const months: MonthlyDeclarationCount[] = [];

  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const monthStart = isoDate(date);
    const monthEnd = isoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
    const coveredFrom = scope.availableFrom > monthStart ? scope.availableFrom : monthStart;
    const scopeEnd = scope.availableTo < today ? scope.availableTo : today;
    const coveredTo = scopeEnd < monthEnd ? scopeEnd : monthEnd;
    const available = coveredFrom <= coveredTo;
    const count = available
      ? declarations.filter(
          (declaration) =>
            declaration.clearanceDate >= monthStart &&
            declaration.clearanceDate <= monthEnd &&
            declaration.clearanceDate <= today,
        ).length
      : null;

    months.push({
      month: monthStart,
      label: new Intl.DateTimeFormat('en-GB', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }).format(date),
      count,
    });
  }

  return months;
}
