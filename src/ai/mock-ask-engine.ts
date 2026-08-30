import type { DeclarationStatus } from '../domain/declaration';
import type { NotOfferedReportId } from '../domain/reports-not-offered';
import { BUILT_IN_VIEWS, type RegisterView } from '../features/register/views';
import type { AskEngine } from './ask-engine';
import type {
  AggregateInterpretation,
  CompareField,
  Confidence,
  GoodsFilter,
  Interpretation,
  InterpretedQuestion,
  Metric,
  PeriodKey,
} from './ask-types';
import { composeExtract, registerPeriodFor } from './extract-view';

/**
 * Deterministic keyword interpreter — the no-network fallback for local dev
 * and tests. Deliberately conservative: anything it cannot place in the
 * vocabulary lowers confidence and says so (principle #6: if the data cannot
 * support the question, say so).
 */
const CTY: [string, ...string[]][] = [
  ['GB', 'united kingdom', 'uk', 'britain'], ['DE', 'germany', 'german'],
  ['NL', 'netherlands', 'dutch'], ['SE', 'sweden', 'swedish'],
  ['BE', 'belgium', 'belgian'], ['DK', 'denmark', 'danish'],
  ['ES', 'spain', 'spanish'], ['NO', 'norway', 'norwegian'],
];
const ORG: [string, ...string[]][] = [
  ['CN', 'china', 'chinese'], ['VN', 'vietnam'], ['TR', 'türkiye', 'turkiye', 'turkey'],
  ['IN', 'india'], ['US', 'united states', 'usa', 'america'], ['KR', 'korea'], ['JP', 'japan'],
];
const GDS: [string, string, string[]][] = [
  ['textiles & apparel', '^(61|42)', ['textile', 'textiles', 'apparel', 'clothing', 'garment', 'garments', 't-shirts', 'tshirts', 'shirts', 'bags', 'cotton']],
  ['portable computers', '^8471', ['laptop', 'laptops', 'computers', 'computer']],
  ['network equipment', '^8517', ['network', 'wireless', 'routers', 'router']],
  ['electronics', '^(84|85)', ['electronics', 'electronic']],
  ['skin-care preparations', '^3304', ['cosmetics', 'skincare', 'skin-care']],
  ['brake assemblies', '^8708', ['automotive', 'brake', 'brakes']],
  ['steel fasteners', '^7318', ['fasteners', 'bolts', 'screws']],
  ['DC motors', '^8501', ['motors', 'motor']],
  ['storage shelving', '^9403', ['furniture', 'shelving', 'shelves']],
  ['plugs & sockets', '^8536', ['plugs', 'sockets']],
];
const STOP =
  'the we our own in on of for paid pay show me tell what which who how much many is are was were to a an and with per by over from since this that these total all please give list across during between at it as do does did have has had i you us they last first each any more get went spend spent should would'.split(' ');
const METW =
  'duty duties vat tax taxes value values worth cost costs spend declarations declaration count number volume amount import imports imported export exports exported transit shipments shipment goods trend monthly month months country countries commodity commodities products product top type types compare vs versus year ytd quarter q1 q2 q3 released release awaiting waiting delayed stuck gaps gap missing unverified verified populated refreshed refresh stale updated attention issues issue anomalies anomaly risk review problems'.split(' ');
/** Report and extract vocabulary — rows, not figures. */
const REPW =
  'report reports reporting summary overview line lines level order orders status rows row table extract sheet spreadsheet csv excel download pull columns return returns intrastat ec sales esl mdr manifest discrepancy mcd material compliance completed amended control under customs'.split(' ');
const MONTH_WORDS: Record<string, PeriodKey> = {
  march: 'm03', mar: 'm03', april: 'm04', apr: 'm04', may: 'm05',
  june: 'm06', jun: 'm06', july: 'm07', jul: 'm07', august: 'm08', aug: 'm08',
};

let vocabCache: Set<string> | null = null;
function vocab(): Set<string> {
  if (vocabCache) return vocabCache;
  const v = new Set([...STOP, ...METW, ...REPW, ...Object.keys(MONTH_WORDS), 'time', 'date', 'data', 'customs', 'insights']);
  for (const a of CTY) for (const w of a.slice(1)) for (const x of w.split(' ')) v.add(x);
  for (const a of ORG) for (const w of a.slice(1)) for (const x of w.split(' ')) v.add(x);
  for (const g of GDS) for (const w of g[2]) v.add(w);
  vocabCache = v;
  return v;
}

const matchCountry = (s: string) => {
  for (const a of CTY) for (const w of a.slice(1)) if (s.includes(` ${w}`)) return a[0];
  return null;
};
const matchOrigin = (s: string) => {
  const m = s.match(/from ([a-zü\- ]+)/);
  if (!m) return null;
  const seg = ` ${m[1]}`;
  for (const a of ORG) for (const w of a.slice(1)) if (seg.includes(` ${w}`)) return a[0];
  return null;
};
const matchType = (s: string) =>
  /import/.test(s) ? 'import' : /export/.test(s) ? 'export' : /transit/.test(s) ? 'transit' : null;

function matchPeriod(s: string): PeriodKey | null {
  const since = s.match(/since (march|mar|april|apr|may|june|jun|july|jul|august|aug)/);
  if (since) {
    const key = MONTH_WORDS[since[1]!]!;
    return key === 'm03' ? 'all' : (`f${key.slice(1)}` as PeriodKey);
  }
  if (/last 3 months|past 3 months|three months/.test(s)) return 'f06';
  if (/last month/.test(s)) return 'm07';
  if (/this month/.test(s)) return 'm08';
  if (/q2|second quarter/.test(s)) return 'q2';
  if (/q3|third quarter/.test(s)) return 'f07';
  if (/ytd|year to date|this year/.test(s)) return 'all';
  for (const [w, key] of Object.entries(MONTH_WORDS)) if (s.includes(` ${w}`)) return key;
  return null;
}

const matchGoods = (s: string): GoodsFilter | null => {
  for (const [label, codePattern, words] of GDS) {
    for (const w of words) if (s.includes(w)) return { label, codePattern };
  }
  return null;
};
const matchMetric = (s: string): Metric | null => {
  if (/duty and vat|duty & vat|duty \+ vat|duties and vat|taxes/.test(s)) return 'dutyvat';
  if (/dut(y|ies)/.test(s)) return 'duty';
  if (/\bvat\b|\btax\b/.test(s)) return 'vat';
  if (/value|worth|spend|cost/.test(s)) return 'value';
  if (/how many|count|number of|volume/.test(s)) return 'count';
  return null;
};
const matchGrouping = (s: string) => {
  if (/by country|per country|across countr|which country/.test(s)) return 'country';
  if (/by month|per month|monthly|over time|trend/.test(s)) return 'month';
  if (/commodit|top products|by product|which goods|by goods/.test(s)) return 'commodity';
  if (/by type/.test(s)) return 'type';
  return null;
};

function confidenceOf(t: string, signals: number): Confidence {
  const v = vocab();
  const unused = t
    .trim()
    .split(' ')
    .filter((w) => w.length > 2 && !/^\d/.test(w) && !v.has(w));
  if (unused.length > 0) {
    return {
      low: true,
      message: `Some words were not used in the answer: “${[...new Set(unused)].join(', ')}”. Review the interpretation chips — adjust them if this is not what you meant.`,
    };
  }
  if (signals === 0) {
    return {
      low: true,
      message:
        'This question was too open to interpret confidently — showing total customs value across all data. Adjust the chips to refine.',
    };
  }
  return { low: false, message: '' };
}

/** Requested reports the data cannot produce — the answer is the reason (principle #6). */
const NOT_OFFERED_PATTERNS: [NotOfferedReportId, RegExp][] = [
  ['vat', /\bvat (report|reports|return|returns|reporting)\b/],
  ['mdr', /\bmdr\b|manifest discrepanc/],
  ['mcd', /\bmcd\b|material compliance/],
  ['ec-sales', /\bec sales\b|\besl\b/],
  ['intrastat', /intrastat/],
];

/** The built-in reports by the names people use for them. */
const REPORT_PATTERNS: [RegisterView, RegExp][] = [
  [BUILT_IN_VIEWS[0]!, /declaration summary/],
  [BUILT_IN_VIEWS[1]!, /line overview|goods lines|goods-line|per line|line level|each line|by line/],
  [BUILT_IN_VIEWS[2]!, /order status|declaration status|status report|status of|where .* stand/],
];

/** Verbs that ask for rows rather than a figure. */
const EXTRACT_VERBS = /^ ?(show|list|export|give me|get|pull|download|table of|extract|open)\b.*\bdeclarations?\b/;

const STATUS_WORDS: [DeclarationStatus, RegExp][] = [
  ['Released', /\breleased\b/],
  ['Completed', /\bcompleted\b/],
  ['Amended', /\bamended\b/],
  ['Under customs control', /under (customs )?control/],
];

const LIST_PATTERNS: [Interpretation & { kind: 'list' }, RegExp][] = [
  [{ kind: 'list', list: 'awaiting' }, /awaiting|not yet released|unreleased|stuck|delayed|waiting/],
  [{ kind: 'list', list: 'gaps' }, /\bgap|missing|not populated|unverified|not verified|incomplete/],
  [{ kind: 'list', list: 'stale' }, /refresh|stale|outdated|not updated/],
  [{ kind: 'list', list: 'attention' }, /attention|issue|anomal|risk|review|problem/],
];

function extractOf(t: string, base: RegisterView | null): InterpretedQuestion['interpretation'] & { exact: boolean } {
  const country = matchCountry(t);
  const type = matchType(t);
  const askPeriod = matchPeriod(t);
  const period = askPeriod ? registerPeriodFor(askPeriod) : null;
  const status = STATUS_WORDS.find(([, re]) => re.test(t))?.[0];
  const grain = /goods lines|goods-line|per line|line level|each line|by line/.test(t) ? 'line' : undefined;
  const interp = composeExtract(base, {
    grain,
    period: period?.period,
    country: country ?? undefined,
    type: type ?? undefined,
    status,
    gapsOnly: /\bgap|missing|not populated|unverified|not verified|incomplete/.test(t) || undefined,
  });
  return { ...interp, exact: period?.exact ?? true };
}

function extractQuestion(question: string, t: string, base: RegisterView | null): InterpretedQuestion {
  const { exact, ...interpretation } = extractOf(t, base);
  const confidence = confidenceOf(t, 2);
  if (!exact) {
    return {
      question,
      interpretation,
      confidence: {
        low: true,
        message:
          'The register’s date ranges are this month, the last 3 months, the last 6 months and year to date — the smallest one covering the period asked for is shown. Adjust it above if that is not what you meant.' +
          (confidence.low ? ` ${confidence.message}` : ''),
      },
    };
  }
  return { question, interpretation, confidence };
}

export function interpretQuestion(question: string): InterpretedQuestion {
  const t = ` ${question.toLowerCase().replace(/[?.,!;:]/g, ' ').replace(/\s+/g, ' ')} `;

  for (const [report, re] of NOT_OFFERED_PATTERNS) {
    if (re.test(t)) return { question, interpretation: { kind: 'unsupported', report }, confidence: { low: false, message: '' } };
  }

  // A report by name is an extract with a known interpretation.
  for (const [view, re] of REPORT_PATTERNS) {
    if (re.test(t)) return extractQuestion(question, t, view);
  }

  for (const [interp, re] of LIST_PATTERNS) {
    if (re.test(t)) return { question, interpretation: interp, confidence: confidenceOf(t, 2) };
  }

  // Rows asked for without naming a report start from the Declaration Summary.
  if (EXTRACT_VERBS.test(t) || /\breport\b/.test(t)) return extractQuestion(question, t, null);

  if (/\bvs\b|\bversus\b| compare /.test(t)) {
    const cmp = parseCompare(t);
    if (cmp) return { question, interpretation: cmp, confidence: confidenceOf(t, 2) };
  }

  const metric = matchMetric(t);
  const grouping = matchGrouping(t);
  const country = matchCountry(t);
  const type = matchType(t);
  const period = matchPeriod(t);
  const goods = matchGoods(t);
  const origin = matchOrigin(t);
  const interpretation: AggregateInterpretation = {
    kind: 'aggregate',
    metric: metric ?? 'value',
    period: period ?? 'all',
    country: country ?? 'all',
    type: type ?? 'all',
    grouping: grouping ?? 'none',
    goods,
    originCountry: origin,
  };
  const signals = [metric, grouping, country, type, period, goods, origin].filter(Boolean).length;
  return { question, interpretation, confidence: confidenceOf(t, signals) };
}

function parseCompare(t: string): Interpretation | null {
  const metric = matchMetric(t) ?? 'value';
  const sides = t.split(/\bvs\b|\bversus\b/);
  if (sides.length !== 2) return null;
  const side = (raw: string): { f: CompareField; v: string } | null => {
    const s = ` ${raw} `;
    const ty = matchType(s);
    if (ty) return { f: 'type', v: ty };
    const c = matchCountry(s);
    if (c) return { f: 'country', v: c };
    const p = matchPeriod(s);
    if (p) return { f: 'period', v: p };
    return null;
  };
  const a = side(sides[0]!);
  const b = side(sides[1]!);
  if (!a || !b || a.f !== b.f) return null;
  const base: AggregateInterpretation = {
    kind: 'aggregate',
    metric,
    period: a.f === 'period' ? 'all' : (matchPeriod(t) ?? 'all'),
    country: 'all',
    type: 'all',
    grouping: 'none',
    goods: matchGoods(t),
    originCountry: matchOrigin(t),
  };
  return { kind: 'compare', field: a.f, a: a.v, b: b.v, base };
}

export class MockAskEngine implements AskEngine {
  interpret(question: string): Promise<InterpretedQuestion> {
    return new Promise((resolve) => setTimeout(() => resolve(interpretQuestion(question)), 500));
  }
}
