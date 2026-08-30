import { Link, useParams } from '@tanstack/react-router';
import { useDeclaration } from '../../api/queries';
import { LoadingScreen, ErrorScreen } from '../../app/StatusScreens';
import { DeclarationDetail } from './DeclarationDetail';
import styles from './declaration.module.css';

export function DeclarationPage() {
  const { mrn } = useParams({ from: '/mvp/declarations/$mrn' });
  const query = useDeclaration(mrn);

  if (query.isPending) return <LoadingScreen />;
  if (query.isError) return <ErrorScreen onRetry={() => void query.refetch()} />;

  return (
    <div className={styles.page} data-screen-label="Declaration detail">
      <Link to="/mvp" className={styles.backLink}>
        ← Back to declarations
      </Link>
      <DeclarationDetail d={query.data} />
    </div>
  );
}
