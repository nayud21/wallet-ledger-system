import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWallets, useWalletEntries } from '../../hooks/useWallets';
import ConsumerLayout from '../../components/consumer/ConsumerLayout';
import TxnRow from '../../components/consumer/TxnRow';
import { fmtMoney, fmtDayLabel } from '../../utils/format';
import type { LedgerEntryResponse } from '../../types/api';

type Filter = 'all' | 'received' | 'sent';

// Fetches entries for one wallet and returns them — used inside HistoryPage
function useAllEntries(walletIds: string[]) {
  // Fetch entries for each wallet individually; merge at component level
  // This is a simplified approach — works for users with few wallets
  const q0 = useWalletEntries(walletIds[0] ?? null);
  const q1 = useWalletEntries(walletIds[1] ?? null);
  const q2 = useWalletEntries(walletIds[2] ?? null);

  const all = [
    ...(q0.data ?? []),
    ...(q1.data ?? []),
    ...(q2.data ?? []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    entries: all,
    isLoading: q0.isLoading || q1.isLoading || q2.isLoading,
  };
}

export default function HistoryPage() {
  const { user } = useAuth();
  const { data: wallets } = useWallets(user!.id);
  const walletIds = wallets?.map(w => w.id) ?? [];

  const { entries, isLoading } = useAllEntries(walletIds);

  const [filter, setFilter] = useState<Filter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [visible, setVisible] = useState(20);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filter === 'received' && e.direction !== 'CREDIT') return false;
      if (filter === 'sent' && e.direction !== 'DEBIT') return false;
      if (fromDate && e.createdAt < fromDate) return false;
      if (toDate && e.createdAt > toDate + 'T23:59:59') return false;
      return true;
    });
  }, [entries, filter, fromDate, toDate]);

  const shown = filtered.slice(0, visible);

  const groups = useMemo(() => {
    const map = new Map<string, LedgerEntryResponse[]>();
    shown.forEach(e => {
      const key = e.createdAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return [...map.entries()];
  }, [shown]);

  const totals = useMemo(() => {
    const usd = filtered.filter(e => e.currency === 'USD');
    const recv = usd.filter(e => e.direction === 'CREDIT').reduce((s, e) => s + e.amount, 0);
    const sent = usd.filter(e => e.direction === 'DEBIT').reduce((s, e) => s + e.amount, 0);
    return { recv, sent, net: recv - sent };
  }, [filtered]);

  const CalendarIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1"/><path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2"/>
    </svg>
  );
  const ChevronIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M4 6l4 4 4-4"/>
    </svg>
  );

  return (
    <ConsumerLayout>
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-[22px] font-semibold tracking-tight">Transaction history</div>
          <div className="text-sm text-slate-500 mt-0.5">All movements across your wallets.</div>
        </div>
      </div>

      {/* Totals strip (USD only) */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Received</div>
          <div className="text-lg font-semibold text-emerald-600 mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
            +{fmtMoney(totals.recv)}
          </div>
          <div className="text-[11px] text-slate-400">USD · {filtered.filter(e => e.direction === 'CREDIT').length} txns</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Sent</div>
          <div className="text-lg font-semibold text-rose-600 mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
            −{fmtMoney(totals.sent)}
          </div>
          <div className="text-[11px] text-slate-400">USD · {filtered.filter(e => e.direction === 'DEBIT').length} txns</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Net</div>
          <div className={`text-lg font-semibold mt-1 ${totals.net >= 0 ? 'text-slate-900' : 'text-rose-600'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {totals.net >= 0 ? '+' : '−'}{fmtMoney(Math.abs(totals.net))}
          </div>
          <div className="text-[11px] text-slate-400">USD only</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center gap-2 flex-wrap mb-3">
        <div className="inline-flex h-8 bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-xs">
          {([['all','All'], ['received','Received'], ['sent','Sent']] as [Filter, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => { setFilter(k); setVisible(20); }}
              className={`px-2.5 h-full rounded-md flex items-center gap-1 transition-colors ${
                filter === k ? 'bg-white border border-slate-200 text-slate-800 font-medium' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-slate-200" />

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-medium">From</span>
          <div className="relative">
            <CalendarIcon />
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="h-8 pl-7 pr-2 text-xs border border-slate-200 rounded-md bg-white font-mono focus:outline-none focus:border-indigo-400" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-medium">To</span>
          <div className="relative">
            <CalendarIcon />
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="h-8 pl-7 pr-2 text-xs border border-slate-200 rounded-md bg-white font-mono focus:outline-none focus:border-indigo-400" />
          </div>
        </div>

        <div className="ml-auto text-xs text-slate-500">
          <span className="text-slate-800 font-medium">{filtered.length}</span> transactions
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">No transactions found.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl px-4 divide-y divide-slate-100">
          {groups.map(([day, list]) => (
            <div key={day} className="py-2">
              <div className="flex items-center justify-between py-2">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">{fmtDayLabel(day + 'T00:00:00')}</div>
                <div className="text-[11px] text-slate-400">{list.length} {list.length === 1 ? 'transaction' : 'transactions'}</div>
              </div>
              <div className="divide-y divide-slate-100">
                {list.map(e => <TxnRow key={e.id} entry={e} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center mt-4">
        {visible < filtered.length ? (
          <button
            onClick={() => setVisible(v => v + 20)}
            className="h-9 px-4 text-sm inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            Load more
            <span className="text-xs text-slate-400">({filtered.length - visible} remaining)</span>
            <ChevronIcon />
          </button>
        ) : entries.length > 0 ? (
          <div className="text-xs text-slate-400">— end of history —</div>
        ) : null}
      </div>
    </ConsumerLayout>
  );
}
