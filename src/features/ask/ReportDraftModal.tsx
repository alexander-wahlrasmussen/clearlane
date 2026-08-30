import { useQueries } from '@tanstack/react-query';
import { queryKeys, useAllDeclarations, useDeclarationsClient, useScope } from '../../api/queries';
import type { ExtractInterpretation } from '../../ai/ask-types';
import { useEntityFilter, useEntityScope } from '../../app/entity-context';
import { toFilter } from '../register/register-state';
import { useAskSession } from './ask-session';
import { buildReportSections, downloadReportHtml } from './report';
import { useToast } from '../../app/ToastContext';
import styles from './ask.module.css';

export function ReportDraftModal() {
  const session = useAskSession();
  const scope = useScope();
  const client = useDeclarationsClient();
  const [entity] = useEntityFilter();
  const decls = useAllDeclarations(useEntityScope(), session.reportOpen);
  const toast = useToast();

  // An extract's row count comes from the same paged query its card uses, so
  // the draft and the card cannot disagree.
  const extracts = session.cards.flatMap((c) =>
    c.inReport && c.interpreted?.interpretation.kind === 'extract'
      ? [{ id: c.id, interp: c.interpreted.interpretation as ExtractInterpretation }]
      : [],
  );
  const counts = useQueries({
    queries: extracts.map(({ interp }) => {
      const params = { filter: toFilter(interp.view.filter, entity), ...interp.view.sort, page: 1, pageSize: 1 };
      return interp.view.grain === 'declaration'
        ? { queryKey: queryKeys.list(params), queryFn: () => client.listDeclarations(params), enabled: session.reportOpen }
        : { queryKey: queryKeys.lines(params), queryFn: () => client.listGoodsLines(params), enabled: session.reportOpen };
    }),
  });
  if (!session.reportOpen || !decls.data || !scope.data) return null;

  const asOf = scope.data.refreshedAt.slice(0, 10);
  const totals = new Map<number, number>();
  extracts.forEach(({ id }, n) => {
    const total = counts[n]?.data?.total;
    if (total !== undefined) totals.set(id, total);
  });
  const sections = buildReportSections(session.cards, decls.data, asOf, totals);

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
