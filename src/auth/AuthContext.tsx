import { createContext, useContext, type ReactNode } from 'react';
import type { AuthProvider } from './auth-provider';

const AuthContext = createContext<AuthProvider | null>(null);

export function AuthProviderContext(props: { provider: AuthProvider; children: ReactNode }) {
  return <AuthContext.Provider value={props.provider}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthProvider {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProviderContext is missing');
  return auth;
}
