import type { DeclarationStatus, DeclarationType } from '../domain/declaration';
import { DEFAULT_COLUMNS, type Grain } from '../features/register/columns';
import { DEFAULT_REGISTER_STATE, type PeriodOption } from '../features/register/register-state';
import { BUILT_IN_VIEWS, type RegisterView, type ViewConfig } from '../features/register/views';
import type { ExtractInterpretation, PeriodKey } from './ask-types';

/**
 * How an extract interpretation is built. A report — built-in or the user's
 * own — is a question whose interpretation is already known: its view,
 * verbatim. A question that asks for rows without naming a report starts from
 * the Declaration Summary or the goods-line default and applies the filters
 * the question named.
 */
export function extractFromView(view: RegisterView): ExtractInterpretation {
  const { id, name, grain, columns, filter, sort } = view;
  return { kind: 'extract', name, reportId: id, view: { grain, columns, filter, sort } };
}

export const DECLARATION_SUMMARY = BUILT_IN_VIEWS[0]!;

export interface ExtractFilters {
  grain?: Grain;
  period?: PeriodOption;
  country?: string;
  type?: DeclarationType | 'all';
  status?: DeclarationStatus | 'all';
  gapsOnly?: boolean;
}

/**
 * A built-in report, or the register at a grain, with the question's filters
 * applied. Rows asked for without naming a report are the Declaration Summary
 * at declaration grain — it is the register's default view — and the plain
 * goods-line register otherwise, which no built-in report describes.
 */
export function composeExtract(named: RegisterView | null, f: ExtractFilters): ExtractInterpretation {
  const grain: Grain = f.grain ?? named?.grain ?? 'declaration';
  const base = named?.grain === grain ? named : grain === 'declaration' ? DECLARATION_SUMMARY : null;
  const from: ViewConfig = base ?? {
    grain,
    columns: DEFAULT_COLUMNS[grain],
    filter: DEFAULT_REGISTER_STATE,
    sort: { sort: 'date', order: 'desc' },
  };
  return {
    kind: 'extract',
    name: base?.name ?? 'Goods lines',
    reportId: base?.id ?? null,
    view: {
      ...from,
      filter: {
        ...from.filter,
        period: f.period ?? from.filter.period,
        country: f.country ?? from.filter.country,
        type: f.type ?? from.filter.type,
        status: f.status ?? from.filter.status,
        gapsOnly: f.gapsOnly ?? from.filter.gapsOnly,
      },
    },
  };
}

/**
 * The register's date ranges are coarser than the Ask vocabulary. Each Ask
 * period maps to the smallest register range that contains it; `exact` is
 * false when the range is wider than what was asked, so the answer can say so.
 */
export function registerPeriodFor(key: PeriodKey): { period: PeriodOption; exact: boolean } {
  switch (key) {
    case 'm08':
      return { period: '1m', exact: true };
    case 'f06':
      return { period: '3m', exact: true };
    case 'all':
      return { period: '6m', exact: true };
    case 'f07':
      return { period: '3m', exact: false };
    default:
      return { period: '6m', exact: false };
  }
}
