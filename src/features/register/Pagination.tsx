import styles from './register.module.css';

/** Page controls for a server-paged table; states the rows shown, never just a page number. */
export function Pagination(props: {
  page: number;
  pageSize: number;
  total: number;
  rowNoun: string;
  onPage: (page: number) => void;
}) {
  const { page, pageSize, total, rowNoun, onPage } = props;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const shown = Math.min(page, pages);
  return (
    <div className={styles.pagination}>
      <div className={`${styles.pageInfo} num`}>
        Showing {(shown - 1) * pageSize + 1}–{Math.min(shown * pageSize, total)} of {total} {rowNoun}
      </div>
      <div className={styles.pageControls}>
        <button type="button" className={styles.pageBtn} disabled={shown <= 1} onClick={() => onPage(Math.max(1, shown - 1))}>
          ← Previous
        </button>
        <span className={`${styles.pageInfo} num`}>
          Page {shown} of {pages}
        </span>
        <button type="button" className={styles.pageBtn} disabled={shown >= pages} onClick={() => onPage(shown + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}
