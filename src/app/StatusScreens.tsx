import styles from './shell.module.css';

export function LoadingScreen() {
  return (
    <div className={styles.statusScreen} data-screen-label="Loading">
      <div className={styles.logoRow}>
        <div className={styles.logoMarkLarge} />
        <div className={styles.statusTitle}>Customs Insights</div>
      </div>
      <div className={styles.spinner} aria-hidden="true" />
      <div className={styles.statusHint}>Loading declaration data…</div>
    </div>
  );
}

export function ErrorScreen(props: { onRetry: () => void }) {
  return (
    <div className={styles.statusScreen} data-screen-label="Error">
      <div className={styles.errorCard}>
        <div className={styles.errorBang} aria-hidden="true">
          !
        </div>
        <div className={styles.errorTitle}>We could not load your declaration data</div>
        <div className={styles.errorBody}>
          Your declarations are safe. This is a temporary problem retrieving them — please try
          again.
        </div>
        <button type="button" className={styles.primaryBtn} onClick={props.onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
