import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAskEngine } from '../../ai/ask-engine-context';
import type { Interpretation, InterpretedQuestion } from '../../ai/ask-types';
import { extractFromView } from '../../ai/extract-view';
import type { RegisterHandoff } from '../register/RegisterPage';
import type { RegisterView } from '../register/views';

/**
 * State for one Ask session: the answer feed, report picks, and the
 * evidence/detail drawers. Lives at the AI-shell level so the Ask and
 * Declarations tabs share it (evidence hands off between them).
 */
export interface AskCard {
  id: number;
  question: string;
  pending: boolean;
  inReport: boolean;
  interpreted: InterpretedQuestion | null;
  failed: boolean;
}

export interface EvidenceSelection {
  title: string;
  mrns: string[];
}

interface AskSessionValue {
  cards: AskCard[];
  ask: (question: string) => void;
  /** Opens a report as an answer — no model call; its interpretation is its view. */
  askView: (view: RegisterView) => void;
  setInterpretation: (id: number, interpretation: Interpretation) => void;
  toggleReport: (id: number) => void;
  removeCard: (id: number) => void;
  reportCount: number;
  reportOpen: boolean;
  setReportOpen: (open: boolean) => void;
  evidence: EvidenceSelection | null;
  openEvidence: (e: EvidenceSelection) => void;
  closeEvidence: () => void;
  drawerMrn: string | null;
  openDrawer: (mrn: string) => void;
  closeDrawer: () => void;
  handoff: RegisterHandoff | null;
  setHandoff: (h: RegisterHandoff | null) => void;
}

const Ctx = createContext<AskSessionValue | null>(null);

export function AskSessionProvider(props: { children: ReactNode }) {
  const engine = useAskEngine();
  const [cards, setCards] = useState<AskCard[]>([]);
  const [seq, setSeq] = useState(1);
  const [reportOpen, setReportOpen] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceSelection | null>(null);
  const [drawerMrn, setDrawerMrn] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<RegisterHandoff | null>(null);

  const patchCard = useCallback((id: number, patch: Partial<AskCard>) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const ask = useCallback(
    (question: string) => {
      const id = seq;
      setSeq((s) => s + 1);
      setCards((cs) => [
        { id, question, pending: true, inReport: false, interpreted: null, failed: false },
        ...cs,
      ]);
      engine
        .interpret(question)
        .then((interpreted) => patchCard(id, { pending: false, interpreted }))
        .catch((err: unknown) => {
          console.error('Interpretation failed', err);
          patchCard(id, { pending: false, failed: true });
        });
    },
    [engine, seq, patchCard],
  );

  const askView = useCallback(
    (view: RegisterView) => {
      const id = seq;
      setSeq((s) => s + 1);
      setCards((cs) => [
        {
          id,
          question: view.name,
          pending: false,
          inReport: false,
          failed: false,
          interpreted: {
            question: view.name,
            interpretation: extractFromView(view),
            confidence: { low: false, message: '' },
          },
        },
        ...cs,
      ]);
    },
    [seq],
  );

  const value = useMemo<AskSessionValue>(
    () => ({
      cards,
      ask,
      askView,
      setInterpretation: (id, interpretation) =>
        setCards((cs) =>
          cs.map((c) =>
            c.id === id && c.interpreted
              ? { ...c, interpreted: { ...c.interpreted, interpretation } }
              : c,
          ),
        ),
      toggleReport: (id) =>
        setCards((cs) => cs.map((c) => (c.id === id ? { ...c, inReport: !c.inReport } : c))),
      removeCard: (id) => setCards((cs) => cs.filter((c) => c.id !== id)),
      reportCount: cards.filter((c) => c.inReport).length,
      reportOpen,
      setReportOpen,
      evidence,
      openEvidence: setEvidence,
      closeEvidence: () => setEvidence(null),
      drawerMrn,
      openDrawer: setDrawerMrn,
      closeDrawer: () => setDrawerMrn(null),
      handoff,
      setHandoff,
    }),
    [cards, ask, askView, reportOpen, evidence, drawerMrn, handoff],
  );

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useAskSession(): AskSessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('AskSessionProvider is missing');
  return v;
}
