/** Typed access to build-time configuration. All wiring decisions live in main.tsx. */
export type AskEngineKind = 'mock' | 'api' | 'anthropic-dev';

export interface AppConfig {
  /** null = in-memory mock data client. */
  apiBase: string | null;
  askEngine: AskEngineKind;
  anthropicApiKey: string;
  anthropicModel: string;
}

export function readConfig(): AppConfig {
  const env = import.meta.env;
  const apiBase = (env.VITE_API_BASE as string | undefined)?.trim() || null;
  const engine = ((env.VITE_ASK_ENGINE as string | undefined)?.trim() || 'mock') as AskEngineKind;
  return {
    apiBase,
    askEngine: engine,
    anthropicApiKey: ((env.VITE_ANTHROPIC_API_KEY as string | undefined) ?? '').trim(),
    anthropicModel: ((env.VITE_ANTHROPIC_MODEL as string | undefined) ?? '').trim() || 'claude-opus-5',
  };
}
