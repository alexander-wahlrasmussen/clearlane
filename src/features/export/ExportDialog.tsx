import { useState } from 'react';
import styles from './export.module.css';

/**
 * Export configuration modal. The note under the options states exactly how
 * totals are laid out so users cannot double-count them.
 */
export function ExportDialog(props: {
  title: string;
  summary: [label: string, value: string][];
  defaultIncludeLines: boolean;
  onCancel: () => void;
  onConfirm: (format: 'csv' | 'xlsx', includeLines: boolean) => void | Promise<void>;
}) {
  const [includeLines, setIncludeLines] = useState(props.defaultIncludeLines);
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [busy, setBusy] = useState(false);

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
              <div className={label === 'Declarations' ? 'num' : undefined}>{value}</div>
            </div>
          ))}
        </div>
        <div className={styles.options}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={includeLines}
              onChange={(e) => setIncludeLines(e.target.checked)}
            />
            Include goods-line detail
          </label>
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
          {includeLines
            ? 'The file contains one “Declaration” row per declaration and one “Goods line” row per line. Declaration totals appear only on declaration rows, so totals are not counted twice.'
            : 'The file contains one row per declaration with declaration-level totals only.'}
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
