import type { Declaration } from '../../domain/declaration';
import { countryName } from '../../domain/countries';
import { computeAnswer } from '../../ai/answer-compute';
import { METRIC_LABEL, PERIODS } from '../../ai/ask-types';
import { formatIsoDate } from '../../domain/dates';
import type { AskCard } from './ask-session';

export interface ReportSection {
  title: string;
  text: string;
  rows: { label: string; value: string }[];
}

/**
 * Report narrative is generated from the computed figures only. Numbers are
 * never rephrased or rounded differently from the answer cards.
 */
export function buildReportSections(cards: AskCard[], decls: Declaration[], asOf: string): ReportSection[] {
  return cards
    .flatMap((c) => (c.inReport && c.interpreted ? [{ card: c, interpreted: c.interpreted }] : []))
    .reverse()
    .map(({ card: c, interpreted }) => {
      const i = interpreted.interpretation;
      const answer = computeAnswer(i, decls, asOf);
      if (answer.kind === 'aggregate' && i.kind === 'aggregate') {
        const scope = [
          i.country !== 'all' ? countryName(i.country) : 'all countries',
          i.type !== 'all' ? `${i.type}s` : null,
          i.goods ? i.goods.label : null,
          i.originCountry ? `origin ${countryName(i.originCountry)}` : null,
        ]
          .filter(Boolean)
          .join(', ');
        return {
          title: c.question,
          text: `${METRIC_LABEL[i.metric]} for ${scope}, ${PERIODS[i.period].label}: ${answer.headline}, computed from ${answer.count} declarations. EUR equivalents use the conversion rate declared on each declaration.`,
          rows: answer.rows.map((r) => ({ label: r.label, value: r.valueLabel })),
        };
      }
      if (answer.kind === 'compare') {
        return {
          title: c.question,
          text: `${answer.interpText}. ${answer.a.label}: ${answer.a.valueLabel} (${answer.a.subline}); ${answer.b.label}: ${answer.b.valueLabel} (${answer.b.subline}). ${answer.deltaText}.`,
          rows: [
            { label: answer.a.label, value: answer.a.valueLabel },
            { label: answer.b.label, value: answer.b.valueLabel },
          ],
        };
      }
      if (answer.kind === 'list') {
        return {
          title: c.question,
          text: `${answer.headline} as of ${formatIsoDate(asOf)}. Each declaration is listed with the reason it was flagged.`,
          rows: answer.rows.slice(0, 6).map((r) => ({ label: `${r.mrn} · ${r.country}`, value: r.reason })),
        };
      }
      // computeAnswer maps interpretation kind to answer kind, so this is unreachable in practice.
      return {
        title: c.question,
        text: answer.headline,
        rows: answer.rows.map((r) => ({ label: r.label, value: r.valueLabel })),
      };
    });
}

export function downloadReportHtml(sections: ReportSection[], asOf: string): void {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html =
    `<html><head><meta charset="utf-8"><title>Customs Insights report draft</title></head>` +
    `<body style="font-family:sans-serif;max-width:720px;margin:40px auto;">` +
    `<h1>Customs Insights — report draft</h1>` +
    `<p>Compiled ${formatIsoDate(asOf)}. All figures computed from declaration source data.</p>` +
    sections
      .map(
        (s) =>
          `<h2>${esc(s.title)}</h2><p>${esc(s.text)}</p>` +
          `<table border="1" cellpadding="6" cellspacing="0">` +
          s.rows.map((r) => `<tr><td>${esc(r.label)}</td><td align="right">${esc(r.value)}</td></tr>`).join('') +
          `</table>`,
      )
      .join('') +
    `</body></html>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = 'customs-report-draft.html';
  a.click();
  URL.revokeObjectURL(a.href);
}
