import { useAllDeclarations, useScope } from '../../api/queries';
import { useEntityScope } from '../../app/entity-context';
import { useAskSession } from './ask-session';
import { buildReportSections, downloadReportHtml } from './report';
import { useToast } from '../../app/ToastContext';
import styles from './ask.module.css';

export function ReportDraftModal() {
  const session = useAskSession();
  const scope = useScope();
  const decls = useAllDeclarations(useEntityScope(), session.reportOpen);
  const toast = useToast();
  if (!session.reportOpen || !decls.data || !scope.data) return null;

  const asOf = scope.data.refreshedAt.slice(0, 10);
  const sections = buildReportSections(session.cards, decls.data, asOf);

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Report draft">
      <div className={styles.reportModal} data-screen-label="Report draft">
        <div className={styles.reportHead}>
          <div className={styles.reportTitle}>Report draft — compiled from your answers</div>
          <div className={styles.reportSub}>
            Narrative is generated from the computed figures only. Numbers are never rephrased or
            rounded differently from the answer cards.
          </div>
        </div>
        <div className={styles.reportBody}>
          {sections.map((s) => (
            <div key={s.title} className={styles.reportSection}>
              <div className={styles.reportSectionTitle}>{s.title}</div>
              <div className={styles.reportSectionText}>{s.text}</div>
              {s.rows.length > 0 && (
                <div className={styles.reportRows}>
                  {s.rows.map((r) => (
                    <div key={`${r.label}-${r.value}`} className={styles.reportRow}>
                      <div className={styles.reportRowLabel}>{r.label}</div>
                      <div className="num">{r.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className={styles.reportFoot}>
          <button type="button" className={styles.reportClose} onClick={() => session.setReportOpen(false)}>
            Close
          </button>
          <button
            type="button"
            className={styles.reportDl}
            onClick={() => {
              downloadReportHtml(sections, asOf);
              toast('Report draft downloaded');
            }}
          >
            Download draft (HTML)
          </button>
        </div>
      </div>
    </div>
  );
}
