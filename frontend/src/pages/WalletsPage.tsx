import { useState } from 'react';
import { useWallets, useCreateWallet } from '../hooks/useWallets';
import WalletTable from '../components/wallets/WalletTable';
import WalletDetail from '../components/wallets/WalletDetail';
import KpiStrip from '../components/kpi/KpiStrip';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

export default function WalletsPage() {
  const [userId, setUserId] = useState('');
  const [debouncedUserId, setDebouncedUserId] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: wallets, isLoading, error } = useWallets(debouncedUserId || undefined, statusFilter);
  const { mutate: createWallet, isPending: creating, error: createError } = useCreateWallet();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [newUserId, setNewUserId] = useState('');
  const [newCurrency, setNewCurrency] = useState('');

  function handleSearch() {
    setDebouncedUserId(userId);
    setSelectedId(null);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createWallet(
      { userId: newUserId, currency: newCurrency.toUpperCase() },
      {
        onSuccess: () => {
          setNewUserId('');
          setNewCurrency('');
          setShowCreate(false);
        },
      },
    );
  }

  const STATUS_TABS = [
    { label: 'All',    value: undefined },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Frozen', value: 'FROZEN' },
  ] as const;

  return (
    <div className="max-w-[1440px] mx-auto p-4 flex flex-col gap-3 h-full">
      <KpiStrip />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Wallets</h1>
          <p className="text-xs text-slate-500">
            {wallets ? `${wallets.length} wallets` : '—'} · last sync just now
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-0 border border-slate-200 rounded overflow-hidden">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => { setStatusFilter(tab.value); setSelectedId(null); }}
                className={`h-7 px-3 text-xs border-r border-slate-200 last:border-r-0 transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50/80 transition-colors'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm">Filter</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ Create Wallet</Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Filter by User ID…"
          className="flex-1 h-7 rounded border border-slate-200 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <Button variant="secondary" size="sm" onClick={handleSearch}>Search</Button>
      </div>

      {/* Main area: table + detail */}
      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-auto">
          {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
          {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}
          {wallets && wallets.length === 0 && (
            <p className="text-sm text-slate-400">No wallets found.</p>
          )}
          {wallets && wallets.length > 0 && (
            <WalletTable
              wallets={wallets}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {selectedId && (
          <div className="w-80 shrink-0 overflow-auto rounded border border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
              <h2 className="text-[13px] font-semibold text-slate-700">Wallet Detail</h2>
              <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>
            <div className="p-4">
              <WalletDetail walletId={selectedId} />
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Create Wallet" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">User ID</span>
              <input type="text" required value={newUserId} onChange={(e) => setNewUserId(e.target.value)}
                placeholder="uuid"
                className="h-7 rounded border border-slate-200 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">Currency</span>
              <input type="text" required maxLength={3} value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                className="h-7 rounded border border-slate-200 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" />
            </label>
{createError && <p className="text-xs text-red-600">{(createError as Error).message}</p>}
            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
