/**
 * Authentication seam. The product sits behind CIAM (Microsoft Entra External ID);
 * this interface is the only thing the rest of the app knows about it.
 * Production wiring (@azure/msal-browser) is documented in
 * docs/auth-entra-external-id.md — swap StubAuthProvider for MsalAuthProvider
 * in src/main.tsx without touching any feature code.
 */
export interface AuthUser {
  name: string;
  initials: string;
  role: string;
}

export interface AuthProvider {
  getUser(): AuthUser;
  /** Access token for the given API scopes; attached as a Bearer header. */
  acquireToken(scopes: readonly string[]): Promise<string>;
  signOut(): Promise<void>;
}

/** The delegated permission the SPA requests for the declarations API. */
export const API_SCOPES = ['api://customs-insights/Declarations.Read'] as const;
