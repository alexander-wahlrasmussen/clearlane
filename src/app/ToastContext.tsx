import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import styles from './shell.module.css';

const Ctx = createContext<((message: string) => void) | null>(null);

/** App-wide transient toast — used for copy confirmations and prototype-only actions. */
export function ToastProvider(props: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((m: string) => {
    clearTimeout(timer.current);
    setMessage(m);
    timer.current = setTimeout(() => setMessage(null), 2800);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {props.children}
      {message && (
        <div className={styles.toast} role="status">
          {message}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast(): (message: string) => void {
  const show = useContext(Ctx);
  if (!show) throw new Error('ToastProvider is missing');
  return show;
}
