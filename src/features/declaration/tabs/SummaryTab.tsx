import type { Declaration } from '../../../domain/declaration';
import { typeLabel } from '../../../domain/declaration';
import { countryLabel } from '../../../domain/countries';
import { formatIsoDate } from '../../../domain/dates';
import { formatCount, formatMoney } from '../../../domain/money';
import { reconcile } from '../../../domain/reconciliation';
import { Term } from '../../../components/FieldDisplay';
import { Card, KVGrid } from '../KV';
import styles from '../declaration.module.css';

export function SummaryTab({ d }: { d: Declaration }) {
  const recon = reconcile(d);
  return (
    <div className={styles.twoCol}>
      <Card title="Declaration">
        <KVGrid
          rows={[
            ['MRN', <span className="mono">{d.mrn}</span>],
            ['Status', d.status],
            ['Declaration type', typeLabel(d.type)],
            [
              <Term help="The customs procedure the goods are declared for, e.g. release for free circulation.">
                Customs procedure
              </Term>,
              d.lines[0]?.procedure ?? '',
            ],
            ['Declaration country', d.countryName],
            ['Clearance date', <span className="num">{formatIsoDate(d.clearanceDate)}</span>],
            ['Release date', <span className="num">{d.releaseDate ? formatIsoDate(d.releaseDate) : 'Not yet released'}</span>],
            ['Origin', countryLabel(d.originCountry)],
            ['Destination', countryLabel(d.destinationCountry)],
            ['Transport mode', d.transportMode],
            [
              <Term help="The agreed commercial delivery terms between buyer and seller.">Incoterms</Term>,
              d.incoterms,
            ],
          ]}
        />
      </Card>
      <Card title="Value summary">
        <KVGrid
          rows={[
            ['Total invoice value', <span className="num">{formatMoney(d.invoiceTotal)}</span>],
            [
              <Term help="The value of the goods for customs purposes: invoice value plus transport and insurance to the border.">
                Customs value
              </Term>,
              <span className="num">{formatMoney(d.customsValueTotal)}</span>,
            ],
            ['Duty', <span className="num">{formatMoney(d.dutyTotal)}</span>],
            ['VAT', <span className="num">{formatMoney(d.vatTotal)}</span>],
            ['Goods lines', <span className="num">{formatCount(d.lines.length)}</span>],
            ['Currency', `Declared in ${d.currency}`],
          ]}
        />
        <div className={styles.footnote}>
          {recon.reconciled
            ? 'Totals reconcile with the goods lines on this declaration.'
            : 'The goods lines do not sum to the declaration totals — see Values, duties and taxes.'}
        </div>
      </Card>
    </div>
  );
}
