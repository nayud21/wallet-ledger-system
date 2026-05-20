import { useState, ReactNode } from 'react';
import { IconChevron } from '../icons';

interface CollapsiblePanelProps {
  title: string;
  defaultOpen?: boolean;
  badge?: string;
  children: ReactNode;
}

export default function CollapsiblePanel({ title, defaultOpen = true, badge, children }: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border border-slate-200 rounded-md">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 h-9 border-b border-slate-200 hover:bg-slate-50"
      >
        <IconChevron
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`}
        />
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        {badge && (
          <span className="ml-auto text-[10px] text-slate-500 font-mono">{badge}</span>
        )}
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}
