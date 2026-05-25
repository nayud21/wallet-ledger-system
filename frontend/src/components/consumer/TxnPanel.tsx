import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { Icon } from './ui/icons';
import { fmtMoney } from '../../utils/format';
import { TypeMeta, classifyEntry, deriveStatus, entryLabel } from './TxnTypeMeta';
import type { LedgerEntryResponse } from '../../types/api';

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pad = (x: number) => String(x).padStart(2, '0');
  const h = d.getHours();
  const hh = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return {
    dateShort: `${months[d.getMonth()]} ${d.getDate()}`,
    time: `${hh}:${pad(d.getMinutes())} ${ampm}`,
  };
}

interface TxnPanelProps {
  entries: LedgerEntryResponse[];
  loading?: boolean;
}

type Filter = 'all' | 'IN' | 'OUT';

export default function TxnPanel({ entries, loading }: TxnPanelProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const mapped = entries.map((e) => ({
    e,
    dir: e.direction === 'CREDIT' ? 'IN' : 'OUT',
  }));

  const filtered = mapped.filter((m) => (filter === 'all' ? true : m.dir === filter));
  const shown = filtered.slice(0, 10);

  return (
    <Card className="col-span-12 lg:col-span-5 p-0 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200">
        <div>
          <div className="text-[14px] font-semibold tracking-tight text-slate-900">Recent transactions</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{shown.length} of {entries.length}</div>
        </div>
        <div className="inline-flex h-7 bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-[11px]">
          {(['all', 'IN', 'OUT'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-2 h-full rounded-md font-medium transition-colors ${filter === k ? 'bg-white text-slate-800 border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {k === 'all' ? 'All' : k === 'IN' ? 'In' : 'Out'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[88px_1fr_120px] gap-3 px-4 py-2 border-b border-slate-200 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        <div>Date</div>
        <div>Transaction</div>
        <div className="text-right">Amount</div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading…</div>
        ) : shown.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No transactions yet.</div>
        ) : (
          shown.map((m, i) => {
            const e = m.e;
            const type = classifyEntry(e);
            const meta = TypeMeta[type];
            const TI = meta.icon;
            const dt = fmtDateTime(e.createdAt);
            const status = deriveStatus(e);
            const isLast = i === shown.length - 1;
            return (
              <div
                key={e.id}
                className={`grid grid-cols-[88px_1fr_120px] gap-3 px-4 py-2.5 items-center hover:bg-slate-50 transition-colors ${!isLast ? 'border-b border-slate-100' : ''}`}
              >
                <div>
                  <div className="text-[12px] text-slate-800 font-medium">{dt.dateShort}</div>
                  <div className="text-[10px] text-slate-500 num">{dt.time}</div>
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${meta.tone}`}>
                    <TI className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-slate-800 truncate">{entryLabel(e)}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge tone={status}>{status[0].toUpperCase() + status.slice(1)}</Badge>
                      <span className="text-[10px] text-slate-400 font-mono truncate">#{e.ledgerTxId}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-[13px] font-semibold num ${m.dir === 'IN' ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {m.dir === 'IN' ? '+' : '−'}{fmtMoney(e.amount, e.currency)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{e.currency}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] bg-slate-50/40">
        <span className="text-slate-500">{shown.length} shown</span>
        <Link to="/history" className="inline-flex items-center gap-1 text-indigo-700 font-medium hover:text-indigo-900">
          View all transactions <Icon.ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </Card>
  );
}
