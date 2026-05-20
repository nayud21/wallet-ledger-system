import { useState } from 'react';
import Layout from './components/layout/Layout';
import WalletsPage from './pages/WalletsPage';
import LedgerPage from './pages/LedgerPage';

type Page = 'wallets' | 'ledger' | 'inbox' | 'recon';

export default function App() {
  const [page, setPage] = useState<Page>('wallets');

  return (
    <Layout screen={page} onNavigate={setPage}>
      {page === 'wallets' && <WalletsPage />}
      {page === 'ledger' && <LedgerPage />}
      {page === 'inbox' && (
        <div className="p-6 text-sm text-slate-500">Inbox — coming soon</div>
      )}
      {page === 'recon' && (
        <div className="p-6 text-sm text-slate-500">Reconciliation — coming soon</div>
      )}
    </Layout>
  );
}
