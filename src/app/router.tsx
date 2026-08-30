import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { LandingPage } from './LandingPage';
import { MvpShell } from './MvpShell';
import { PlannedPage } from './PlannedPage';
import { AiShell } from '../features/ask/AiShell';
import { AskPage } from '../features/ask/AskPage';
import { AiRegisterPage } from '../features/ask/AiRegisterPage';
import { MvpRegisterPage } from '../features/register/MvpRegisterPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { DeclarationPage } from '../features/declaration/DeclarationPage';

/**
 * Code-based route tree (documented decision — see README "Decisions"):
 * same TanStack Router, no generated routeTree.gen.ts artifact in the repo.
 */
const rootRoute = createRootRoute({ component: () => <Outlet /> });

/** The front door for reviewers — what this is and where to look. */
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: LandingPage });

const mvpRoute = createRoute({ getParentRoute: () => rootRoute, path: 'mvp', component: MvpShell });
const registerRoute = createRoute({
  getParentRoute: () => mvpRoute,
  path: '/',
  component: MvpRegisterPage,
  /** `?view=<report id>` opens the register on a saved view — see features/register/views.ts. */
  validateSearch: (search: Record<string, unknown>): { view?: string } =>
    typeof search.view === 'string' && search.view ? { view: search.view } : {},
});
const reportsRoute = createRoute({ getParentRoute: () => mvpRoute, path: 'reports', component: ReportsPage });
const declarationRoute = createRoute({
  getParentRoute: () => mvpRoute,
  path: 'declarations/$mrn',
  component: DeclarationPage,
});
const plannedRoute = createRoute({
  getParentRoute: () => mvpRoute,
  path: 'planned/$section',
  component: PlannedPage,
});

const aiRoute = createRoute({ getParentRoute: () => rootRoute, path: 'ai', component: AiShell });
const askRoute = createRoute({ getParentRoute: () => aiRoute, path: '/', component: AskPage });
const aiRegisterRoute = createRoute({
  getParentRoute: () => aiRoute,
  path: 'declarations',
  component: AiRegisterPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  mvpRoute.addChildren([registerRoute, reportsRoute, declarationRoute, plannedRoute]),
  aiRoute.addChildren([askRoute, aiRegisterRoute]),
]);

// basepath follows Vite's `base`, so the same build serves at / or under /repo-name/ (GitHub Pages).
export const router = createRouter({ routeTree, basepath: import.meta.env.BASE_URL });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
