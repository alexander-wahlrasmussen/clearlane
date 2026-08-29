import type { DeclarationFilter } from '../../api/declarations-client';
import type { DeclarationStatus, DeclarationType } from '../../domain/declaration';
import { countryName } from '../../domain/countries';

export type PeriodOption = '1m' | '3m' | '6m' | 'ytd';

export const PERIOD_FROM: Record<PeriodOption, string> = {
  '1m': '2026-08-01',
  '3m': '2026-06-01',
  '6m': '2026-03-01',
  ytd: '2026-01-01',
};

export const PERIOD_LABEL: Record<PeriodOption, string> = {
  '1m': 'This month (Aug 2026)',
  '3m': 'Last 3 months (Jun–Aug 2026)',
  '6m': 'Last 6 months (Mar–Aug 2026)',
  ytd: 'Year to date (Jan–Aug 2026)',
};

export interface RegisterState {
  period: PeriodOption;
  country: string; // 'all' or ISO code
  type: DeclarationType | 'all';
  status: DeclarationStatus | 'all';
  search: string;
  gapsOnly: boolean;
}

export const DEFAULT_REGISTER_STATE: RegisterState = {
  period: '6m',
  country: 'all',
  type: 'all',
  status: 'all',
  search: '',
  gapsOnly: false,
};

export function toFilter(state: RegisterState, entity: string): DeclarationFilter {
  return {
    fromDate: PERIOD_FROM[state.period],
    entity: entity === 'all' ? undefined : entity,
    country: state.country === 'all' ? undefined : state.country,
    type: state.type === 'all' ? undefined : state.type,
    status: state.status === 'all' ? undefined : state.status,
    search: state.search.trim() || undefined,
    withGapsOnly: state.gapsOnly || undefined,
  };
}

export interface FilterChip {
  key: 'country' | 'type' | 'status' | 'entity' | 'search' | 'gapsOnly';
  label: string;
}

export function activeChips(state: RegisterState, entity: string): FilterChip[] {
  const chips: FilterChip[] = [];
  if (state.country !== 'all') chips.push({ key: 'country', label: `Country: ${countryName(state.country)}` });
  if (state.type !== 'all') chips.push({ key: 'type', label: `Type: ${state.type[0]!.toUpperCase()}${state.type.slice(1)}` });
  if (state.status !== 'all') chips.push({ key: 'status', label: `Status: ${state.status}` });
  if (entity !== 'all') chips.push({ key: 'entity', label: `Entity: ${entity}` });
  if (state.search.trim()) chips.push({ key: 'search', label: `Search: ${state.search.trim()}` });
  if (state.gapsOnly) chips.push({ key: 'gapsOnly', label: 'With data gaps' });
  return chips;
}
