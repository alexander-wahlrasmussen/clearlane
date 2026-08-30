import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { useAuth } from '../auth/AuthContext';
import { useScope } from '../api/queries';
import { formatUtcTimestamp } from '../domain/dates';
import { useToast } from './ToastContext';
import styles from './shell.module.css';

/** Selected legal entity — 'all' or an entity name. Shared by header and register. */
const EntityContext = createContext<['all' | string, Dispatch<SetStateAction<string>>] | null>(null);

export function useEntityFilter() {
  const ctx = useContext(EntityContext);
  if (!ctx) throw new Error('MvpShell is missing above this component');
  return ctx;
}

function NavIcon(props: { children: ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      {props.children}
    </svg>
  );
}

const PLANNED_SECTIONS = [
  { key: 'overview', label: 'Overview', icon: <><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></> },
  { key: 'exceptions', label: 'Exceptions', icon: <path d="M8 2.5 14 13H2L8 2.5Z" /> },
];

export function MvpShell() {
  const entityState = useState<string>('all');
  const [userOpen, setUserOpen] = useState(false);
  const auth = useAuth();
  const scope = useScope();
  const toast = useToast();
  const user = auth.getUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onReports = pathname.endsWith('/reports');
  const onDeclarations = !onReports && !pathname.includes('/planned/');

  const protoOnly = () => {
    setUserOpen(false);
    toast('Not part of this prototype');
  };

  return (
    <EntityContext.Provider value={entityState}>
      <div className={styles.appFrame}>
        <header className={styles.topBar}>
          <div className={styles.logoRow}>
            <div className={styles.logoMark} />
            <div className={styles.logoName}>Customs Insights</div>
          </div>
          <div className={styles.divider} />
          <select
            className={styles.entitySelect}
            aria-label="Customer legal entity"
            value={entityState[0]}
            onChange={(e) => entityState[1](e.target.value)}
          >
            <option value="all">{scope.data?.customerName ?? 'All'} — all entities</option>
            {scope.data?.entities.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <div className={styles.spacer} />
          <div className={styles.refreshed}>
            Last refreshed <strong>{scope.data ? formatUtcTimestamp(scope.data.refreshedAt) : '…'}</strong>
          </div>
          <button
            type="button"
            className={styles.avatarBtn}
            aria-label="User menu"
            onClick={() => setUserOpen((o) => !o)}
          >
            {user.initials}
          </button>
          {userOpen && (
            <div className={styles.userMenu}>
              <div className={styles.userMenuHead}>
                <div className={styles.userMenuName}>{user.name}</div>
                <div className={styles.userMenuRole}>{user.role}</div>
              </div>
              <button type="button" className={styles.userMenuItem} onClick={protoOnly}>
                Profile and preferences
              </button>
              <button
                type="button"
                className={styles.userMenuDanger}
                onClick={() => {
                  void auth.signOut();
                  protoOnly();
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </header>
        <div className={styles.body}>
          <nav className={styles.sideNav}>
            <Link to="/mvp" className={onDeclarations ? styles.navBtnActive : styles.navBtn}>
              <NavIcon>
                <path d="M2 4h12M2 8h12M2 12h8" />
              </NavIcon>
              Declarations
            </Link>
            <Link to="/mvp/reports" className={onReports ? styles.navBtnActive : styles.navBtn}>
              <NavIcon>
                <rect x="3" y="2" width="10" height="12" rx="1" />
                <path d="M6 6h4M6 9h4" />
              </NavIcon>
              Reports
            </Link>
            <div className={styles.navSection}>Planned</div>
            {PLANNED_SECTIONS.map((s) => (
              <Link
                key={s.key}
                to="/mvp/planned/$section"
                params={{ section: s.key }}
                className={
                  pathname.endsWith(`/planned/${s.key}`) ? styles.navBtnActive : styles.navBtnPlanned
                }
              >
                <NavIcon>{s.icon}</NavIcon>
                {s.label}
                <span className={styles.plannedPill}>Planned</span>
              </Link>
            ))}
          </nav>
          <main className={styles.main}>
            <Outlet />
          </main>
        </div>
        {userOpen && <div className={styles.backdrop} onClick={() => setUserOpen(false)} />}
      </div>
    </EntityContext.Provider>
  );
}
