import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { RegisterView } from './views';
import styles from './register.module.css';

/**
 * Chooses which report the register is showing, and saves the current view as
 * one. A built-in report can be opened and adjusted but not changed in place:
 * adjustments are saved as a new report of the user's own.
 */
export function ReportBar(props: {
  builtIn: readonly RegisterView[];
  saved: readonly RegisterView[];
  active: RegisterView | undefined;
  modified: boolean;
  onSelect: (id: string | null) => void;
  onSaveAs: (name: string) => void;
  onSaveChanges: () => void;
  onDiscard: () => void;
  onDelete: () => void;
}) {
  const { active, modified } = props;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const formId = useId();

  const openSave = () => {
    setName(active ? `${active.name} (copy)` : '');
    setSaving(true);
  };
  const closeSave = () => {
    setSaving(false);
    saveBtnRef.current?.focus();
  };

  useEffect(() => {
    if (saving) inputRef.current?.select();
  }, [saving]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    props.onSaveAs(trimmed);
    setSaving(false);
  };

  return (
    <div className={styles.reportRow}>
      <label className={styles.viewLabel} htmlFor={`${formId}-report`}>
        Report
      </label>
      <select
        id={`${formId}-report`}
        className={styles.select}
        value={active?.id ?? ''}
        onChange={(e) => props.onSelect(e.target.value || null)}
      >
        <option value="">Custom view</option>
        <optgroup label="Built-in reports">
          {props.builtIn.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </optgroup>
        {props.saved.length > 0 && (
          <optgroup label="Your reports">
            {props.saved.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {active && modified && <span className={styles.modifiedTag}>Modified</span>}
      {active && modified && !active.builtIn && (
        <button type="button" className={styles.clearAll} onClick={props.onSaveChanges}>
          Save changes
        </button>
      )}
      {active && modified && (
        <button type="button" className={styles.clearAll} onClick={props.onDiscard}>
          Discard changes
        </button>
      )}
      {(!active || modified) && !saving && (
        <button type="button" ref={saveBtnRef} className={styles.clearAll} onClick={openSave}>
          {active ? 'Save as new report…' : 'Save as report…'}
        </button>
      )}
      {active && !modified && !active.builtIn && (
        <button type="button" className={styles.clearAll} onClick={props.onDelete}>
          Delete report
        </button>
      )}
      {active && !modified && (
        <span className={styles.viewHint}>
          {active.builtIn ? 'Built-in report — adjust it and save your own.' : 'Your report.'}
        </span>
      )}

      {saving && (
        <form className={styles.saveForm} onSubmit={submit}>
          <label className={styles.viewLabel} htmlFor={`${formId}-name`}>
            Report name
          </label>
          <input
            id={`${formId}-name`}
            ref={inputRef}
            className={styles.saveInput}
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeSave();
            }}
          />
          <button type="submit" className={styles.primaryBtnSmall} disabled={!name.trim()}>
            Save
          </button>
          <button type="button" className={styles.resetBtnSmall} onClick={closeSave}>
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
