import { Link } from '@tanstack/react-router';
import styles from './shell.module.css';

/**
 * Moves between the two product surfaces. Both read the same data layer; the
 * switch is here so a reviewer can compare them without knowing the routes.
 */
export function SurfaceSwitch(props: { current: 'mvp' | 'ai' }) {
  return (
    <nav className={styles.surfaceSwitch} aria-label="Product surface">
      <Link
        to="/mvp"
        search={{}}
        className={props.current === 'mvp' ? styles.surfaceBtnActive : styles.surfaceBtn}
        aria-current={props.current === 'mvp' ? 'page' : undefined}
      >
        MVP
      </Link>
      <Link
        to="/ai"
        className={props.current === 'ai' ? styles.surfaceBtnActive : styles.surfaceBtn}
        aria-current={props.current === 'ai' ? 'page' : undefined}
      >
        AI concept
      </Link>
    </nav>
  );
}
