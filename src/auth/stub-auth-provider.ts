import type { AuthProvider, AuthUser } from './auth-provider';

/** Local-dev stand-in: a signed-in compliance user, no MSAL dependency. */
export class StubAuthProvider implements AuthProvider {
  getUser(): AuthUser {
    return { name: 'Astrid Lindqvist', initials: 'AL', role: 'Customs & trade compliance' };
  }

  acquireToken(): Promise<string> {
    return Promise.resolve('stub-token-local-dev');
  }

  signOut(): Promise<void> {
    // Real implementation redirects to the Entra External ID logout endpoint.
    console.info('StubAuthProvider: sign-out is a no-op in local dev');
    return Promise.resolve();
  }
}
