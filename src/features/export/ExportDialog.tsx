import { useState } from 'react';
import type { RegisterColumn } from '../register/columns';
import styles from './export.module.css';

/** What the file will contain, for a given setting of the optional line toggle. */
export interface ExportPlan {
  /** "1,204 goods lines — one row per goods line" */
  rows: string;
  /** The visible columns; Currency is added beside amounts by the builder. */
  columns: readonly RegisterColumn[];
  /** Plain statement of the layout, so users cannot double-count. */
  note: string;
}

/**
 * Export configuration modal. It states the rows, the columns and the layout
 * before anything is written: the file is the register as shown, nothing else.
 */
export function ExportDialog(props: {
  title: string;
  summary: [label: string, value: string][];
  /** When set, offers "Include goods-line detail"; the plan is recomputed as it changes. */
  lineOption?: { defaultOn: boolean };
  plan: (includeLines: boolean) => ExportPlan;
  onCancel: () => void;
  onConfirm: (format: 'csv' | 'xlsx', includeLines: boolean) => void | Promise<void>;
}) {
  const [includeLines, setIncludeLines] = useState(props.lineOption?.defaultOn ?? false);
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [busy, setBusy] = useState(false);
  const plan = props.plan(includeLines);
  const currencyAdded = plan.columns.some((c) => c.amount) && !plan.columns.some((c) => c.id === 'currency');

  const confirm = async () => {
    setBusy(true);
    try {
      await props.onConfirm(format, includeLines);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={props.title}>
      <div className={styles.modal}>
        <div className={styles.title}>{props.title}</div>
        <div className={styles.summaryGrid}>
          {props.summary.map(([label, value]) => (
            <div key={label} className={styles.summaryPair}>
              <div className={styles.summaryLabel}>{label}</div>
              <div>{value}</div>
            </div>
          ))}
          <div className={styles.summaryPair}>
            <div className={styles.summaryLabel}>Rows</div>
            <div className="num">{plan.rows}</div>
          </div>
          <div className={styles.summaryPair}>
            <div className={styles.summaryLabel}>Columns</div>
            <div>
              <span className="num">{plan.columns.length}</span>
              {currencyAdded ? ' shown, plus Currency' : ' shown'}
              <div className={styles.columnList}>
                {plan.columns.map((c) => c.label).join(', ')}
                {currencyAdded ? ', Currency' : ''}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.options}>
          {props.lineOption && (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={includeLines}
                onChange={(e) => setIncludeLines(e.target.checked)}
              />
              Include goods-line detail
            </label>
          )}
          <div className={styles.formatRow}>
            <span className={styles.formatLabel}>File format:</span>
            <label className={styles.radio}>
              <input
                type="radio"
                name="export-format"
                value="csv"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
              />
              CSV
            </label>
            <label className={styles.radio}>
              <input
                type="radio"
                name="export-format"
                value="xlsx"
                checked={format === 'xlsx'}
                onChange={() => setFormat('xlsx')}
              />
              Excel (XLSX)
            </label>
          </div>
        </div>
        <div className={styles.note}>
          {plan.note}
          {currencyAdded &&
            ' Currency is added as a column so every amount states the currency it was declared in.'}
          {' Dates are written as YYYY-MM-DD. Fields with no value carry their state — “Not populated”, “Not available”, “Not applicable” or “Not verified” — never a blank.'}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={props.onCancel}>
            Cancel
          </button>
          <button type="button" className={styles.confirmBtn} disabled={busy} onClick={() => void confirm()}>
            {busy ? 'Preparing…' : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The layout statement for each grain, shared by the register and the detail page. */
export const EXPORT_NOTE: Record<'declaration' | 'line', string> = {
  declaration:
    'One row per declaration, with the columns shown on screen. Amounts are whole units in the declared currency.',
  line:
    'One row per goods line, with the columns shown on screen. Declaration details repeat on each of a declaration’s lines; declaration totals are not included, so summing a column never counts a declaration twice. Amounts are whole units in the declared currency.',
};
