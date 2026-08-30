import { Link } from '@tanstack/react-router';
import { readConfig } from './config';
import { BUILD_INFO } from './build-info';
import styles from './shell.module.css';

/**
 * The strip above every screen that says what this is. Nothing in the
 * prototype is a real customer, declaration or value, and a reviewer should
 * never have to wonder (principle #3, applied to the prototype itself).
 */
export function PrototypeBar() {
  const { feedbackUrl } = readConfig();
  return (
    <div className={styles.protoBar} role="note">
      <span className={styles.protoTag}>Prototype</span>
      <span>Synthetic data — no real customers, declarations or values.</span>
      <span className={styles.protoSpacer} />
      <Link to="/" className={styles.protoLink}>
        About this prototype
      </Link>
      <a href={feedbackUrl} className={styles.protoLink} target="_blank" rel="noreferrer">
        Give feedback
      </a>
      <span className={`${styles.protoBuild} mono`} title={`Built ${BUILD_INFO.builtAt}`}>
        Build {BUILD_INFO.commit}
      </span>
    </div>
  );
}
