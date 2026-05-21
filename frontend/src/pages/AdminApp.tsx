import { useState } from 'react';
import Layout from '../components/layout/Layout';
import WalletsPage from './WalletsPage';
import LedgerPage from './LedgerPage';
import InboxPage from './InboxPage';

type AdminScreen = 'wallets' | 'ledger' | 'inbox' | 'recon';

export default function AdminApp() {
  const [screen, setScreen] = useState<AdminScreen>('wallets');

  return (
    <Layout screen={screen} onNavigate={setScreen}>
      {screen === 'wallets' && <WalletsPage />}
      {screen === 'ledger' && <LedgerPage />}
      {screen === 'inbox' && <InboxPage />}
      {screen === 'recon' && <div className="p-6 text-sm text-slate-500">Reconciliation — coming soon</div>}
    </Layout>
  );
}
