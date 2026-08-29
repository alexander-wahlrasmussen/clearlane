import type { ReactNode } from 'react';
import styles from './declaration.module.css';

/** Label/value grid used across the detail tabs. */
export function KVGrid(props: { rows: [label: ReactNode, value: ReactNode][]; labelWidth?: number }) {
  return (
    <div
      className={styles.kvGrid}
      style={props.labelWidth ? { gridTemplateColumns: `${props.labelWidth}px 1fr` } : undefined}
    >
      {props.rows.map(([label, value], i) => (
        <div key={i} className={styles.kvRow}>
          <div className={styles.kvLabel}>{label}</div>
          <div className={styles.kvValue}>{value}</div>
        </div>
      ))}
    </div>
  );
}

export function Card(props: { title: string; children: ReactNode; headerExtra?: ReactNode }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitle}>{props.title}</div>
        {props.headerExtra}
      </div>
      {props.children}
    </div>
  );
}
