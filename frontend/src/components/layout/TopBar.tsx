import { useState } from 'react';
import { IconSearch, IconChevron, IconChevronRight, IconCheck } from '../icons';
import { useAuth } from '../../context/AuthContext';

type Screen = 'wallets' | 'ledger' | 'inbox' | 'recon' | 'wallet-detail';

interface TopBarProps {
  screen: Screen;
  walletId?: string;
  onBack?: () => void;
}

const operators = [
  { name: 'Imani Okafor',    role: 'Operator', init: 'IO', active: true },
  { name: 'June Park',       role: 'Operator', init: 'JP' },
  { name: 'Dr. Tom Reilly',  role: 'Reviewer', init: 'TR' },
  { name: 'Service Account', role: 'API',       init: 'SA' },
];

interface Crumb {
  label: string;
  mono?: boolean;
  muted?: boolean;
  onClick?: () => void;
}

export default function TopBar({ screen, walletId, onBack }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const current = operators.find((o) => o.active)!;

  const crumbs: Crumb[] = [];
  if (screen === 'wallets') {
    crumbs.push({ label: 'Wallets' });
  } else if (screen === 'wallet-detail') {
    crumbs.push({ label: 'Wallets', onClick: onBack });
    crumbs.push({ label: walletId ?? '', mono: true });
  } else if (screen === 'ledger') {
    crumbs.push({ label: 'Ledger' });
  } else if (screen === 'inbox') {
    crumbs.push({ label: 'Inbox' });
  } else if (screen === 'recon') {
    crumbs.push({ label: 'Reconciliation' });
  }

  return (
    <header className="h-11 shrink-0 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
      <div className="flex items-center gap-1.5 text-xs">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <IconChevronRight className="w-3 h-3 text-slate-300" />}
            <button
              onClick={c.onClick}
              className={`${c.mono ? 'font-mono text-xs' : ''} ${
                c.onClick ? 'text-slate-500 hover:text-slate-800' : 'text-slate-800 font-medium'
              } ${c.muted ? 'text-slate-500' : ''}`}
            >
              {c.label}
            </button>
          </span>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="h-7 px-2 rounded border border-slate-200 hover:bg-slate-50/80 transition-colors text-xs text-slate-600 flex items-center gap-1.5">
          <IconSearch className="w-3.5 h-3.5" />
          <span>Search</span>
          <span className="ml-2 font-mono text-xs px-1 py-0.5 bg-slate-100 rounded text-slate-500">⌘K</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="h-7 pl-1 pr-2 rounded border border-slate-200 hover:bg-slate-50/80 transition-colors flex items-center gap-2"
          >
            <span className="w-5 h-5 rounded bg-slate-800 text-white text-xs font-semibold grid place-items-center font-mono">
              {user ? user.username.slice(0, 2).toUpperCase() : current.init}
            </span>
            <span className="text-xs font-medium text-slate-700">{user ? user.username : current.name.split(' ')[0]}</span>
            <span className="text-xs text-slate-500 px-1 py-0.5 rounded bg-slate-100">{current.role}</span>
            <IconChevron className="w-3 h-3 text-slate-500" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-9 w-64 bg-white border border-slate-200 rounded-md py-1 z-20 shadow-sm">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Switch operator</div>
                </div>
                {operators.map((o) => (
                  <button key={o.name} className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50/80 transition-colors">
                    <span className="w-6 h-6 rounded bg-slate-800 text-white text-xs font-semibold grid place-items-center font-mono">
                      {o.init}
                    </span>
                    <span className="text-xs text-slate-700 text-left flex-1">
                      <div className="font-medium">{o.name}</div>
                      <div className="text-xs text-slate-500">{o.role}</div>
                    </span>
                    {o.active && <IconCheck className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button className="w-full px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50/80 transition-colors text-left">Settings</button>
                  <button onClick={logout} className="w-full px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50/80 transition-colors text-left">Sign out</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
