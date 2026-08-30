import { COUNTRY_NAMES } from '../domain/countries';
import { DECLARATION_STATUSES, DECLARATION_TYPES } from '../domain/declaration';
import { NOT_OFFERED_REPORT_IDS } from '../domain/reports-not-offered';
import { registerColumn } from '../features/register/columns';
import { PERIOD_LABEL } from '../features/register/register-state';
import {
  METRIC_LABEL,
  PERIODS,
  type AggregateInterpretation,
  type ExtractInterpretation,
  type Interpretation,
  type InterpretedQuestion,
} from './ask-types';

/**
 * A model's output is untrusted input. Nothing reaches answer-compute.ts until
 * it has been checked against the closed vocabulary here — an unknown period
 * key or an invalid regex would otherwise throw mid-render.
 */
export class InvalidInterpretationError extends Error {
  constructor(problem: string) {
    super(`Interpretation rejected: ${problem}`);
    this.name = 'InvalidInterpretationError';
  }
}

const GROUPINGS = ['none', 'country', 'month', 'commodity', 'type'] as const;
const LIST_KINDS = ['awaiting', 'gaps', 'stale', 'attention'] as const;
const COMPARE_FIELDS = ['period', 'country', 'type'] as const;
const GRAINS = ['declaration', 'line'] as const;
const SORT_KEYS = ['date', 'customsValue', 'duty', 'vat'] as const;

const isString = (v: unknown): v is string => typeof v === 'string';
const oneOf = (v: unknown, set: readonly string[]) => isString(v) && set.includes(v);
const isCountry = (v: unknown) => isString(v) && v in COUNTRY_NAMES;

function aggregateProblem(a: AggregateInterpretation): string | null {
  if (!oneOf(a.metric, Object.keys(METRIC_LABEL))) return `unknown metric "${String(a.metric)}"`;
  if (!oneOf(a.period, Object.keys(PERIODS))) return `unknown period "${String(a.period)}"`;
  if (a.country !== 'all' && !isCountry(a.country)) return `unknown country "${String(a.country)}"`;
  if (a.type !== 'all' && !oneOf(a.type, DECLARATION_TYPES)) return `unknown declaration type "${String(a.type)}"`;
  if (!oneOf(a.grouping, GROUPINGS)) return `unknown grouping "${String(a.grouping)}"`;
  if (a.originCountry !== null && !isCountry(a.originCountry)) {
    return `unknown origin country "${String(a.originCountry)}"`;
  }
  if (a.goods !== null) {
    if (!isString(a.goods.label) || !isString(a.goods.codePattern)) return 'malformed goods filter';
    try {
      new RegExp(a.goods.codePattern);
    } catch {
      return `invalid commodity-code pattern "${a.goods.codePattern}"`;
    }
  }
  return null;
}

/**
 * An extract is a register view, so it is checked against the register's own
 * vocabulary: the column registry, the date ranges, the statuses. A column the
 * registry does not offer at that grain is rejected, not dropped — the model
 * was given the closed list.
 */
function extractProblem(e: ExtractInterpretation): string | null {
  if (!isString(e.name) || !e.name.trim()) return 'extract has no name';
  if (e.reportId !== null && !isString(e.reportId)) return 'malformed report id';
  const v = e.view as Partial<ExtractInterpretation['view']> | null;
  if (typeof v !== 'object' || v === null) return 'extract has no view';
  const grain = GRAINS.find((g) => g === v.grain);
  if (!grain) return `unknown grain "${String(v.grain)}"`;
  if (!Array.isArray(v.columns) || v.columns.length === 0) return 'extract has no columns';
  for (const id of v.columns) {
    const c = isString(id) ? registerColumn(id) : undefined;
    if (!c) return `unknown column "${String(id)}"`;
    if (!c.grains.includes(grain)) return `column "${id}" is not offered at ${grain} grain`;
  }
  const f = v.filter as Partial<ExtractInterpretation['view']['filter']> | null;
  if (typeof f !== 'object' || f === null) return 'extract has no filter';
  if (!oneOf(f.period, Object.keys(PERIOD_LABEL))) return `unknown date range "${String(f.period)}"`;
  if (f.country !== 'all' && !isCountry(f.country)) return `unknown country "${String(f.country)}"`;
  if (f.type !== 'all' && !oneOf(f.type, DECLARATION_TYPES)) return `unknown declaration type "${String(f.type)}"`;
  if (f.status !== 'all' && !oneOf(f.status, DECLARATION_STATUSES)) return `unknown status "${String(f.status)}"`;
  if (!isString(f.search)) return 'malformed search';
  if (typeof f.gapsOnly !== 'boolean') return 'malformed data-gaps flag';
  const s = v.sort as Partial<ExtractInterpretation['view']['sort']> | null;
  if (typeof s !== 'object' || s === null || !oneOf(s.sort, SORT_KEYS) || !oneOf(s.order, ['asc', 'desc'])) {
    return 'malformed sort';
  }
  return null;
}

/** Plain-English description of what is wrong, or null when the interpretation is usable. */
export function interpretationProblem(i: Interpretation): string | null {
  switch (i.kind) {
    case 'aggregate':
      return aggregateProblem(i);
    case 'list':
      return oneOf(i.list, LIST_KINDS) ? null : `unknown list kind "${String(i.list)}"`;
    case 'extract':
      return extractProblem(i);
    case 'unsupported':
      return oneOf(i.report, NOT_OFFERED_REPORT_IDS) ? null : `unknown report "${String(i.report)}"`;
    case 'compare': {
      if (!oneOf(i.field, COMPARE_FIELDS)) return `unknown comparison field "${String(i.field)}"`;
      const valid =
        i.field === 'period'
          ? (v: string) => v in PERIODS
          : i.field === 'country'
            ? isCountry
            : (v: string) => oneOf(v, DECLARATION_TYPES);
      for (const side of [i.a, i.b]) {
        if (!isString(side) || !valid(side)) return `"${String(side)}" is not a valid ${i.field} to compare`;
      }
      return aggregateProblem(i.base);
    }
    default:
      return `unknown interpretation kind "${String((i as { kind: unknown }).kind)}"`;
  }
}

/** Throws InvalidInterpretationError rather than letting a bad interpretation reach the UI. */
export function assertValidInterpretation(i: Interpretation): void {
  const problem = interpretationProblem(i);
  if (problem) throw new InvalidInterpretationError(problem);
}

/** Validates a server response body (POST /ask/interpret) before it is trusted. */
export function parseInterpretedQuestion(raw: unknown): InterpretedQuestion {
  if (typeof raw !== 'object' || raw === null) throw new InvalidInterpretationError('response is not an object');
  const r = raw as Record<string, unknown>;
  if (!isString(r.question)) throw new InvalidInterpretationError('missing question');
  const c = r.confidence;
  if (typeof c !== 'object' || c === null || typeof (c as { low: unknown }).low !== 'boolean') {
    throw new InvalidInterpretationError('missing confidence');
  }
  const interpretation = r.interpretation as Interpretation;
  if (typeof interpretation !== 'object' || interpretation === null) {
    throw new InvalidInterpretationError('missing interpretation');
  }
  assertValidInterpretation(interpretation);
  const message = (c as { message?: unknown }).message;
  return {
    question: r.question,
    interpretation,
    confidence: { low: (c as { low: boolean }).low, message: isString(message) ? message : '' },
  };
}
