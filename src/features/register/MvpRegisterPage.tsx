import { useNavigate } from '@tanstack/react-router';
import { RegisterPage } from './RegisterPage';

/** The register as the MVP hosts it: rows open the declaration page, reports are a selector. */
export function MvpRegisterPage() {
  const navigate = useNavigate();
  return (
    <RegisterPage
      reportBar
      onOpenDeclaration={(mrn) => void navigate({ to: '/mvp/declarations/$mrn', params: { mrn } })}
    />
  );
}
