import { RegisterPage } from '../register/RegisterPage';
import { useAskSession } from './ask-session';

/**
 * The register as the AI surface hosts it — the same component as the MVP's,
 * with rows opening in the declaration drawer so the Ask canvas is kept, and
 * no report selector: here a report is something you ask for.
 */
export function AiRegisterPage() {
  const session = useAskSession();
  return (
    <RegisterPage
      reportBar={false}
      onOpenDeclaration={session.openDrawer}
      handoff={session.handoff}
      onClearHandoff={() => session.setHandoff(null)}
    />
  );
}
