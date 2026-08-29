import { createContext, useContext, type ReactNode } from 'react';
import type { AskEngine } from './ask-engine';

const Ctx = createContext<AskEngine | null>(null);

export function AskEngineProvider(props: { engine: AskEngine; children: ReactNode }) {
  return <Ctx.Provider value={props.engine}>{props.children}</Ctx.Provider>;
}

export function useAskEngine(): AskEngine {
  const engine = useContext(Ctx);
  if (!engine) throw new Error('AskEngineProvider is missing');
  return engine;
}
