import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import './styles/global.css';
import { readConfig } from './app/config';
import { router } from './app/router';
import { ToastProvider } from './app/ToastContext';
import { StubAuthProvider } from './auth/stub-auth-provider';
import { AuthProviderContext } from './auth/AuthContext';
import { DeclarationsClientProvider } from './api/queries';
import { HttpDeclarationsClient } from './api/http-declarations-client';
import { MockDeclarationsClient } from './mocks/mock-declarations-client';
import { AskEngineProvider } from './ai/ask-engine-context';
import { MockAskEngine } from './ai/mock-ask-engine';
import { AnthropicDevAskEngine, ApiAskEngine } from './ai/claude-ask-engine';
import type { AskEngine } from './ai/ask-engine';

/**
 * Composition root — the only place implementations are chosen.
 * Swap StubAuthProvider for an MSAL-backed provider here when wiring
 * Entra External ID (docs/auth-entra-external-id.md).
 */
const config = readConfig();
const auth = new StubAuthProvider();

if (config.apiBase && import.meta.env.PROD) {
  // The stub signs every request with a placeholder token. Wire MsalAuthProvider
  // (docs/auth-entra-external-id.md) before pointing a production build at a real API.
  throw new Error('VITE_API_BASE is set but only StubAuthProvider is wired — refusing to start a production build.');
}
if (config.apiBase) {
  console.warn('StubAuthProvider is sending a placeholder bearer token to VITE_API_BASE — local dev only.');
}

const client = config.apiBase
  ? new HttpDeclarationsClient(config.apiBase, auth)
  : new MockDeclarationsClient();

function chooseAskEngine(): AskEngine {
  if (config.askEngine === 'api' && config.apiBase) return new ApiAskEngine(config.apiBase, auth);
  if (config.askEngine === 'anthropic-dev' && config.anthropicApiKey) {
    if (import.meta.env.PROD) {
      // VITE_* variables are inlined into the bundle: a production build would ship the key.
      throw new Error('VITE_ASK_ENGINE=anthropic-dev is refused in production builds — use VITE_ASK_ENGINE=api.');
    }
    console.warn('AnthropicDevAskEngine active — local demos only, never ship this mode.');
    return new AnthropicDevAskEngine(config.anthropicApiKey, config.anthropicModel);
  }
  return new MockAskEngine();
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProviderContext provider={auth}>
        <DeclarationsClientProvider client={client}>
          <AskEngineProvider engine={chooseAskEngine()}>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </AskEngineProvider>
        </DeclarationsClientProvider>
      </AuthProviderContext>
    </QueryClientProvider>
  </StrictMode>,
);
