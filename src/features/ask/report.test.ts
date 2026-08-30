import { describe, expect, it } from 'vitest';
import { buildReportSections } from './report';
import type { AskCard } from './ask-session';
import { extractFromView } from '../../ai/extract-view';
import { BUILT_IN_VIEWS } from '../register/views';

const card = (id: number, interpretation: AskCard['interpreted'] extends infer T ? (T extends { interpretation: infer I } ? I : never) : never): AskCard => ({
  id,
  question: `q${id}`,
  pending: false,
  inReport: true,
  failed: false,
  interpreted: { question: `q${id}`, interpretation, confidence: { low: false, message: '' } },
});

describe('buildReportSections', () => {
  it('records an extract’s definition and row count, and never a section for an unsupported report', () => {
    const cards: AskCard[] = [
      card(1, extractFromView(BUILT_IN_VIEWS[1]!)),
      card(2, { kind: 'unsupported', report: 'vat' }),
    ];
    const sections = buildReportSections(cards, [], '2026-08-26', new Map([[1, 1204]]));
    expect(sections).toHaveLength(1);
    expect(sections[0]!.title).toBe('q1');
    expect(sections[0]!.text).toContain('Declaration Line Overview — one row per goods line');
    expect(sections[0]!.text).toContain('1,204 goods lines as of 26 Aug 2026');
    expect(sections[0]!.text).toContain('Commodity code');
    expect(sections[0]!.rows).toEqual([]);
  });

  it('says when an extract’s row count has not been read rather than inventing one', () => {
    const sections = buildReportSections([card(1, extractFromView(BUILT_IN_VIEWS[0]!))], [], '2026-08-26');
    expect(sections[0]!.text).toContain('Row count not yet read');
    expect(sections[0]!.text).not.toMatch(/\d+ declarations as of/);
  });
});
