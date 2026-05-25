import { ReactNode, useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWallets } from '../../hooks/useWallets';
import { useWalletStream } from '../../hooks/useWalletStream';
import { Icon } from './ui/icons';

interface ConsumerLayoutProps {
  children: ReactNode;
}

function WalletStreamListener() {
  const { user } = useAuth();
  const { data: wallets } = useWallets(user!.id);
  useWalletStream(wallets?.map((w) => w.id) ?? []);
  return null;
}

const NAV_PRIMARY = [
  { to: '/dashboard', label: 'Dashboard', icon: Icon.Dashboard },
  { to: '/wallets',   label: 'Wallets',   icon: Icon.Wallet },
  { to: '/send',      label: 'Send',      icon: Icon.Send },
  { to: '/top-up',    label: 'Top Up',    icon: Icon.TopUp },
  { to: '/exchange',  label: 'Exchange',  icon: Icon.Exchange },
  { to: '/cards',     label: 'Cards',     icon: Icon.Cards },
  { to: '/history',   label: 'History',   icon: Icon.History },
];

const NAV_SYSTEM = [
  { to: '/settings', label: 'Settings',     icon: Icon.Settings },
  { to: '/help',     label: 'Help & Support', icon: Icon.Help },
];

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/wallets':   'Wallets',
  '/send':      'Send',
  '/top-up':    'Top Up',
  '/exchange':  'Exchange',
  '/cards':     'Cards',
  '/history':   'History',
  '/settings':  'Settings',
  '/help':      'Help & Support',
};

function initialsOf(name?: string) {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || name.slice(0, 2).toUpperCase();
}

function Sidebar({ username, onLogout }: { username: string; onLogout: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="h-14 px-4 flex items-center gap-2 border-b border-slate-200">
        <Icon.Logo className="w-7 h-7" />
        <div className="leading-tight">
          <div className="font-semibold text-[14px] tracking-tight">MyWallet</div>
          <div className="text-[10px] text-slate-400 font-mono">consumer · v2.0</div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wider text-slate-400 font-medium">Account</div>
        {NAV_PRIMARY.map((it) => {
          const I = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <I className={`w-[18px] h-[18px] ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{it.label}</span>
                </>
              )}
            </NavLink>
          );
        })}

        <div className="px-2 pt-4 pb-1 text-[10px] uppercase tracking-wider text-slate-400 font-medium">System</div>
        {NAV_SYSTEM.map((it) => {
          const I = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <I className={`w-[18px] h-[18px] ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{it.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-2 border-t border-slate-200 relative" ref={menuRef}>
        {menuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 hover:text-rose-600"
            >
              <Icon.Logout className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[12px] font-semibold grid place-items-center font-mono">
            {initialsOf(username)}
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="text-[13px] font-medium text-slate-800 truncate">{username}</div>
            <div className="text-[11px] text-slate-500 truncate">@{username.toLowerCase()}</div>
          </div>
          <Icon.Chevron className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </aside>
  );
}

function TopBar({ username, onLogout }: { username: string; onLogout: () => void }) {
  const loc = useLocation();
  const title = ROUTE_TITLES[loc.pathname] ?? loc.pathname.replace(/^\//, '') ?? '';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center px-6 gap-4">
      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-slate-400">MyWallet</span>
        <Icon.ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-slate-800 font-medium capitalize">{title}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <Icon.Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search transactions, wallets…"
            className="h-9 w-72 pl-8 pr-12 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500">⌘K</span>
        </div>

        <button className="h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-600 relative">
          <Icon.Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="h-9 pl-1 pr-2 rounded-lg hover:bg-slate-100 flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[11px] font-semibold grid place-items-center font-mono">
              {initialsOf(username)}
            </div>
            <span className="text-[13px] font-medium text-slate-700">{username}</span>
            <Icon.Chevron className="w-3 h-3 text-slate-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 hover:text-rose-600"
              >
                <Icon.Logout className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function ConsumerLayout({ children }: ConsumerLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const username = user?.username ?? '';

  return (
    <>
      <WalletStreamListener />
      <div className="min-h-screen flex bg-slate-100" style={{ minWidth: 1200 }}>
        <Sidebar username={username} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar username={username} onLogout={handleLogout} />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </>
  );
}
