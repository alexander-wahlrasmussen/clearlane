import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { useAuth } from '../../auth/AuthContext';
import { useScope } from '../../api/queries';
import { formatUtcTimestamp } from '../../domain/dates';
import shell from '../../app/shell.module.css';
import { EntityProvider, EntitySelect } from '../../app/entity-context';
import { PrototypeBar } from '../../app/PrototypeBar';
import { SurfaceSwitch } from '../../app/SurfaceSwitch';
import { AskSessionProvider, useAskSession } from './ask-session';
import { EvidenceDrawer } from './EvidenceDrawer';
import { DeclarationDrawer } from './DeclarationDrawer';
import { ReportDraftModal } from './ReportDraftModal';

function AiHeader() {
  const auth = useAuth();
  const scope = useScope();
  const session = useAskSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onAsk = !pathname.includes('/declarations');
  return (
    <header className={shell.topBar}>
      <div className={shell.logoRow}>
        <div className={shell.logoMark} />
        <div className={shell.logoName}>Customs Insights</div>
      </div>
      <SurfaceSwitch current="ai" />
      <div className={shell.divider} />
      <EntitySelect />
      <div className={shell.divider} />
      <nav className={shell.headerTabs}>
        <Link to="/ai" className={onAsk ? shell.headerTabActive : shell.headerTab}>
          Ask
        </Link>
        <Link to="/ai/declarations" className={!onAsk ? shell.headerTabActive : shell.headerTab}>
          Declarations
        </Link>
      </nav>
      <div className={shell.spacer} />
      {session.reportCount > 0 && (
        <button type="button" className={shell.reportBtn} onClick={() => session.setReportOpen(true)}>
          Draft report ({session.reportCount})
        </button>
      )}
      <div className={shell.refreshed}>
        Data refreshed{' '}
        <strong>{scope.data ? formatUtcTimestamp(scope.data.refreshedAt) : '…'}</strong>
      </div>
      <div className={shell.avatarStatic} aria-label={auth.getUser().name}>
        {auth.getUser().initials}
      </div>
    </header>
  );
}

export function AiShell() {
  return (
    <EntityProvider>
      <AskSessionProvider>
        <div className={shell.appFrame}>
          <PrototypeBar />
          <AiHeader />
          <main className={shell.main}>
            <Outlet />
          </main>
          <EvidenceDrawer />
          <DeclarationDrawer />
          <ReportDraftModal />
        </div>
      </AskSessionProvider>
    </EntityProvider>
  );
}
