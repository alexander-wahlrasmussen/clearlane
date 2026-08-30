import { useState } from 'react';
import { useAllDeclarations, useScope } from '../../api/queries';
import { useEntityScope } from '../../app/entity-context';
import { LoadingScreen, ErrorScreen } from '../../app/StatusScreens';
import { DataScopePanel } from '../register/DataScopePanel';
import { useSavedViews } from '../register/saved-views-store';
import { BUILT_IN_VIEWS } from '../register/views';
import { useAskSession } from './ask-session';
import { AnswerCard } from './AnswerCard';
import { Briefing } from './Briefing';
import styles from './ask.module.css';

const SUGGESTIONS = [
  'How much duty did we pay in Germany since June?',
  'Top commodities by customs value',
  'Compare imports vs exports',
  'Monthly VAT trend for imports',
  'Customs value of textiles from Türkiye',
  'Declarations with data gaps',
  'Show goods lines for imports into Germany this month',
  'VAT report for Q2',
];

export function AskPage() {
  const [question, setQuestion] = useState('');
  const session = useAskSession();
  const scope = useScope();
  const decls = useAllDeclarations(useEntityScope());
  const [savedViews] = useSavedViews();

  if (scope.isPending || decls.isPending) return <LoadingScreen />;
  if (scope.isError || decls.isError) {
    return (
      <ErrorScreen
        onRetry={() => {
          void scope.refetch();
          void decls.refetch();
        }}
      />
    );
  }

  const asOf = scope.data.refreshedAt.slice(0, 10);
  const submit = () => {
    const q = question.trim();
    if (!q) return;
    session.ask(q);
    setQuestion('');
  };

  return (
    <div className={styles.page} data-screen-label="Ask">
      <div className={styles.askCard}>
        <div className={styles.askRow}>
          <input
            className={styles.askInput}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Ask about your declarations — e.g. How much duty did we pay in Germany since June?"
            aria-label="Ask about your customs data"
          />
          <button type="button" className={styles.askBtn} onClick={submit}>
            Ask
          </button>
        </div>
        <div className={styles.suggRow}>
          <span className={styles.suggLabel}>Try:</span>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className={styles.suggChip} onClick={() => session.ask(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className={styles.suggRow}>
          <span className={styles.suggLabel}>Reports:</span>
          {[...BUILT_IN_VIEWS, ...savedViews].map((v) => (
            <button key={v.id} type="button" className={styles.suggChip} onClick={() => session.askView(v)}>
              {v.name}
            </button>
          ))}
        </div>
        <div className={styles.trustNote}>
          <span className={styles.trustTick}>✓</span> AI interprets your question — every number is
          computed directly from your declaration data. Nothing is estimated. A report is a question
          whose interpretation is already known: its rows, columns and filters, the same here as in the
          register.
        </div>
      </div>

      <DataScopePanel scope={scope.data} />

      <Briefing decls={decls.data} asOf={asOf} refreshedAt={scope.data.refreshedAt} />

      {session.cards.length > 0 ? (
        <div className={styles.feed}>
          {session.cards.map((card) => (
            <AnswerCard key={card.id} card={card} decls={decls.data} asOf={asOf} />
          ))}
        </div>
      ) : (
        <div className={styles.feedEmpty}>
          Answers you ask for will appear here. Each one stays on the canvas until you remove it,
          and can be added to a report draft.
        </div>
      )}
    </div>
  );
}
