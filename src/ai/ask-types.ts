import type { DeclarationType } from '../domain/declaration';
import type { NotOfferedReportId } from '../domain/reports-not-offered';
import type { ViewConfig } from '../features/register/views';

/**
 * A structured interpretation of a natural-language question. This is the ONLY
 * thing an LLM ever produces — every number is computed deterministically from
 * declaration data by answer-compute.ts (principle #6: AI answers are
 * evidence-backed only). The interpretation is shown to the user as editable
 * chips; editing recomputes without another model call.
 */
export type Metric = 'value' | 'duty' | 'vat' | 'dutyvat' | 'count';

export const METRIC_LABEL: Record<Metric, string> = {
  value: 'Customs value',
  duty: 'Duty',
  vat: 'VAT',
  dutyvat: 'Duty + VAT',
  count: 'Declarations',
};

export type PeriodKey =
  | 'all' | 'f04' | 'f05' | 'f06' | 'f07' | 'q2'
  | 'm03' | 'm04' | 'm05' | 'm06' | 'm07' | 'm08';

export interface Period {
  from: string;
  to: string;
  label: string;
}

export const PERIODS: Record<PeriodKey, Period> = {
  all: { from: '2026-03-01', to: '2026-08-31', label: 'Mar–Aug 2026 (all available)' },
  f04: { from: '2026-04-01', to: '2026-08-31', label: 'Apr–Aug 2026' },
  f05: { from: '2026-05-01', to: '2026-08-31', label: 'May–Aug 2026' },
  f06: { from: '2026-06-01', to: '2026-08-31', label: 'Jun–Aug 2026' },
  f07: { from: '2026-07-01', to: '2026-08-31', label: 'Jul–Aug 2026 (Q3 to date)' },
  q2: { from: '2026-04-01', to: '2026-06-30', label: 'Q2 2026 (Apr–Jun)' },
  m03: { from: '2026-03-01', to: '2026-03-31', label: 'Mar 2026' },
  m04: { from: '2026-04-01', to: '2026-04-30', label: 'Apr 2026' },
  m05: { from: '2026-05-01', to: '2026-05-31', label: 'May 2026' },
  m06: { from: '2026-06-01', to: '2026-06-30', label: 'Jun 2026' },
  m07: { from: '2026-07-01', to: '2026-07-31', label: 'Jul 2026' },
  m08: { from: '2026-08-01', to: '2026-08-31', label: 'Aug 2026' },
};

export type Grouping = 'none' | 'country' | 'month' | 'commodity' | 'type';

export interface GoodsFilter {
  label: string;
  /** Regex over the commodity code with spaces removed, e.g. "^(61|42)". */
  codePattern: string;
}

export interface AggregateInterpretation {
  kind: 'aggregate';
  metric: Metric;
  period: PeriodKey;
  /** ISO country code of the declaration country, or 'all'. */
  country: string;
  type: DeclarationType | 'all';
  grouping: Grouping;
  goods: GoodsFilter | null;
  /** ISO country code of the goods origin, or null. */
  originCountry: string | null;
}

export type CompareField = 'period' | 'country' | 'type';

export interface CompareInterpretation {
  kind: 'compare';
  field: CompareField;
  a: string;
  b: string;
  base: AggregateInterpretation;
}

export type ListKind = 'awaiting' | 'gaps' | 'stale' | 'attention';

export interface ListInterpretation {
  kind: 'list';
  list: ListKind;
}

/**
 * A row-level extract: the register configured a particular way — rows,
 * columns, filters, sort — exactly as the MVP's saved reports are (a report is
 * a question whose interpretation is already known). Its rows are its evidence.
 */
export interface ExtractInterpretation {
  kind: 'extract';
  /** What the answer is called — the report's name, or a plain description of the rows. */
  name: string;
  /** The built-in or saved report this started from, or null when composed from the question. */
  reportId: string | null;
  view: ViewConfig;
}

/**
 * A requested report the declaration data cannot produce. The answer is the
 * reason, and nothing else — no numbers, no evidence, no draft section.
 */
export interface UnsupportedInterpretation {
  kind: 'unsupported';
  report: NotOfferedReportId;
}

/** The kinds whose answer is computed from the declaration set in answer-compute.ts. */
export type ComputedInterpretation = AggregateInterpretation | CompareInterpretation | ListInterpretation;

export type Interpretation = ComputedInterpretation | ExtractInterpretation | UnsupportedInterpretation;

export function isComputed(i: Interpretation): i is ComputedInterpretation {
  return i.kind === 'aggregate' || i.kind === 'compare' || i.kind === 'list';
}

export interface Confidence {
  low: boolean;
  message: string;
}

export interface InterpretedQuestion {
  question: string;
  interpretation: Interpretation;
  confidence: Confidence;
}
