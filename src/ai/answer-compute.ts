import { hasDataGap, typeLabel, type Declaration, type GoodsLine } from '../domain/declaration';
import { countryName } from '../domain/countries';
import { daysBetween, formatIsoDate, monthLabel } from '../domain/dates';
import { eurEquivalentMinor, formatCount, formatEurMinor } from '../domain/money';
import {
  METRIC_LABEL,
  PERIODS,
  type AggregateInterpretation,
  type CompareInterpretation,
  type ComputedInterpretation,
  type Grouping,
  type ListInterpretation,
  type ListKind,
  type Metric,
} from './ask-types';

/**
 * Deterministic answer computation. Pure functions over declaration data —
 * no model involved. In production this runs server-side over SQL
 * (POST /ask/compute); the logic is identical.
 */
export interface BreakdownRow {
  label: string;
  valueLabel: string;
  widthPct: number;
  shareLabel: string;
}

export interface AggregateAnswer {
  kind: 'aggregate';
  headline: string;
  subline: string;
  count: number;
  rows: BreakdownRow[];
  rowsTitle: string;
  /** States the denominator when the breakdown is capped; null when every group is shown. */
  rowsNote: string | null;
  note: string;
  evidenceMrns: string[];
}

export interface CompareSide {
  label: string;
  valueLabel: string;
  widthPct: number;
  subline: string;
}

export interface CompareAnswer {
  kind: 'compare';
  interpText: string;
  a: CompareSide;
  b: CompareSide;
  deltaText: string;
  count: number;
  note: string;
  evidenceMrns: string[];
}

export interface ListAnswerRow {
  mrn: string;
  date: string;
  country: string;
  reason: string;
  valueLabel: string;
}

export interface ListAnswer {
  kind: 'list';
  interpText: string;
  headline: string;
  rows: ListAnswerRow[];
  count: number;
  note: string;
  evidenceMrns: string[];
}

export type Answer = AggregateAnswer | CompareAnswer | ListAnswer;

const EUR_NOTE = 'EUR equivalents use the rate declared on each declaration';

function lineMetricEurMinor(l: GoodsLine, d: Declaration, m: Metric): number {
  const fx = d.declaredFxToEur;
  if (m === 'duty') return eurEquivalentMinor(l.dutyAmount, fx);
  if (m === 'vat') return eurEquivalentMinor(l.vatAmount, fx);
  if (m === 'dutyvat') return eurEquivalentMinor(l.dutyAmount, fx) + eurEquivalentMinor(l.vatAmount, fx);
  return eurEquivalentMinor(l.customsValue, fx);
}

/** Size-ranked breakdowns are capped at this many rows; the remainder is then stated. */
const BREAKDOWN_LIMIT = 10;

const GROUP_NOUN: Record<Exclude<Grouping, 'none'>, string> = {
  country: 'countries',
  month: 'months',
  commodity: 'commodities',
  type: 'declaration types',
};

function effectiveGrouping(i: AggregateInterpretation): Exclude<AggregateInterpretation['grouping'], 'none'> {
  if (i.grouping !== 'none') return i.grouping;
  return i.country === 'all' ? 'country' : 'month';
}

export function computeAggregate(i: AggregateInterpretation, decls: Declaration[]): AggregateAnswer {
  const period = PERIODS[i.period];
  const goodsRe = i.goods ? new RegExp(i.goods.codePattern) : null;
  const grp = effectiveGrouping(i);
  let total = 0;
  const mrns: string[] = [];
  const groups = new Map<string, number>();

  for (const d of decls) {
    if (d.clearanceDate < period.from || d.clearanceDate > period.to) continue;
    if (i.country !== 'all' && d.countryCode !== i.country) continue;
    if (i.type !== 'all' && d.type !== i.type) continue;
    const lines = d.lines.filter(
      (l) =>
        (!goodsRe || goodsRe.test(l.commodityCode.replace(/\s/g, ''))) &&
        (!i.originCountry || l.originCountry === i.originCountry),
    );
    if (lines.length === 0) continue;
    mrns.push(d.mrn);
    const declValue =
      i.metric === 'count' ? 1 : lines.reduce((s, l) => s + lineMetricEurMinor(l, d, i.metric), 0);
    total += declValue;
    if (grp === 'commodity') {
      for (const l of lines) {
        const v = i.metric === 'count' ? 1 : lineMetricEurMinor(l, d, i.metric);
        groups.set(l.description, (groups.get(l.description) ?? 0) + v);
      }
    } else {
      const key = grp === 'country' ? d.countryName : grp === 'month' ? d.clearanceDate.slice(5, 7) : d.type;
      groups.set(key, (groups.get(key) ?? 0) + declValue);
    }
  }

  const entries = [...groups.entries()];
  if (grp === 'month') entries.sort((a, b) => a[0].localeCompare(b[0]));
  else entries.sort((a, b) => b[1] - a[1]);
  // A month breakdown is a time axis — every month in the period is shown, in order.
  // Size-ranked breakdowns are capped, and what the cap left out is stated below them,
  // so the rows always reconcile to the headline total (principles #3 and #4).
  const shown = grp === 'month' ? entries : entries.slice(0, BREAKDOWN_LIMIT);
  const omitted = entries.slice(shown.length);
  const max = Math.max(1, ...shown.map(([, v]) => v));
  const fmt = (v: number) => (i.metric === 'count' ? formatCount(Math.round(v)) : formatEurMinor(v));
  const rows: BreakdownRow[] = shown.map(([k, v]) => ({
    label: grp === 'month' ? `${monthLabel(k)} 2026` : grp === 'type' ? typeLabel(k as Declaration['type']) : k,
    valueLabel: fmt(v),
    // Deliberately not rounded: a small but real value must not become a zero-width mark.
    widthPct: (v / max) * 100,
    shareLabel: total > 0 ? `· ${Math.round((v / total) * 100)}%` : '',
  }));
  const omittedTotal = omitted.reduce((s, [, v]) => s + v, 0);
  const rowsNote =
    omitted.length === 0
      ? null
      : `Showing the ${shown.length} largest of ${entries.length} ${GROUP_NOUN[grp]}. The remaining ` +
        `${omitted.length} account for ${fmt(omittedTotal)}` +
        (total > 0 ? ` (${Math.round((omittedTotal / total) * 100)}%)` : '') +
        ' and are included in the total above.';

  return {
    kind: 'aggregate',
    headline: i.metric === 'count' ? `${formatCount(mrns.length)} declarations` : formatEurMinor(total),
    subline:
      (i.metric === 'count' ? '' : `Across ${mrns.length} declarations · `) +
      `${METRIC_LABEL[i.metric]} · ${period.label}` +
      (i.metric === 'count' ? '' : ' · EUR equivalent'),
    count: mrns.length,
    rows,
    rowsTitle: `Breakdown by ${grp === 'month' ? 'month' : grp} (computed)`,
    rowsNote,
    note: i.metric === 'count' ? 'Counts are exact — no conversion applied' : EUR_NOTE,
    evidenceMrns: mrns,
  };
}

interface SideTotals {
  totalEurMinor: number;
  n: number;
  mrns: string[];
}

function sideTotals(i: CompareInterpretation, v: string, decls: Declaration[]): SideTotals {
  const it: AggregateInterpretation = { ...i.base, grouping: 'none' };
  if (i.field === 'period') it.period = v as AggregateInterpretation['period'];
  else if (i.field === 'country') it.country = v;
  else it.type = v as AggregateInterpretation['type'];
  const p = PERIODS[it.period];
  const goodsRe = it.goods ? new RegExp(it.goods.codePattern) : null;
  let total = 0;
  const mrns: string[] = [];
  for (const d of decls) {
    if (d.clearanceDate < p.from || d.clearanceDate > p.to) continue;
    if (it.country !== 'all' && d.countryCode !== it.country) continue;
    if (it.type !== 'all' && d.type !== it.type) continue;
    const lines = d.lines.filter(
      (l) =>
        (!goodsRe || goodsRe.test(l.commodityCode.replace(/\s/g, ''))) &&
        (!it.originCountry || l.originCountry === it.originCountry),
    );
    if (!lines.length) continue;
    mrns.push(d.mrn);
    total += it.metric === 'count' ? 1 : lines.reduce((s, l) => s + lineMetricEurMinor(l, d, it.metric), 0);
  }
  return { totalEurMinor: total, n: mrns.length, mrns };
}

export function computeCompare(i: CompareInterpretation, decls: Declaration[]): CompareAnswer {
  const label = (v: string): string =>
    i.field === 'period'
      ? PERIODS[v as keyof typeof PERIODS].label
      : i.field === 'country'
        ? countryName(v)
        : { import: 'Imports', export: 'Exports', transit: 'Transit' }[v] ?? v;

  const ra = sideTotals(i, i.a, decls);
  const rb = sideTotals(i, i.b, decls);
  const max = Math.max(1, ra.totalEurMinor, rb.totalEurMinor);
  const fmt = (v: number) =>
    i.base.metric === 'count' ? `${formatCount(Math.round(v))} declarations` : formatEurMinor(v);

  // The delta carries no direction of merit — a larger customs value or duty bill is
  // neither good nor bad — so it is stated, never coloured or judged (principle #5).
  let deltaText: string;
  if (ra.totalEurMinor > 0) {
    const pct = ((rb.totalEurMinor - ra.totalEurMinor) / ra.totalEurMinor) * 100;
    deltaText = `${label(i.b)} vs ${label(i.a)}: ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% (${METRIC_LABEL[i.base.metric]}, EUR equivalent)`;
  } else {
    deltaText = `No ${METRIC_LABEL[i.base.metric].toLowerCase()} in ${label(i.a)} — comparison shown as absolute values.`;
  }

  return {
    kind: 'compare',
    interpText: `Comparing ${METRIC_LABEL[i.base.metric].toLowerCase()}: ${label(i.a)} vs ${label(i.b)}`,
    a: { label: label(i.a), valueLabel: fmt(ra.totalEurMinor), widthPct: (ra.totalEurMinor / max) * 100, subline: `${ra.n} declarations` },
    b: { label: label(i.b), valueLabel: fmt(rb.totalEurMinor), widthPct: (rb.totalEurMinor / max) * 100, subline: `${rb.n} declarations` },
    deltaText,
    count: ra.n + rb.n,
    note: EUR_NOTE,
    evidenceMrns: [...ra.mrns, ...rb.mrns],
  };
}

const LIST_TITLES: Record<ListKind, string> = {
  awaiting: 'declarations awaiting release',
  gaps: 'declarations with data gaps',
  stale: 'declarations not refreshed in the latest update',
  attention: 'declarations flagged for attention',
};

export function computeList(i: ListInterpretation, decls: Declaration[], asOf: string): ListAnswer {
  let matched: Declaration[];
  let reason: (d: Declaration) => string;
  switch (i.list) {
    case 'awaiting':
      matched = decls.filter((d) => d.status === 'Awaiting release');
      reason = (d) => `Submitted ${daysBetween(d.clearanceDate, asOf)} days ago — not yet released`;
      break;
    case 'gaps':
      matched = decls.filter(hasDataGap);
      reason = (d) =>
        d.assurance.missing.length > 0
          ? d.assurance.missing[0]!.field
          : 'Values not yet compared with source record';
      break;
    case 'stale':
      matched = decls.filter((d) => !d.assurance.lastUpdatedAt.startsWith(asOf));
      reason = (d) => `Last updated ${d.assurance.lastUpdatedAt.slice(0, 10)} — updates expected daily`;
      break;
    case 'attention':
      matched = decls.filter((d) => d.attention !== null);
      reason = (d) => `${d.attention!.issue} — ${d.attention!.detail}`;
      break;
  }
  return {
    kind: 'list',
    interpText: `Listing ${LIST_TITLES[i.list]} — a rule-based check, not a judgement`,
    headline: `${matched.length} ${LIST_TITLES[i.list]}`,
    rows: matched.map((d) => ({
      mrn: d.mrn,
      date: formatIsoDate(d.clearanceDate),
      country: d.countryName,
      reason: reason(d),
      valueLabel: formatEurMinor(eurEquivalentMinor(d.customsValueTotal, d.declaredFxToEur)),
    })),
    count: matched.length,
    note: 'Flags come from deterministic data checks',
    evidenceMrns: matched.map((d) => d.mrn),
  };
}

export function computeAnswer(i: ComputedInterpretation, decls: Declaration[], asOf: string): Answer {
  if (i.kind === 'aggregate') return computeAggregate(i, decls);
  if (i.kind === 'compare') return computeCompare(i, decls);
  return computeList(i, decls, asOf);
}
