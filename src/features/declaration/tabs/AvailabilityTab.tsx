import type { Declaration } from '../../../domain/declaration';
import { formatUtcTimestamp } from '../../../domain/dates';
import { useToast } from '../../../app/ToastContext';
import { Card, KVGrid } from '../KV';
import styles from '../declaration.module.css';

export function AvailabilityTab({ d }: { d: Declaration }) {
  const toast = useToast();
  const a = d.assurance;
  const stale = !a.lastUpdatedAt.startsWith('2026-08-26');
  const verified = a.verification === 'Verified';
  const clean = a.missing.length === 0 && verified;

  return (
    <div className={styles.twoCol}>
      <Card title="Availability and freshness">
        <KVGrid
          labelWidth={210}
          rows={[
            ['In Customs Insights', `Yes — received from the ${d.countryName} customs filing`],
            ['Received', <span className="num">{formatUtcTimestamp(a.receivedAt)}</span>],
            ['Processed', <span className="num">{formatUtcTimestamp(a.processedAt)}</span>],
            [
              'Last update',
              <span className={`num ${stale ? styles.staleValue : ''}`}>
                {formatUtcTimestamp(a.lastUpdatedAt)}
              </span>,
            ],
            [
              'Source comparison',
              verified ? (
                <span className={styles.verifiedChip}>✓ Compared with source record</span>
              ) : (
                <span className={styles.unverifiedChip}>Not yet compared with source record</span>
              ),
            ],
          ]}
        />
        {stale && (
          <div className={styles.staleBox}>
            This declaration was not updated in the most recent refresh. Values shown are from the
            last successful update.
          </div>
        )}
      </Card>
      <Card title="Fields not available or not verified">
        {clean ? (
          <div className={styles.cleanNote}>
            All required fields on this declaration are populated, and its values have been compared
            with the source record.
          </div>
        ) : (
          a.missing.map((m) => (
            <div key={m.field} className={styles.missingBox}>
              <div className={styles.missingField}>{m.field}</div>
              <div className={styles.missingImpact}>{m.impact}</div>
            </div>
          ))
        )}
        <div className={styles.footnote}>
          Believe something is missing or incorrect?{' '}
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
      </Card>
    </div>
  );
}
