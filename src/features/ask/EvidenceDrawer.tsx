import { useNavigate } from '@tanstack/react-router';
import { useAllDeclarations } from '../../api/queries';
import { STATUS_DOT, typeLabel } from '../../domain/declaration';
import { formatIsoDate } from '../../domain/dates';
import { eurEquivalentMinor, formatEurMinor } from '../../domain/money';
import { useAskSession } from './ask-session';
import styles from './ask.module.css';

/** Principle #6: every answer lists the exact declarations it was computed from. */
export function EvidenceDrawer() {
  const session = useAskSession();
  const navigate = useNavigate();
  const decls = useAllDeclarations({}, session.evidence !== null);
  if (!session.evidence) return null;
  const { title, mrns } = session.evidence;
  const rows = (decls.data ?? [])
    .filter((d) => mrns.includes(d.mrn))
    .sort((a, b) => b.clearanceDate.localeCompare(a.clearanceDate));

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={session.closeEvidence} />
      <div className={styles.drawer} data-screen-label="Underlying declarations" role="dialog" aria-label="Underlying declarations">
        <div className={styles.drawerHead}>
          <div className={styles.drawerHeadText}>
            <div className={styles.drawerKicker}>Underlying declarations</div>
            <div className={styles.drawerTitle}>“{title}”</div>
            <div className={styles.drawerSub}>
              {mrns.length} declarations were used to compute this answer — every one is listed.
            </div>
          </div>
          <button type="button" title="Close" className={styles.cardX} onClick={session.closeEvidence}>
            ✕
          </button>
        </div>
        <div className={styles.drawerBody}>
          {rows.map((d) => (
            <button
              key={d.mrn}
              type="button"
              className={styles.evidenceRow}
              onClick={() => session.openDrawer(d.mrn)}
            >
              <span className={styles.briefDot} style={{ background: STATUS_DOT[d.status] }} />
              <span className={styles.evidenceMain}>
                <span className="mono">{d.mrn}</span>
                <span className={styles.evidenceMeta}>
                  {formatIsoDate(d.clearanceDate)} · {d.countryName} · {typeLabel(d.type)} · {d.status}
                </span>
              </span>
              <span className={`${styles.evidenceVal} num`}>
                {formatEurMinor(eurEquivalentMinor(d.customsValueTotal, d.declaredFxToEur))}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.drawerFoot}>
          <button
            type="button"
            className={styles.drawerAction}
            onClick={() => {
              session.setHandoff(session.evidence);
              session.closeEvidence();
              void navigate({ to: '/ai/declarations' });
            }}
          >
            Open these in the Declarations tab →
          </button>
        </div>
      </div>
    </>
  );
}
