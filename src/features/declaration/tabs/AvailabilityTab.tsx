import type { Declaration } from '../../../domain/declaration';
import { formatUtcTimestamp } from '../../../domain/dates';
import { useToast } from '../../../app/ToastContext';
import { useScope } from '../../../api/queries';
import { Card, KVGrid } from '../KV';
import styles from '../declaration.module.css';

export function AvailabilityTab({ d }: { d: Declaration }) {
  const toast = useToast();
  const scope = useScope();
  const a = d.assurance;
  // Stale = not touched by the most recent refresh, as the data scope reports it.
  const refreshedDay = scope.data?.refreshedAt.slice(0, 10);
  const stale = refreshedDay !== undefined && !a.lastUpdatedAt.startsWith(refreshedDay);
  const verified = a.verification === 'Verified';
  const clean = a.missing.length === 0 && verified;

  return (
    <div className={styles.twoCol}>
      <Card title="Availability and freshness">
        <KVGrid
          labelWidth={210}
          rows={[
            [
              'In Customs Insights',
              a.includedInInsights
                ? `Yes — received from the ${d.countryName} customs filing`
                : `No — received from the ${d.countryName} customs filing but not included in figures`,
            ],
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
