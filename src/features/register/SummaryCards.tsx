import type { RegisterSummary } from '../../api/declarations-client';
import { formatCount, formatEurCompact } from '../../domain/money';
import { Term } from '../../components/FieldDisplay';
import styles from './register.module.css';

export function SummaryCards(props: {
  summary: RegisterSummary;
  awaitingActive: boolean;
  gapsActive: boolean;
  onToggleAwaiting: () => void;
  onToggleGaps: () => void;
}) {
  const s = props.summary;
  return (
    <div className={styles.cards}>
      <div className={styles.card}>
        <div className={styles.cardLabel}>Declarations in scope</div>
        <div className={styles.cardValue}>{formatCount(s.total)}</div>
        <div className={styles.cardSub}>
          {s.imports} import · {s.exports} export · {s.transits} transit
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardLabel}>
          Customs value{' '}
          <Term help="EUR equivalent, converted at the exchange rate declared on each declaration. Original currencies are shown in the table.">
            <span className={styles.infoDot}>i</span>
          </Term>
        </div>
        <div className={styles.cardValue}>{formatEurCompact(s.customsValueEurMinor)}</div>
        <div className={styles.cardSub}>Across {s.currencies.join(', ')}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardLabel}>Duty and VAT</div>
        <div className={styles.cardValue}>{formatEurCompact(s.dutyVatEurMinor)}</div>
        <div className={styles.cardSub}>EUR equivalent</div>
      </div>
      <button
        type="button"
        title="Filter to declarations awaiting release"
        className={props.awaitingActive ? styles.cardBtnActive : styles.cardBtn}
        onClick={props.onToggleAwaiting}
      >
        <div className={styles.cardLabel}>Not yet released</div>
        <div className={styles.cardValue}>{s.awaitingRelease}</div>
        <div className={styles.cardAction}>Select to filter</div>
      </button>
      <button
        type="button"
        title="Filter to declarations with data gaps"
        className={props.gapsActive ? styles.cardBtnActive : styles.cardBtn}
        onClick={props.onToggleGaps}
      >
        <div className={styles.cardLabel}>
          With data gaps{' '}
          <Term help="Declarations with a required field not populated, or values not yet compared with the source record. Details are labelled on each declaration.">
            <span className={styles.infoDot}>i</span>
          </Term>
        </div>
        <div className={styles.cardValue}>{s.withDataGaps}</div>
        <div className={styles.cardAction}>Select to filter</div>
      </button>
    </div>
  );
}
