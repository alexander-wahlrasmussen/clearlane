import { useMemo } from 'react';
import type { Declaration } from '../../domain/declaration';
import { countryName } from '../../domain/countries';
import { useScope } from '../../api/queries';
import { computeAnswer } from '../../ai/answer-compute';
import { isComputed, type AggregateInterpretation, type Grouping, type Metric, type PeriodKey } from '../../ai/ask-types';
import { notOfferedReport, type NotOfferedReportId } from '../../domain/reports-not-offered';
import { useAskSession, type AskCard } from './ask-session';
import { ExtractAnswer } from './ExtractAnswer';
import styles from './ask.module.css';

const PERIOD_OPTIONS: [PeriodKey, string][] = [
  ['all', 'All available (Mar–Aug)'],
  ['f04', 'Since Apr'],
  ['f05', 'Since May'],
  ['f06', 'Since Jun (last 3 months)'],
  ['f07', 'Since Jul (Q3 to date)'],
  ['q2', 'Q2 (Apr–Jun)'],
  ['m08', 'Aug 2026'],
  ['m07', 'Jul 2026'],
  ['m06', 'Jun 2026'],
  ['m05', 'May 2026'],
  ['m04', 'Apr 2026'],
  ['m03', 'Mar 2026'],
];

const METRIC_OPTIONS: [Metric, string][] = [
  ['value', 'Customs value'],
  ['duty', 'Duty'],
  ['vat', 'VAT'],
  ['dutyvat', 'Duty + VAT'],
  ['count', 'Declaration count'],
];

const GROUPING_OPTIONS: [Grouping, string][] = [
  ['none', 'Total only'],
  ['country', 'By country'],
  ['month', 'By month'],
  ['commodity', 'By commodity'],
  ['type', 'By type'],
];

function InterpretationChips(props: { cardId: number; interp: AggregateInterpretation }) {
  const session = useAskSession();
  const scope = useScope();
  const { interp, cardId } = props;
  const set = (patch: Partial<AggregateInterpretation>) =>
    session.setInterpretation(cardId, { ...interp, ...patch });
  return (
    <>
      <select
        className={styles.interpSelect}
        aria-label="Metric"
        value={interp.metric}
        onChange={(e) => set({ metric: e.target.value as Metric })}
      >
        {METRIC_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <select
        className={styles.interpSelect}
        aria-label="Period"
        value={interp.period}
        onChange={(e) => set({ period: e.target.value as PeriodKey })}
      >
        {PERIOD_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <select
        className={styles.interpSelect}
        aria-label="Declaration country"
        value={interp.country}
        onChange={(e) => set({ country: e.target.value })}
      >
        <option value="all">All countries</option>
        {scope.data?.countries.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
      <select
        className={styles.interpSelect}
        aria-label="Declaration type"
        value={interp.type}
        onChange={(e) => set({ type: e.target.value as AggregateInterpretation['type'] })}
      >
        <option value="all">All types</option>
        <option value="import">Imports</option>
        <option value="export">Exports</option>
        <option value="transit">Transit</option>
      </select>
      <select
        className={styles.interpSelect}
        aria-label="Breakdown"
        value={interp.grouping}
        onChange={(e) => set({ grouping: e.target.value as Grouping })}
      >
        {GROUPING_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      {interp.goods && (
        <span className={styles.interpChip}>
          Goods: {interp.goods.label}
          <button type="button" title="Remove goods filter" className={styles.interpChipX} onClick={() => set({ goods: null })}>
            ✕
          </button>
        </span>
      )}
      {interp.originCountry && (
        <span className={styles.interpChip}>
          Origin: {countryName(interp.originCountry)}
          <button type="button" title="Remove origin filter" className={styles.interpChipX} onClick={() => set({ originCountry: null })}>
            ✕
          </button>
        </span>
      )}
    </>
  );
}

/**
 * The answer to a request for a report the data cannot produce is the reason,
 * stated plainly — no figures, no evidence list, nothing to add to a draft.
 */
function UnsupportedAnswer(props: { report: NotOfferedReportId }) {
  const r = notOfferedReport(props.report);
  return (
    <>
      <div className={styles.interpBar}>
        <span className={styles.interpLabel}>Understood as</span>
        <span className={styles.interpText}>A request for {r.name}</span>
        <span className={styles.interpSpacer} />
        <span className={styles.cannotChip}>Cannot be produced from declaration data</span>
      </div>
      <div className={styles.answerBody}>
        <div className={styles.unsupportedTitle}>This report is not offered here</div>
        <p className={styles.unsupportedText}>{r.reason}</p>
      </div>
      <div className={styles.answerFoot}>
        <span>
          No figures were computed. The reports the declaration data does produce are Declaration
          Summary, Declaration Line Overview and Order/Declaration status — ask for one by name.
        </span>
      </div>
    </>
  );
}

export function AnswerCard(props: { card: AskCard; decls: Declaration[]; asOf: string }) {
  const session = useAskSession();
  const { card } = props;
  const interpreted = card.interpreted;
  const interp = interpreted?.interpretation;
  const answer = useMemo(
    () => (interp && isComputed(interp) ? computeAnswer(interp, props.decls, props.asOf) : null),
    [interp, props.decls, props.asOf],
  );
  const unsupported = interp?.kind === 'unsupported';

  return (
    <div className={styles.answerCard}>
      <div className={styles.answerHead}>
        <div className={styles.answerQ}>“{card.question}”</div>
        <button
          type="button"
          className={card.inReport ? styles.repBtnOn : styles.repBtn}
          disabled={unsupported}
          title={unsupported ? 'Nothing to add — the data cannot support this report' : undefined}
          onClick={() => session.toggleReport(card.id)}
        >
          {card.inReport ? '✓ In report' : '+ Add to report'}
        </button>
        <button type="button" title="Remove answer" className={styles.cardX} onClick={() => session.removeCard(card.id)}>
          ✕
        </button>
      </div>

      {card.pending && (
        <div className={styles.pendingRow}>
          <div className={styles.pendingSpinner} />
          <span className={styles.pendingText}>
            Interpreting your question and computing from source data…
          </span>
        </div>
      )}

      {card.failed && (
        <div className={styles.failedRow}>
          The question could not be interpreted right now. Your data is unchanged — please try
          again.
        </div>
      )}

      {interp?.kind === 'unsupported' && <UnsupportedAnswer report={interp.report} />}
      {interpreted && interp?.kind === 'extract' && (
        <ExtractAnswer cardId={card.id} interp={interp} confidence={interpreted.confidence} />
      )}

      {interpreted && answer && (
        <>
          <div className={styles.interpBar}>
            <span className={styles.interpLabel}>Understood as</span>
            {interp?.kind === 'aggregate' ? (
              <InterpretationChips cardId={card.id} interp={interp} />
            ) : (
              <span className={styles.interpText}>
                {answer.kind !== 'aggregate' ? answer.interpText : ''}
              </span>
            )}
            <span className={styles.interpSpacer} />
            <span className={styles.computedChip}>✓ Computed from source data</span>
            {interpreted.confidence.low && <span className={styles.checkChip}>Check interpretation</span>}
          </div>
          {interpreted.confidence.low && (
            <div className={styles.confBanner}>{interpreted.confidence.message}</div>
          )}

          <div className={styles.answerBody}>
            {answer.kind === 'aggregate' &&
              (answer.count === 0 ? (
                <div className={styles.answerEmpty}>
                  No declarations match this interpretation. Adjust the filters above — data begins
                  1 March 2026.
                </div>
              ) : (
                <>
                  <div className={`${styles.headline} num`}>{answer.headline}</div>
                  <div className={styles.subline}>{answer.subline}</div>
                  {answer.rows.length > 1 && (
                    <>
                      <table className={styles.breakdown}>
                        <caption className={styles.breakdownCaption}>{answer.rowsTitle}</caption>
                        <tbody>
                          {answer.rows.map((r) => (
                            <tr key={r.label}>
                              <th scope="row" className={styles.rowLabel} title={r.label}>
                                {r.label}
                              </th>
                              <td className={styles.barCell}>
                                {/* Decorative: the value it depicts is in the cell beside it. */}
                                <div className={styles.bar} aria-hidden="true">
                                  {r.widthPct > 0 && (
                                    <div className={styles.barFill} style={{ width: `${r.widthPct}%` }} />
                                  )}
                                </div>
                              </td>
                              <td className={`${styles.rowValue} num`}>
                                {r.valueLabel} <span className={styles.rowShare}>{r.shareLabel}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {answer.rowsNote && <div className={styles.rowsNote}>{answer.rowsNote}</div>}
                    </>
                  )}
                </>
              ))}

            {answer.kind === 'compare' && (
              <>
                <div className={styles.cmpGrid}>
                  {[answer.a, answer.b].map((side, i) => (
                    <div key={side.label}>
                      <div className={styles.cmpLabel}>{side.label}</div>
                      <div className={`${styles.cmpValue} num`}>{side.valueLabel}</div>
                      <div className={styles.bar} style={{ marginTop: 8 }} aria-hidden="true">
                        {side.widthPct > 0 && (
                          <div
                            className={i === 0 ? styles.barFill : styles.barFillCompare}
                            style={{ width: `${side.widthPct}%` }}
                          />
                        )}
                      </div>
                      <div className={styles.cmpSub}>{side.subline}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.delta}>{answer.deltaText}</div>
              </>
            )}

            {answer.kind === 'list' && (
              <>
                <div className={styles.listHead}>{answer.headline}</div>
                <div className={styles.listTableWrap}>
                  <table className={styles.listTable}>
                    <thead>
                      <tr>
                        <th>MRN</th>
                        <th>Date</th>
                        <th>Country</th>
                        <th>Why it is listed</th>
                        <th data-align="right">Customs value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {answer.rows.map((r) => (
                        <tr
                          key={r.mrn}
                          className={styles.listRow}
                          tabIndex={0}
                          onClick={() => session.openDrawer(r.mrn)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') session.openDrawer(r.mrn);
                          }}
                        >
                          <td className="mono">{r.mrn}</td>
                          <td className="num">{r.date}</td>
                          <td>{r.country}</td>
                          <td className={styles.listReason}>{r.reason}</td>
                          <td data-align="right" className="num">{r.valueLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className={styles.answerFoot}>
            <span>
              Computed from <strong>{answer.count}</strong> declarations
            </span>
            <button
              type="button"
              className={styles.evidenceLink}
              onClick={() =>
                session.openEvidence({ title: card.question, mrns: [...new Set(answer.evidenceMrns)] })
              }
            >
              View underlying declarations →
            </button>
            <span className={styles.interpSpacer} />
            <span>{answer.note}</span>
          </div>
        </>
      )}
    </div>
  );
}
