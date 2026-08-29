import { useState } from 'react';
import type { DataScope } from '../../api/declarations-client';
import { formatIsoDateFull, formatUtcTimestamp } from '../../domain/dates';
import { useToast } from '../../app/ToastContext';
import styles from './register.module.css';

/** Principle #3: data scope is always visible — in the UI, not buried in docs. */
export function DataScopePanel(props: { scope: DataScope }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const { scope } = props;
  return (
    <>
      <div className={styles.scopeBar}>
        <div className={styles.scopeTitle}>Data scope</div>
        <div className={styles.scopeSummary}>
          Declarations from <strong>{formatIsoDateFull(scope.availableFrom)}</strong> ·{' '}
          <strong>{scope.countries.length} countries</strong> · import, export and transit · last
          refreshed <strong>{formatUtcTimestamp(scope.refreshedAt)}</strong>
        </div>
        <button type="button" className={styles.scopeToggle} onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide details' : 'Details'}
        </button>
      </div>
      {open && (
        <div className={styles.scopeDetails}>
          <div>
            <div className={styles.scopeLabel}>Available period</div>
            <div className={styles.scopeText}>
              {formatIsoDateFull(scope.availableFrom)} – {formatIsoDateFull(scope.availableTo)}.
              Earlier declarations are not yet available in Customs Insights.
            </div>
            <div className={styles.scopeLabel} style={{ marginTop: 12 }}>
              Countries included
            </div>
            <div className={styles.scopeText}>{scope.countries.map((c) => c.name).join(', ')}.</div>
          </div>
          <div>
            <div className={styles.scopeLabel}>Declaration types</div>
            <div className={styles.scopeText}>
              Import, export and transit declarations filed on your behalf.
            </div>
            <div className={styles.scopeLabel} style={{ marginTop: 12 }}>
              Last refreshed
            </div>
            <div className={styles.scopeText}>
              {formatUtcTimestamp(scope.refreshedAt)}. Data is refreshed once per day.
            </div>
          </div>
          <div>
            <div className={styles.scopeLabel}>Known limitations</div>
            <ul className={styles.scopeList}>
              {scope.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <div className={styles.scopeText} style={{ marginTop: 10 }}>
              Missing a declaration you expected?{' '}
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  toast('Not part of this prototype');
                }}
              >
                Contact your customs service team
              </a>
              .
            </div>
          </div>
        </div>
      )}
    </>
  );
}
