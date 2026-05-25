import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWallets, useWalletEntries } from '../../hooks/useWallets';
import ConsumerLayout from '../../components/consumer/ConsumerLayout';
import Card from '../../components/consumer/ui/Card';
import Badge from '../../components/consumer/ui/Badge';
import Btn from '../../components/consumer/ui/Btn';
import { Icon } from '../../components/consumer/ui/icons';
import { TypeMeta, classifyEntry, deriveStatus, entryLabel } from '../../components/consumer/TxnTypeMeta';
import { fmtMoney } from '../../utils/format';

type DirFilter = 'all' | 'IN' | 'OUT';
type StatusFilter = 'all' | 'success' | 'pending' | 'failed';

const PAGE_SIZE = 15;

function useAllEntries(walletIds: string[]) {
  const q0 = useWalletEntries(walletIds[0] ?? null);
  const q1 = useWalletEntries(walletIds[1] ?? null);
  const q2 = useWalletEntries(walletIds[2] ?? null);
  const all = [
    ...(q0.data ?? []),
    ...(q1.data ?? []),
    ...(q2.data ?? []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { entries: all, isLoading: q0.isLoading || q1.isLoading || q2.isLoading };
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pad = (x: number) => String(x).padStart(2, '0');
  const h = d.getHours();
  const hh = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return {
    date: `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
    time: `${hh}:${pad(d.getMinutes())} ${ampm}`,
  };
}

export default function HistoryPage() {
  const { user } = useAuth();
  const { data: wallets } = useWallets(user!.id);
  const walletIds = wallets?.map((w) => w.id) ?? [];
  const { entries, isLoading } = useAllEntries(walletIds);

  const [dir, setDir] = useState<DirFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const d = e.direction === 'CREDIT' ? 'IN' : 'OUT';
      if (dir !== 'all' && d !== dir) return false;
      if (status !== 'all' && deriveStatus(e) !== status) return false;
      return true;
    });
  }, [entries, dir, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageIdx = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageIdx - 1) * PAGE_SIZE, pageIdx * PAGE_SIZE);

  return (
    <ConsumerLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900 leading-tight">Transactions</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">All movements across your wallets.</p>
          </div>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-200 flex-wrap">
            <div>
              <div className="text-[15px] font-semibold tracking-tight">Recent transactions</div>
              <div className="text-[12px] text-slate-500 mt-0.5">
                {filtered.length} of {entries.length} · across all wallets
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <div className="inline-flex h-8 bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-[12px]">
                {([['all','All'],['IN','Money in'],['OUT','Money out']] as [DirFilter, string][]).map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => { setDir(k); setPage(1); }}
                    className={`px-2.5 h-full rounded-md font-medium transition-colors ${dir === k ? 'bg-white text-slate-800 border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }}
                className="h-8 px-2 pr-7 text-[12px] bg-white border border-slate-200 rounded-lg appearance-none cursor-pointer hover:border-slate-300 font-medium select-caret"
              >
                <option value="all">All statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>

              <Btn variant="outline" size="sm"><Icon.Download className="w-3.5 h-3.5" />Export</Btn>
            </div>
          </div>

          <div className="grid grid-cols-[180px_2fr_1fr_120px_140px_36px] gap-4 px-5 py-2.5 border-b border-slate-200 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            <div>Date &amp; time</div>
            <div>Transaction</div>
            <div>Counterparty</div>
            <div>Status</div>
            <div className="text-right">Amount</div>
            <div />
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : pageRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No transactions found.</div>
          ) : (
            <div>
              {pageRows.map((e, i) => {
                const type = classifyEntry(e);
                const meta = TypeMeta[type];
                const TI = meta.icon;
                const dt = fmtDateTime(e.createdAt);
                const st = deriveStatus(e);
                const isLast = i === pageRows.length - 1;
                const isIn = e.direction === 'CREDIT';
                return (
                  <div
                    key={e.id}
                    className={`grid grid-cols-[180px_2fr_1fr_120px_140px_36px] gap-4 px-5 py-3 items-center hover:bg-slate-50 transition-colors ${!isLast ? 'border-b border-slate-100' : ''}`}
                  >
                    <div>
                      <div className="text-[13px] text-slate-800 font-medium">{dt.date}</div>
                      <div className="text-[11px] text-slate-500 num">{dt.time}</div>
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${meta.tone}`}>
                        <TI className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-slate-800 truncate flex items-center gap-1.5">
                          {entryLabel(e)}
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{meta.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">#{e.id}</div>
                      </div>
                    </div>
                    <div className="text-[12px] text-slate-600 truncate font-mono">#{e.ledgerTxId}</div>
                    <div>
                      <Badge tone={st}>{st[0].toUpperCase() + st.slice(1)}</Badge>
                    </div>
                    <div className="text-right">
                      <div className={`text-[14px] font-semibold num ${isIn ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isIn ? '+' : '−'}{fmtMoney(e.amount, e.currency)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{e.currency}</div>
                    </div>
                    <div className="text-slate-300">
                      <Icon.ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-[12px] text-slate-500 bg-slate-50/40">
            <div>
              Showing <span className="num text-slate-700 font-medium">{pageRows.length}</span> of{' '}
              <span className="num">{filtered.length}</span> transactions
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageIdx <= 1}
                className="h-7 w-7 grid place-items-center border border-slate-200 rounded-md hover:bg-white text-slate-400 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
                const p = i + 1;
                const active = p === pageIdx;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-7 w-7 grid place-items-center border border-slate-200 rounded-md num ${active ? 'bg-white text-slate-700 font-medium' : 'hover:bg-white text-slate-500'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageIdx >= totalPages}
                className="h-7 w-7 grid place-items-center border border-slate-200 rounded-md hover:bg-white text-slate-500 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                ›
              </button>
            </div>
          </div>
        </Card>
      </div>
    </ConsumerLayout>
  );
}
