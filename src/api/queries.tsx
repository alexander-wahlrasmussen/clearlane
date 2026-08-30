import { createContext, useContext, type ReactNode } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { DeclarationFilter, DeclarationsClient, ListParams } from './declarations-client';

const ClientContext = createContext<DeclarationsClient | null>(null);

export function DeclarationsClientProvider(props: { client: DeclarationsClient; children: ReactNode }) {
  return <ClientContext.Provider value={props.client}>{props.children}</ClientContext.Provider>;
}

export function useDeclarationsClient(): DeclarationsClient {
  const client = useContext(ClientContext);
  if (!client) throw new Error('DeclarationsClientProvider is missing');
  return client;
}

export const queryKeys = {
  scope: ['scope'] as const,
  list: (p: ListParams) => ['declarations', p] as const,
  summary: (f: DeclarationFilter) => ['declarations-summary', f] as const,
  declaration: (mrn: string) => ['declaration', mrn] as const,
  lines: (p: ListParams) => ['goods-lines', p] as const,
  all: (f: DeclarationFilter) => ['declarations-all', f] as const,
};

export function useScope() {
  const client = useDeclarationsClient();
  return useQuery({ queryKey: queryKeys.scope, queryFn: () => client.getScope(), staleTime: Infinity });
}

export function useDeclarationsList(params: ListParams, enabled = true) {
  const client = useDeclarationsClient();
  return useQuery({
    queryKey: queryKeys.list(params),
    queryFn: () => client.listDeclarations(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useGoodsLinesList(params: ListParams, enabled = true) {
  const client = useDeclarationsClient();
  return useQuery({
    queryKey: queryKeys.lines(params),
    queryFn: () => client.listGoodsLines(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRegisterSummary(filter: DeclarationFilter) {
  const client = useDeclarationsClient();
  return useQuery({
    queryKey: queryKeys.summary(filter),
    queryFn: () => client.getRegisterSummary(filter),
    placeholderData: keepPreviousData,
  });
}

export function useDeclaration(mrn: string) {
  const client = useDeclarationsClient();
  return useQuery({ queryKey: queryKeys.declaration(mrn), queryFn: () => client.getDeclaration(mrn) });
}

export function useAllDeclarations(filter: DeclarationFilter, enabled = true) {
  const client = useDeclarationsClient();
  return useQuery({
    queryKey: queryKeys.all(filter),
    queryFn: () => client.listAllDeclarations(filter),
    enabled,
  });
}
