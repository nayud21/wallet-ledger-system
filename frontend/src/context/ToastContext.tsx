import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type ToastKind = 'success' | 'error' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  subtitle?: string;
  duration: number;
  endsAt: number;
  persistent: boolean;
}

interface ToastInput {
  kind?: ToastKind;
  title: string;
  subtitle?: string;
  duration?: number;
  persistent?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (t: ToastInput) => void;
  dismiss: (id: number) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let _id = 0;
const MAX = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: ToastInput) => {
    const id = ++_id;
    const duration = t.duration ?? 4000;
    const next: Toast = {
      id,
      kind: t.kind ?? 'success',
      title: t.title,
      subtitle: t.subtitle,
      duration,
      endsAt: Date.now() + duration,
      persistent: !!t.persistent,
    };
    setToasts(prev => [...prev, next].slice(-MAX));
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clear = useCallback(() => setToasts([]), []);

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss, clear }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
