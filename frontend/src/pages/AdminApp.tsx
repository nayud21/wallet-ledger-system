import { useState } from 'react';
import Layout from '../components/layout/Layout';
import WalletsPage from './WalletsPage';
import LedgerPage from './LedgerPage';
import InboxPage from './InboxPage';
import ReconciliationPage from './ReconciliationPage';

type AdminScreen = 'wallets' | 'ledger' | 'inbox' | 'recon';

export default function AdminApp() {
  const [screen, setScreen] = useState<AdminScreen>('wallets');

  return (
    <Layout screen={screen} onNavigate={setScreen}>
      {screen === 'wallets' && <WalletsPage />}
      {screen === 'ledger' && <LedgerPage />}
      {screen === 'inbox' && <InboxPage />}
      {screen === 'recon' && <ReconciliationPage />}
    </Layout>
  );
}
