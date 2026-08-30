import type { AuthProvider } from '../auth/auth-provider';
import { API_SCOPES } from '../auth/auth-provider';
import { DECLARATION_STATUSES, type DeclarationStatus, type DeclarationType } from '../domain/declaration';
import { NOT_OFFERED_REPORT_IDS, type NotOfferedReportId } from '../domain/reports-not-offered';
import { REGISTER_COLUMNS, type Grain } from '../features/register/columns';
import type { PeriodOption } from '../features/register/register-state';
import { BUILT_IN_VIEWS } from '../features/register/views';
import type { AskEngine } from './ask-engine';
import type { Interpretation, InterpretedQuestion } from './ask-types';
import { composeExtract } from './extract-view';
import { assertValidInterpretation, parseInterpretedQuestion } from './interpretation-guard';

/**
 * Claude-backed interpretation. The model's ONLY job is to fill the
 * `interpret_question` tool — a strictly typed schema mirroring the
 * Interpretation union. It never sees declaration values and never produces a
 * number. If the schema cannot express the question, the model must set
 * lowConfidence and explain why in plain British English.
 *
 * Production path: ApiAskEngine → POST /ask/interpret, where the backend calls
 * Claude (Anthropic API directly, or Claude on Azure AI Foundry to stay inside
 * the Azure estate). See docs/ai-orchestration.md.
 */
export const ASK_SYSTEM_PROMPT = `You interpret questions from a customs compliance user about their company's
customs declarations. You NEVER answer the question yourself and NEVER produce
numbers — you only map the question onto the interpret_question tool, whose
fields drive a deterministic query over the declaration database.

Rules:
- Data covers 1 March 2026 to 26 August 2026, eight declaration countries
  (GB, DE, NL, SE, BE, DK, ES, NO), declaration types import/export/transit.
- If any meaningful part of the question cannot be expressed in the schema
  (a country outside the eight, a date before March 2026, a request for
  advice, prediction, classification or risk scoring), set lowConfidence to
  true and say plainly, in British English, what could not be used and why.
  Never guess. Never advise.
- "value" means customs value. Comparisons ("X vs Y") must use compare with
  both sides of the same field type.
- Questions about missing data, unreleased declarations, stale refreshes or
  flagged records are list questions.
- A request for a report, a table, rows, an extract or an export of
  declarations or goods lines is an extract. Name the built-in report in
  reportId when the question names one (Declaration Summary, Declaration Line
  Overview, Order/Declaration status); otherwise leave it unset and set grain
  ("line" when goods lines are asked for). Only set columns when the question
  names fields explicitly. The register's date ranges are coarse (this month,
  last 3 months, last 6 months, year to date): pick the smallest that covers
  the period asked for and, if it is wider, set lowConfidence and say so.
- VAT reports, MDR, MCD, EC Sales and Intrastat cannot be produced from
  declaration data. Map them to kind "unsupported" with unsupportedReport set;
  the product explains why. Never attempt to approximate them.`;

/** Anthropic tool definition — the entire surface the model can touch. */
export const INTERPRET_TOOL = {
  name: 'interpret_question',
  description: 'Structured interpretation of the user question. Drives a deterministic query; no free text reaches the user except lowConfidenceMessage.',
  input_schema: {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['aggregate', 'compare', 'list', 'extract', 'unsupported'] },
      metric: { type: 'string', enum: ['value', 'duty', 'vat', 'dutyvat', 'count'] },
      period: {
        type: 'string',
        enum: ['all', 'f04', 'f05', 'f06', 'f07', 'q2', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08'],
        description: 'all=Mar–Aug, fMM=from month MM to Aug, q2=Apr–Jun, mMM=single month',
      },
      country: { type: 'string', description: "Declaration country ISO code or 'all'" },
      type: { type: 'string', enum: ['import', 'export', 'transit', 'all'] },
      grouping: { type: 'string', enum: ['none', 'country', 'month', 'commodity', 'type'] },
      goodsLabel: { type: 'string', description: 'Human label for a goods filter, if the question names goods' },
      goodsCodePattern: { type: 'string', description: 'Regex over commodity code without spaces, e.g. ^(61|42)' },
      originCountry: { type: 'string', description: 'ISO code of goods origin, if the question filters by origin' },
      compareField: { type: 'string', enum: ['period', 'country', 'type'] },
      compareA: { type: 'string' },
      compareB: { type: 'string' },
      listKind: { type: 'string', enum: ['awaiting', 'gaps', 'stale', 'attention'] },
      reportId: {
        type: 'string',
        enum: BUILT_IN_VIEWS.map((v) => v.id),
        description: 'For extract: the built-in report the question names, if any',
      },
      grain: { type: 'string', enum: ['declaration', 'line'], description: 'For extract: one row per declaration or per goods line' },
      columns: {
        type: 'array',
        items: { type: 'string', enum: REGISTER_COLUMNS.map((c) => c.id) },
        description: 'For extract: only the columns the question names explicitly; omit to use the report’s or the default set',
      },
      registerPeriod: { type: 'string', enum: ['1m', '3m', '6m', 'ytd'], description: 'For extract: this month, last 3 months, last 6 months, year to date' },
      status: { type: 'string', enum: [...DECLARATION_STATUSES, 'all'], description: 'For extract: a declaration status filter' },
      gapsOnly: { type: 'boolean', description: 'For extract: only declarations with data gaps' },
      unsupportedReport: {
        type: 'string',
        enum: [...NOT_OFFERED_REPORT_IDS],
        description: 'For unsupported: which requested report the data cannot produce',
      },
      lowConfidence: { type: 'boolean' },
      lowConfidenceMessage: { type: 'string', description: 'Plain British English; required when lowConfidence is true' },
    },
    required: ['kind', 'lowConfidence'],
  },
} as const;

interface ToolOutput {
  kind: 'aggregate' | 'compare' | 'list' | 'extract' | 'unsupported';
  metric?: string;
  period?: string;
  country?: string;
  type?: string;
  grouping?: string;
  goodsLabel?: string;
  goodsCodePattern?: string;
  originCountry?: string;
  compareField?: 'period' | 'country' | 'type';
  compareA?: string;
  compareB?: string;
  listKind?: 'awaiting' | 'gaps' | 'stale' | 'attention';
  reportId?: string;
  grain?: Grain;
  columns?: string[];
  registerPeriod?: PeriodOption;
  status?: DeclarationStatus | 'all';
  gapsOnly?: boolean;
  unsupportedReport?: NotOfferedReportId;
  lowConfidence: boolean;
  lowConfidenceMessage?: string;
}

const TOOL_KINDS: readonly ToolOutput['kind'][] = ['aggregate', 'compare', 'list', 'extract', 'unsupported'];

export function toolOutputToInterpretation(question: string, out: ToolOutput): InterpretedQuestion {
  const base = {
    kind: 'aggregate' as const,
    metric: (out.metric ?? 'value') as 'value',
    period: (out.period ?? 'all') as 'all',
    country: out.country ?? 'all',
    type: (out.type ?? 'all') as 'all',
    grouping: (out.grouping ?? 'none') as 'none',
    goods:
      out.goodsLabel && out.goodsCodePattern
        ? { label: out.goodsLabel, codePattern: out.goodsCodePattern }
        : null,
    originCountry: out.originCountry ?? null,
  };
  let interpretation: Interpretation = base;
  if (out.kind === 'compare' && out.compareField && out.compareA && out.compareB) {
    interpretation = { kind: 'compare', field: out.compareField, a: out.compareA, b: out.compareB, base };
  } else if (out.kind === 'list' && out.listKind) {
    interpretation = { kind: 'list', list: out.listKind };
  } else if (out.kind === 'unsupported' && out.unsupportedReport) {
    interpretation = { kind: 'unsupported', report: out.unsupportedReport };
  } else if (out.kind === 'extract') {
    const report = BUILT_IN_VIEWS.find((v) => v.id === out.reportId) ?? null;
    const extract = composeExtract(report, {
      grain: out.grain,
      period: out.registerPeriod,
      country: out.country && out.country !== 'all' ? out.country : undefined,
      type: out.type ? (out.type as DeclarationType | 'all') : undefined,
      status: out.status,
      gapsOnly: out.gapsOnly,
    });
    interpretation = out.columns?.length ? { ...extract, view: { ...extract.view, columns: out.columns } } : extract;
  }
  assertValidInterpretation(interpretation);
  return {
    question,
    interpretation,
    confidence: { low: out.lowConfidence === true, message: out.lowConfidenceMessage ?? '' },
  };
}

/** Production engine: interpretation happens server-side (see contracts/openapi.yaml). */
export class ApiAskEngine implements AskEngine {
  private readonly baseUrl: string;

  constructor(baseUrl: string, private readonly auth: AuthProvider) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  }

  async interpret(question: string): Promise<InterpretedQuestion> {
    const token = await this.auth.acquireToken(API_SCOPES);
    const res = await fetch(new URL('ask/interpret', this.baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error(`ask/interpret failed with ${res.status}`);
    return parseInterpretedQuestion(await res.json());
  }
}

/**
 * LOCAL DEMOS ONLY. Calls the Anthropic API directly from the browser with a
 * personal API key — the key is visible to the page, so this must never ship.
 * Exists so the concept can be demoed against a real model without a backend.
 */
export class AnthropicDevAskEngine implements AskEngine {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async interpret(question: string): Promise<InterpretedQuestion> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: ASK_SYSTEM_PROMPT,
        tools: [INTERPRET_TOOL],
        tool_choice: { type: 'tool', name: 'interpret_question' },
        messages: [{ role: 'user', content: question }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API request failed with ${res.status}`);
    const data = (await res.json()) as {
      content: { type: string; input?: unknown }[];
    };
    const toolUse = data.content.find((c) => c.type === 'tool_use');
    if (!toolUse || typeof toolUse.input !== 'object' || toolUse.input === null) {
      throw new Error('Model did not return an interpretation');
    }
    const out = toolUse.input as Partial<ToolOutput>;
    const kind = TOOL_KINDS.find((k) => k === out.kind);
    if (!kind) throw new Error(`Model returned unknown interpretation kind "${String(out.kind)}"`);
    return toolOutputToInterpretation(question, { ...out, kind, lowConfidence: out.lowConfidence === true });
  }
}
