import { useCallback, useEffect, useState } from 'react';
import type { Toast } from '../../context/ToastContext';
import { useToast } from '../../context/ToastContext';

const Icons = {
  success: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 8.5l3.5 3.5L13 4.5"/>
    </svg>
  ),
  error: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}>
      <path d="M4 4l8 8M12 4l-8 8"/>
    </svg>
  ),
  warning: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 4.5v4.5"/>
      <circle cx="8" cy="11.5" r=".6" fill="currentColor" stroke="none"/>
    </svg>
  ),
};

const META = {
  success: { iconBg: 'bg-emerald-500', barBg: 'bg-indigo-600' },
  error:   { iconBg: 'bg-rose-600',    barBg: 'bg-rose-600' },
  warning: { iconBg: 'bg-amber-500',   barBg: 'bg-amber-500' },
} as const;

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = Icons[toast.kind];
  const meta = META[toast.kind];
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);

  const requestExit = useCallback(() => {
    setExiting(true);
    setTimeout(onDismiss, 150);
  }, [onDismiss]);

  useEffect(() => {
    if (toast.persistent || paused) return;
    const remaining = toast.endsAt - Date.now();
    if (remaining <= 0) { requestExit(); return; }
    const t = setTimeout(requestExit, remaining);
    return () => clearTimeout(t);
  }, [paused, toast.endsAt, toast.persistent, requestExit]);

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`pointer-events-auto w-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ${exiting ? 'toast-exit' : 'toast-enter'}`}
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        <div className={`w-4 h-4 mt-0.5 rounded-full ${meta.iconBg} text-white grid place-items-center shrink-0`}>
          <Icon className="w-2.5 h-2.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-900 leading-tight">{toast.title}</div>
          {toast.subtitle && <div className="text-xs text-slate-500 mt-0.5 truncate">{toast.subtitle}</div>}
        </div>
        <button
          onClick={requestExit}
          className="text-slate-400 hover:text-slate-700 shrink-0 -mr-1 -mt-0.5 w-6 h-6 grid place-items-center rounded hover:bg-slate-100"
          aria-label="Dismiss"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-3.5 h-3.5">
            <path d="M4 4l8 8M12 4l-8 8"/>
          </svg>
        </button>
      </div>
      {!toast.persistent && (
        <div className="h-[2px] bg-slate-100">
          <div
            className={`h-full ${meta.barBg} progress-fill ${paused ? 'progress-paused' : ''}`}
            style={{ '--toast-dur': `${toast.duration}ms` } as React.CSSProperties}
          />
        </div>
      )}
    </div>
  );
}

export default function ToastHost() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[320px] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}
