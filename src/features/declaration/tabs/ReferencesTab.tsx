import type { Declaration } from '../../../domain/declaration';
import { FieldStateChip, Term } from '../../../components/FieldDisplay';
import { Card, KVGrid } from '../KV';
import { additionalRefs } from '../derived';
import styles from '../declaration.module.css';

/**
 * Due-diligence statements and supporting-document references are not part of
 * the declaration feed (see contracts/openapi.yaml). Principle #1: until the
 * source supplies them they are shown as "Not available" — never invented.
 */
export function ReferencesTab({ d }: { d: Declaration }) {
  const extra = additionalRefs(d);
  return (
    <div className={styles.twoCol}>
      <Card title="References">
        <KVGrid
          rows={[
            ['MRN', <span className="mono">{d.mrn}</span>],
            ['Declaration number', <span className="mono">{d.declarationNumber}</span>],
            ['Customer reference', <span className="mono">{d.customerReference}</span>],
            [
              <Term help="Unique Consignment Reference — a trader-assigned reference linking the declaration to your records.">
                UCR
              </Term>,
              <span className="mono">{d.ucr}</span>,
            ],
            [
              'Additional references',
              extra !== null ? <span className="mono">{extra}</span> : <FieldStateChip state="not-applicable" />,
            ],
            ['Due-diligence statement', <FieldStateChip state="not-available" />],
          ]}
        />
      </Card>
      <Card title="Document references">
        <KVGrid
          rows={[
            ['Commercial invoice', <FieldStateChip state="not-available" />],
            ['Packing list', <FieldStateChip state="not-available" />],
            ['Transport document', <FieldStateChip state="not-available" />],
          ]}
        />
        <div className={styles.footnote}>
          Supporting-document references are not yet supplied by the declaration feed. Original
          declaration documents are not stored in Customs Insights.
        </div>
      </Card>
    </div>
  );
}
