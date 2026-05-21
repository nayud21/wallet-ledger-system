import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWallets } from '../../hooks/useWallets';
import { useWalletStream } from '../../hooks/useWalletStream';

const WalletLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    <rect x="2" y="6" width="20" height="14" rx="3" fill="#4f46e5"/>
    <rect x="2" y="6" width="20" height="14" rx="3" stroke="#3730a3" strokeWidth="0.5"/>
    <rect x="15" y="11" width="6" height="4" rx="1" fill="#a5b4fc"/>
    <circle cx="18" cy="13" r="0.9" fill="#3730a3"/>
    <path d="M2 9c2-2 6-3 10-3s8 1 10 3" stroke="#6366f1" strokeWidth="0.6" fill="none"/>
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M9 3H4a1 1 0 00-1 1v8a1 1 0 001 1h5"/><path d="M11 5l3 3-3 3M14 8H7"/>
  </svg>
);

interface ConsumerLayoutProps {
  children: ReactNode;
}

function WalletStreamListener() {
  const { user } = useAuth();
  const { data: wallets } = useWallets(user!.id);
  useWalletStream(wallets?.map(w => w.id) ?? []);
  return null;
}

export default function ConsumerLayout({ children }: ConsumerLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
    <WalletStreamListener />
    <div className="min-h-screen bg-slate-50">
      {/* AppBar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center">
          <div className="flex items-center gap-2">
            <WalletLogo />
            <span className="font-semibold text-[15px] tracking-tight">MyWallet</span>
          </div>

          <nav className="ml-8 flex items-center gap-1">
            {[
              { to: '/dashboard', label: 'Dashboard' },
              { to: '/send',      label: 'Send' },
              { to: '/history',   label: 'History' },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 h-8 rounded-md text-sm font-medium flex items-center transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Hi, <span className="text-slate-900 font-medium">{user?.username}</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-rose-600 inline-flex items-center gap-1.5 px-2 h-8 rounded-md hover:bg-slate-100 transition-colors"
            >
              <LogoutIcon />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
    </>
  );
}
