import { COUNTRY_NAMES } from '../domain/countries';
import { DECLARATION_TYPES } from '../domain/declaration';
import {
  METRIC_LABEL,
  PERIODS,
  type AggregateInterpretation,
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

/** Plain-English description of what is wrong, or null when the interpretation is usable. */
export function interpretationProblem(i: Interpretation): string | null {
  switch (i.kind) {
    case 'aggregate':
      return aggregateProblem(i);
    case 'list':
      return oneOf(i.list, LIST_KINDS) ? null : `unknown list kind "${String(i.list)}"`;
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
