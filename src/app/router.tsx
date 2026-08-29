import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router';
import { MvpShell } from './MvpShell';
import { PlannedPage } from './PlannedPage';
import { AiShell } from '../features/ask/AiShell';
import { AskPage } from '../features/ask/AskPage';
import { AiRegisterPage } from '../features/ask/AiRegisterPage';
import { RegisterPage } from '../features/register/RegisterPage';
import { DeclarationPage } from '../features/declaration/DeclarationPage';

/**
 * Code-based route tree (documented decision — see README "Decisions"):
 * same TanStack Router, no generated routeTree.gen.ts artifact in the repo.
 */
const rootRoute = createRootRoute({ component: () => <Outlet /> });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/mvp' });
  },
});

const mvpRoute = createRoute({ getParentRoute: () => rootRoute, path: 'mvp', component: MvpShell });
const registerRoute = createRoute({ getParentRoute: () => mvpRoute, path: '/', component: RegisterPage });
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
  mvpRoute.addChildren([registerRoute, declarationRoute, plannedRoute]),
  aiRoute.addChildren([askRoute, aiRegisterRoute]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
