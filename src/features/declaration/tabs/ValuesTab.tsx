import type { Declaration } from '../../../domain/declaration';
import { isValue } from '../../../domain/field-value';
import { formatMoney } from '../../../domain/money';
import { reconcile } from '../../../domain/reconciliation';
import { Card } from '../KV';
import { amountOrDash, fxNote, rateLabel, units } from '../derived';
import styles from '../declaration.module.css';

export function ValuesTab({ d }: { d: Declaration }) {
  const recon = reconcile(d);
  return (
    <div className={styles.valuesGrid}>
      <div className={styles.tableCard}>
        <div className={styles.tableHead}>
          <div className={styles.cardTitle}>Reconciliation by goods line</div>
          <div className={styles.tableHint}>Values in {d.currency}</div>
        </div>
        <table className={styles.reconTable}>
          <thead>
            <tr>
              <th>Line</th>
              <th>Description</th>
              <th data-align="right">Item value</th>
              <th data-align="right">Customs value</th>
              <th data-align="right">Duty rate</th>
              <th data-align="right">Duty</th>
              <th data-align="right">VAT rate</th>
              <th data-align="right">VAT</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l) => (
              <tr key={l.lineNo}>
                <td className="num">{l.lineNo}</td>
                <td className={styles.ellipsis}>{l.description}</td>
                <td data-align="right" className="num">{units(l.itemValue)}</td>
                <td data-align="right" className="num">{units(l.customsValue)}</td>
                <td data-align="right" className="num">
                  {isValue(l.dutyRatePct) ? rateLabel(l.dutyRatePct.value) : '—'}
                </td>
                <td data-align="right" className="num">{amountOrDash(l.dutyAmount)}</td>
                <td data-align="right" className="num">
                  {isValue(l.vatRatePct) ? `${l.vatRatePct.value}%` : '—'}
                </td>
                <td data-align="right" className="num">{amountOrDash(l.vatAmount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <td>Declaration totals</td>
              <td data-align="right" className="num">{units(d.invoiceTotal)}</td>
              <td data-align="right" className="num">{units(d.customsValueTotal)}</td>
              <td />
              <td data-align="right" className="num">{units(d.dutyTotal)}</td>
              <td />
              <td data-align="right" className="num">{units(d.vatTotal)}</td>
            </tr>
          </tfoot>
        </table>
        <div className={styles.reconStatus}>
          {recon.reconciled ? (
            <>
              <span className={styles.reconOk}>✓ Reconciled</span>
              <span className={styles.reconText}>
                {' '}
                — the goods lines sum exactly to the declaration totals shown above.
              </span>
            </>
          ) : (
            <>
              <span className={styles.reconBad}>▲ Difference found</span>
              <span className={styles.reconText}>
                {' '}
                — the goods lines do not sum to the declaration totals. Contact your customs service
                team.
              </span>
            </>
          )}
        </div>
      </div>
      <Card title="Declaration amounts">
        <div className={styles.amountsGrid}>
          <div className={styles.amountLabel}>Invoice amount</div>
          <div className="num">{formatMoney(d.invoiceTotal)}</div>
          <div className={styles.amountLabel}>Transport costs</div>
          <div className="num">{formatMoney(d.transportTotal)}</div>
          <div className={styles.amountLabel}>Insurance costs</div>
          <div className="num">{formatMoney(d.insuranceTotal)}</div>
          <div className={styles.amountLabel}>Deductions</div>
          <div className={styles.amountMuted}>None declared</div>
          <div className={styles.amountStrong}>Customs value</div>
          <div className={`${styles.amountStrong} num`}>{formatMoney(d.customsValueTotal)}</div>
          <div className={styles.amountLabel}>Duty</div>
          <div className="num">{formatMoney(d.dutyTotal)}</div>
          <div className={styles.amountLabel}>VAT</div>
          <div className="num">{formatMoney(d.vatTotal)}</div>
          <div className={styles.amountLabel}>Excise</div>
          <div className={styles.amountMuted}>Not applicable</div>
        </div>
        <div className={styles.currencyNote}>
          <div>
            <strong>Currency:</strong> Declared in {d.currency}
          </div>
          <div style={{ marginTop: 4 }}>{fxNote(d)}</div>
        </div>
      </Card>
    </div>
  );
}
