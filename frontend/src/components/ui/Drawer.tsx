import { ReactNode } from 'react';
import { IconClose } from '../icons';

interface DrawerProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Drawer({ title, subtitle, onClose, children, footer }: DrawerProps) {
  return (
    <>
      <div className="fixed inset-0 bg-slate-900/10 z-30" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[440px] bg-white border-l border-slate-200 z-40 drawer-enter flex flex-col">
        <div className="flex items-center px-3 h-11 border-b border-slate-200">
          <div className="min-w-0">
            {subtitle && (
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
                {subtitle}
              </div>
            )}
            <div className="font-mono text-xs text-slate-800 truncate">{title}</div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto h-7 w-7 grid place-items-center text-slate-500 hover:bg-slate-100 rounded"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
        {footer && (
          <div className="border-t border-slate-200 p-3 flex items-center gap-2">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
