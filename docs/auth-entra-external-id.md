# Auth — Microsoft Entra External ID (CIAM)

The app is written against the `AuthProvider` seam (src/auth/auth-provider.ts).
Local dev uses `StubAuthProvider`. Production swaps in an MSAL-backed provider
in **src/main.tsx only** — no feature code changes.

## App registrations

1. **API app**: expose scope `Declarations.Read` under
   `api://customs-insights` (the value in `API_SCOPES`). The API validates the
   bearer token and derives the tenant/customer from claims — the customer id
   never travels as a query parameter.
2. **SPA app**: platform "Single-page application", redirect URI of the web
   app, authorization-code flow with PKCE. Grant it the API scope.
3. Users live in the External ID tenant (`{tenant}.ciamlogin.com`); sign-in is
   a user flow with the customer's IdP federated if required.

## MsalAuthProvider sketch

```ts
import { PublicClientApplication } from '@azure/msal-browser';
import type { AuthProvider, AuthUser } from './auth-provider';

export class MsalAuthProvider implements AuthProvider {
  constructor(private readonly pca: PublicClientApplication) {}

  getUser(): AuthUser {
    const a = this.pca.getActiveAccount();
    if (!a) throw new Error('Not signed in');
    const name = a.name ?? a.username;
    return {
      name,
      initials: name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
      role: (a.idTokenClaims?.roles as string[] | undefined)?.[0] ?? '',
    };
  }

  async acquireToken(scopes: readonly string[]): Promise<string> {
    const account = this.pca.getActiveAccount() ?? undefined;
    try {
      return (await this.pca.acquireTokenSilent({ scopes: [...scopes], account })).accessToken;
    } catch {
      await this.pca.acquireTokenRedirect({ scopes: [...scopes] });
      return new Promise(() => {}); // redirect navigates away
    }
  }

  signOut(): Promise<void> {
    return this.pca.logoutRedirect();
  }
}
```

Bootstrapping (before render): `initialize()`, `handleRedirectPromise()`, and
if no active account, `loginRedirect({ scopes: API_SCOPES })`. Only then mount
React — the app can assume a signed-in user everywhere.

## Notes for the engineering discussion

- Tokens stay in memory/session storage per MSAL defaults; the SPA never sees
  client secrets.
- `HttpDeclarationsClient` already attaches `Authorization: Bearer` from
  `acquireToken(API_SCOPES)` on every request — 401 handling should trigger a
  silent refresh then redirect.
- Multi-entity authorisation (which legal entities a user may see) belongs in
  the API via token claims, not in the frontend entity dropdown — the dropdown
  is a filter, not a boundary.
