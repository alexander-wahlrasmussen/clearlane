import type { ReactNode } from 'react';
import {
  FIELD_STATE_LABEL,
  FIELD_STATE_SEVERITY,
  isValue,
  type FieldState,
  type FieldValue,
} from '../domain/field-value';
import { STATUS_DOT, type DeclarationStatus } from '../domain/declaration';
import styles from './components.module.css';

/** One of the four field states as a labelled chip — never a blank. */
export function FieldStateChip(props: { state: FieldState }) {
  const severity = FIELD_STATE_SEVERITY[props.state];
  return (
    <span className={severity === 'warning' ? styles.chipWarning : styles.chipMuted}>
      {FIELD_STATE_LABEL[props.state]}
    </span>
  );
}

/** Renders the value when present, the labelled state chip when not. */
export function FieldCell<T>(props: { field: FieldValue<T>; render?: (value: T) => ReactNode }) {
  if (isValue(props.field)) {
    return <>{props.render ? props.render(props.field.value) : String(props.field.value)}</>;
  }
  return <FieldStateChip state={props.field.kind} />;
}

export function StatusBadge(props: { status: DeclarationStatus; pill?: boolean }) {
  const inner = (
    <>
      <span className={styles.statusDot} style={{ background: STATUS_DOT[props.status] }} />
      {props.status}
    </>
  );
  return props.pill ? (
    <span className={styles.statusPill}>{inner}</span>
  ) : (
    <span className={styles.statusInline}>{inner}</span>
  );
}

/** Dotted-underline term with a plain-language explanation (native tooltip). */
export function Term(props: { help: string; children: ReactNode }) {
  return (
    <span className={styles.term} title={props.help}>
      {props.children}
    </span>
  );
}
