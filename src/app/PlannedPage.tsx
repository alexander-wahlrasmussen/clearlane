import { Link, useParams } from '@tanstack/react-router';
import styles from './planned.module.css';

const COPY: Record<string, { title: string; desc: string }> = {
  overview: {
    title: 'Overview',
    desc: 'A consolidated view of declaration volumes and values across countries is planned once the launch dataset is validated in production.',
  },
  exceptions: {
    title: 'Exceptions',
    desc: 'A worklist of declarations requiring investigation is planned for a later release.',
  },
};

export function PlannedPage() {
  const { section } = useParams({ from: '/mvp/planned/$section' });
  const copy = COPY[section] ?? COPY.overview!;
  return (
    <div className={styles.wrap} data-screen-label="Planned placeholder">
      <h1 className={styles.title}>{copy.title}</h1>
      <div className={styles.card}>
        <div className={styles.pill}>Planned — not in the launch version</div>
        <div className={styles.head}>This area is not yet functional</div>
        <div className={styles.desc}>{copy.desc}</div>
        <div>
          <Link to="/mvp" className={styles.backBtn}>
            Back to declarations
          </Link>
        </div>
      </div>
    </div>
  );
}
