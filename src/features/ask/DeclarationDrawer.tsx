import { useDeclaration } from '../../api/queries';
import { typeLabel } from '../../domain/declaration';
import { formatIsoDate } from '../../domain/dates';
import { formatMoney } from '../../domain/money';
import { StatusBadge } from '../../components/FieldDisplay';
import { amountOrDash, units } from '../declaration/derived';
import { useAskSession } from './ask-session';
import styles from './ask.module.css';

/** Quick declaration summary. The full view — parties, references, availability — lives in the MVP. */
export function DeclarationDrawer() {
  const session = useAskSession();
  const mrn = session.drawerMrn;
  const query = useDeclaration(mrn ?? '');
  if (!mrn) return null;
  const d = query.data;

  return (
    <>
      <div className={styles.drawerBackdropTop} onClick={session.closeDrawer} />
      <div className={styles.drawerWide} data-screen-label="Declaration detail" role="dialog" aria-label={`Declaration ${mrn}`}>
        <div className={styles.drawerHead}>
          <span className={styles.drawerMrn}>{mrn}</span>
          {d && <StatusBadge status={d.status} pill />}
          <span className={styles.interpSpacer} />
          <button type="button" title="Close" className={styles.cardX} onClick={session.closeDrawer}>
            ✕
          </button>
        </div>
        {d && (
          <div className={styles.drawerBodyPad}>
            <div className={styles.dwGrid}>
              <DwField label="Type" value={typeLabel(d.type)} />
              <DwField label="Country" value={d.countryName} />
              <DwField label="Cleared" value={formatIsoDate(d.releaseDate ?? d.clearanceDate)} num />
              <DwField label="Customer reference" value={d.customerReference} mono />
              <DwField label="Importer / buyer" value={d.importer.name} />
              <DwField label="Exporter / seller" value={d.exporter.name} />
              <DwField label="Customs value" value={formatMoney(d.customsValueTotal)} strong />
              <DwField label="Duty" value={formatMoney(d.dutyTotal)} strong />
              <DwField label="VAT" value={formatMoney(d.vatTotal)} strong />
            </div>
            <div className={styles.rowsTitle}>Goods lines</div>
            <div className={styles.listTableWrap}>
              <table className={styles.listTable}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Commodity</th>
                    <th>Description</th>
                    <th data-align="right">Customs value</th>
                    <th data-align="right">Duty</th>
                    <th data-align="right">VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {d.lines.map((l) => (
                    <tr key={l.lineNo}>
                      <td className="num">{l.lineNo}</td>
                      <td className="mono">{l.commodityCode}</td>
                      <td className={styles.listReasonPlain}>{l.description}</td>
                      <td data-align="right" className="num">{units(l.customsValue)}</td>
                      <td data-align="right" className="num">{amountOrDash(l.dutyAmount)}</td>
                      <td data-align="right" className="num">{amountOrDash(l.vatAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.drawerNote}>
              Amounts in {d.currency} as declared. The full declaration view — parties, references,
              data availability — lives in the MVP surface.
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DwField(props: { label: string; value: string; mono?: boolean; num?: boolean; strong?: boolean }) {
  return (
    <div>
      <div className={styles.dwLabel}>{props.label}</div>
      <div
        className={`${props.strong ? styles.dwStrong : styles.dwValue} ${props.mono ? 'mono' : ''} ${props.num ? 'num' : ''}`}
      >
        {props.value}
      </div>
    </div>
  );
}
