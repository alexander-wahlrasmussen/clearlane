import { useEffect, useId, useRef, useState } from 'react';
import { columnsForGrain, DEFAULT_COLUMNS, type Grain } from './columns';
import styles from './register.module.css';

/**
 * Chooses which of the catalogue's fields the register shows. The list is
 * driven by columns.tsx, whose labels come from the field catalogue, so a
 * column can never offer a field the agreed source list does not contain.
 */
export function ColumnPicker(props: {
  grain: Grain;
  selected: readonly string[];
  onChange: (ids: string[]) => void;
}) {
  const { grain, selected, onChange } = props;
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const available = columnsForGrain(grain);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((c) => c !== id)
        : available.filter((c) => c.id === id || selected.includes(c.id)).map((c) => c.id),
    );
  };

  const isDefault =
    selected.length === DEFAULT_COLUMNS[grain].length &&
    selected.every((id, i) => id === DEFAULT_COLUMNS[grain][i]);

  return (
    <div className={styles.pickerWrap}>
      <button
        type="button"
        ref={buttonRef}
        className={styles.resetBtn}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        Columns ({selected.length})
      </button>
      {open && (
        <div className={styles.pickerPanel} id={panelId} ref={panelRef}>
          <div className={styles.pickerHead}>
            <span className={styles.pickerTitle}>Columns shown</span>
            <button
              type="button"
              className={styles.clearAll}
              disabled={isDefault}
              onClick={() => onChange([...DEFAULT_COLUMNS[grain]])}
            >
              Reset to default
            </button>
          </div>
          <div className={styles.pickerList}>
            {available.map((c) => (
              <label key={c.id} className={styles.pickerItem}>
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => toggle(c.id)}
                />
                <span className={styles.pickerLabel}>
                  {c.label}
                  {c.derivedNote && (
                    <span className={styles.pickerDerived} title={c.derivedNote}>
                      derived
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className={styles.pickerFoot}>
            Field names come from the agreed source list. “Derived” marks a value calculated from
            the goods lines rather than declared.
          </div>
        </div>
      )}
    </div>
  );
}
