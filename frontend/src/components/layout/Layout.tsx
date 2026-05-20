import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

type Screen = 'wallets' | 'ledger' | 'inbox' | 'recon' | 'wallet-detail';

interface LayoutProps {
  screen: Screen;
  walletId?: string;
  onNavigate: (screen: 'wallets' | 'ledger' | 'inbox' | 'recon') => void;
  onBack?: () => void;
  children: ReactNode;
}

export default function Layout({ screen, walletId, onNavigate, onBack, children }: LayoutProps) {
  const sidebarScreen = screen === 'wallet-detail' ? 'wallets' : screen;

  return (
    <div className="flex min-h-screen" style={{ minWidth: 1280 }}>
      <Sidebar
        screen={sidebarScreen as 'wallets' | 'ledger' | 'inbox' | 'recon'}
        onNavigate={onNavigate}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar screen={screen} walletId={walletId} onBack={onBack} />
        <main className="flex-1 overflow-auto bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
