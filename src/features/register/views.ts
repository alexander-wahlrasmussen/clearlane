import type { ListSort } from '../../api/declarations-client';
import { DEFAULT_COLUMNS, GRAIN_LABEL, type Grain } from './columns';
import { countryName } from '../../domain/countries';
import { DEFAULT_REGISTER_STATE, PERIOD_LABEL, type RegisterState } from './register-state';

/**
 * A view is the register configured a particular way: rows, columns, filters
 * and sort. A named view is what the customer calls a report (docs/reports-sourcing.md):
 * one register configured several ways, never a separate page that could
 * disagree with it (principle #4).
 *
 * The legal-entity selector lives in the shell and is deliberately not part of
 * a view — a report is the same report whichever entity is selected.
 */
export interface ViewConfig {
  grain: Grain;
  columns: readonly string[];
  filter: RegisterState;
  sort: ListSort;
}

export interface RegisterView extends ViewConfig {
  id: string;
  name: string;
  /** What the report shows, and what the source list cannot give it. */
  description: string;
  /** Built-in reports ship with the product and cannot be changed or deleted. */
  builtIn: boolean;
}

const NEWEST_FIRST: ListSort = { sort: 'date', order: 'desc' };

/**
 * The three requested reports the 77-field source list can produce in full
 * (docs/reports-sourcing.md). The other five are not offered; the Reports page
 * says why.
 */
export const BUILT_IN_VIEWS: readonly RegisterView[] = [
  {
    id: 'declaration-summary',
    name: 'Declaration Summary',
    description:
      'One row per declaration: status, parties, movement and the totals summed from its goods lines.',
    builtIn: true,
    grain: 'declaration',
    columns: DEFAULT_COLUMNS.declaration,
    filter: DEFAULT_REGISTER_STATE,
    sort: NEWEST_FIRST,
  },
  {
    id: 'declaration-line-overview',
    name: 'Declaration Line Overview',
    description:
      'One row per goods line with its commodity, origin, quantity, value and the duty and VAT declared on it.',
    builtIn: true,
    grain: 'line',
    columns: [
      'mrn', 'clearanceDate', 'country', 'type', 'importer',
      'lineNo', 'commodityCode', 'description', 'lineOrigin', 'procedure', 'preference',
      'quantity', 'netMass', 'lineCustomsValue', 'dutyRate', 'lineDuty', 'lineVat',
    ],
    filter: DEFAULT_REGISTER_STATE,
    sort: NEWEST_FIRST,
  },
  {
    id: 'order-declaration-status',
    name: 'Order/Declaration status',
    description:
      'Where each declaration stands, with the dates that say so. The order date in the source list is optional on every declaration type and is not yet held; which source field carries the customer’s own reference is still to be confirmed.',
    builtIn: true,
    grain: 'declaration',
    columns: [
      'status', 'mrn', 'declarationNumber', 'customerReference', 'clearanceDate', 'releaseDate',
      'country', 'type', 'importer', 'broker', 'lineCount',
    ],
    filter: DEFAULT_REGISTER_STATE,
    sort: NEWEST_FIRST,
  },
];

export function findView(views: readonly RegisterView[], id: string | null | undefined) {
  return id ? views.find((v) => v.id === id) : undefined;
}

/** Whether what is on screen is exactly the view — same rows, columns, filters and sort. */
export function viewMatches(view: ViewConfig, current: ViewConfig): boolean {
  return (
    view.grain === current.grain &&
    view.columns.length === current.columns.length &&
    view.columns.every((id, i) => id === current.columns[i]) &&
    view.sort.sort === current.sort.sort &&
    view.sort.order === current.sort.order &&
    filtersEqual(view.filter, current.filter)
  );
}

function filtersEqual(a: RegisterState, b: RegisterState): boolean {
  return (
    a.period === b.period &&
    a.country === b.country &&
    a.type === b.type &&
    a.status === b.status &&
    a.search.trim() === b.search.trim() &&
    a.gapsOnly === b.gapsOnly
  );
}

/** "Last 6 months (Mar–Aug 2026) · Germany · Import · With data gaps" */
export function describeFilter(f: RegisterState): string {
  const parts = [PERIOD_LABEL[f.period]];
  if (f.country !== 'all') parts.push(countryName(f.country));
  if (f.type !== 'all') parts.push(`${f.type[0]!.toUpperCase()}${f.type.slice(1)}`);
  if (f.status !== 'all') parts.push(f.status);
  if (f.search.trim()) parts.push(`Search: ${f.search.trim()}`);
  if (f.gapsOnly) parts.push('With data gaps');
  return parts.join(' · ');
}

export function describeGrain(grain: Grain): string {
  return grain === 'declaration' ? 'One row per declaration' : 'One row per goods line';
}

export { GRAIN_LABEL };
