import { useMemo, useState } from 'react';
import type { Declaration } from '../../domain/declaration';
import { hasDataGap } from '../../domain/declaration';
import { daysBetween, formatUtcTimestamp } from '../../domain/dates';
import { computeAggregate } from '../../ai/answer-compute';
import { useAskSession } from './ask-session';
import styles from './ask.module.css';

interface Brief {
  key: string;
  dot: string;
  title: string;
  detail: string;
  question: string;
}

/** Morning briefing — deterministic observations computed from today's refresh. */
function buildBriefs(decls: Declaration[], asOf: string): Brief[] {
  const out: Brief[] = [];
  const awaiting = decls.filter((d) => d.status === 'Awaiting release');
  if (awaiting.length > 0) {
    const oldest = awaiting.reduce((a, b) => (a.clearanceDate < b.clearanceDate ? a : b));
    out.push({
      key: 'awaiting',
      dot: '#b45309',
      title: `${awaiting.length} declaration${awaiting.length > 1 ? 's' : ''} awaiting release`,
      detail: `Oldest submitted ${daysBetween(oldest.clearanceDate, asOf)} days ago in ${oldest.countryName} (${oldest.mrn}). Release is typically same or next day.`,
      question: 'Declarations awaiting release',
    });
  }
  const gaps = decls.filter(hasDataGap);
  if (gaps.length > 0) {
    out.push({
      key: 'gaps',
      dot: '#b45309',
      title: `${gaps.length} declarations have data gaps`,
      detail: `${gaps.filter((d) => d.assurance.missing.length > 0).length} with a required field not populated or pending verification. Weight-based analyses exclude the affected lines.`,
      question: 'Declarations with data gaps',
    });
  }
  const dutyByCommodity = computeAggregate(
    { kind: 'aggregate', metric: 'duty', period: 'all', country: 'all', type: 'all', grouping: 'commodity', goods: null, originCountry: null },
    decls,
  );
  const top = dutyByCommodity.rows[0];
  if (top && dutyByCommodity.count > 0) {
    out.push({
      key: 'duty-concentration',
      dot: '#2e5fa3',
      title: 'Duty is concentrated in one commodity',
      detail: `“${top.label}” accounts for ${top.shareLabel.replace('· ', '')} of all duty paid since March (${top.valueLabel} of ${dutyByCommodity.headline}).`,
      question: 'Duty by commodity',
    });
  }
  const stale = decls.filter((d) => !d.assurance.lastUpdatedAt.startsWith(asOf));
  if (stale.length > 0) {
    out.push({
      key: 'stale',
      dot: '#b45309',
      title: `${stale.length} declaration${stale.length > 1 ? 's' : ''} missed the latest refresh`,
      detail: `Last updated ${stale[0]!.assurance.lastUpdatedAt.slice(0, 10)} — updates are expected daily. Values shown are from the last successful update.`,
      question: 'Declarations not refreshed',
    });
  }
  return out;
}

export function Briefing(props: { decls: Declaration[]; asOf: string; refreshedAt: string }) {
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const session = useAskSession();
  const briefs = useMemo(() => buildBriefs(props.decls, props.asOf), [props.decls, props.asOf]);
  const visible = briefs.filter((b) => !dismissed[b.key]);
  if (visible.length === 0) return null;
  return (
    <div className={styles.briefing}>
      <div className={styles.briefingHead}>
        <div className={styles.briefingTitle}>Morning briefing</div>
        <div className={styles.briefingMeta}>
          Computed from today's refresh · {formatUtcTimestamp(props.refreshedAt)}
        </div>
      </div>
      <div className={styles.briefGrid}>
        {visible.map((b) => (
          <div key={b.key} className={styles.briefCard}>
            <div className={styles.briefTop}>
              <span className={styles.briefDot} style={{ background: b.dot }} />
              <div className={styles.briefTitle}>{b.title}</div>
              <button
                type="button"
                title="Dismiss"
                className={styles.briefX}
                onClick={() => setDismissed((d) => ({ ...d, [b.key]: true }))}
              >
                ✕
              </button>
            </div>
            <div className={styles.briefDetail}>{b.detail}</div>
            <button type="button" className={styles.briefAsk} onClick={() => session.ask(b.question)}>
              Ask about this →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
