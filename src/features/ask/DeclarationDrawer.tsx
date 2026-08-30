import { useDeclaration } from '../../api/queries';
import { LoadingScreen, ErrorScreen } from '../../app/StatusScreens';
import { DeclarationDetail } from '../declaration/DeclarationDetail';
import { useAskSession } from './ask-session';
import styles from './ask.module.css';

/**
 * The full declaration view, as a drawer so the Ask canvas stays where it is.
 * Same component as the MVP's declaration page — every tab, the export and the
 * reconciliation check — so nothing sends the user to the other surface.
 */
export function DeclarationDrawer() {
  const session = useAskSession();
  const mrn = session.drawerMrn;
  const query = useDeclaration(mrn ?? '');
  if (!mrn) return null;

  return (
    <>
      <div className={styles.drawerBackdropTop} onClick={session.closeDrawer} />
      <div className={styles.drawerWide} data-screen-label="Declaration detail" role="dialog" aria-label={`Declaration ${mrn}`}>
        <div className={styles.drawerHead}>
          <div className={styles.drawerHeadText}>
            <div className={styles.drawerKicker}>Declaration</div>
            <span className={styles.drawerMrn}>{mrn}</span>
          </div>
          <button type="button" title="Close" className={styles.cardX} onClick={session.closeDrawer}>
            ✕
          </button>
        </div>
        <div className={styles.drawerBodyPad}>
          {query.isPending && <LoadingScreen />}
          {query.isError && <ErrorScreen onRetry={() => void query.refetch()} />}
          {query.data && <DeclarationDetail d={query.data} />}
        </div>
      </div>
    </>
  );
}
