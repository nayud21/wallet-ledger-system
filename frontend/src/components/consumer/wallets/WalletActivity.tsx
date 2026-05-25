import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Btn from '../ui/Btn';
import Badge from '../ui/Badge';
import { Icon } from '../ui/icons';
import { TypeMeta, classifyEntry, deriveStatus, entryLabel } from '../TxnTypeMeta';
import { fmtMoney } from '../../../utils/format';
import type { LedgerEntryResponse } from '../../../types/api';

interface WalletActivityProps {
  entries: LedgerEntryResponse[];
  loading?: boolean;
  currency: string;
}

function fmtSimpleDate(iso: string) {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pad = (x: number) => String(x).padStart(2, '0');
  const h = d.getHours();
  const hh = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return { d: `${months[d.getMonth()]} ${d.getDate()}`, t: `${hh}:${pad(d.getMinutes())} ${ampm}` };
}

export default function WalletActivity({ entries, loading, currency }: WalletActivityProps) {
  const shown = entries.slice(0, 10);
  return (
    <Card className="col-span-12 p-0">
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200">
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-900">Recent activity</div>
          <div className="text-xs text-slate-500 mt-0.5">{entries.length} transactions in this wallet</div>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="outline" size="sm"><Icon.Download className="w-3.5 h-3.5" />Export</Btn>
          <Link to="/history"><Btn variant="primary" size="sm">View all</Btn></Link>
        </div>
      </div>

      <div className="grid grid-cols-[112px_1fr_140px_120px_140px_32px] gap-4 px-4 py-2 border-b border-slate-200 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        <div>Date</div>
        <div>Transaction</div>
        <div>Reference</div>
        <div>Status</div>
        <div className="text-right">Amount</div>
        <div />
      </div>

      <div>
        {loading ? (
          <div className="px-4 py-12 text-center text-sm text-slate-400">Loading…</div>
        ) : shown.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500">No activity in this wallet yet.</div>
        ) : (
          shown.map((e, i) => {
            const type = classifyEntry(e);
            const meta = TypeMeta[type];
            const TI = meta.icon;
            const dt = fmtSimpleDate(e.createdAt);
            const st = deriveStatus(e);
            const isIn = e.direction === 'CREDIT';
            return (
              <div
                key={e.id}
                className={`grid grid-cols-[112px_1fr_140px_120px_140px_32px] gap-4 px-4 py-2.5 items-center hover:bg-slate-50/80 transition-colors group ${i < shown.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div>
                  <div className="text-xs font-medium text-slate-800">{dt.d}</div>
                  <div className="text-[11px] text-slate-500 num">{dt.t}</div>
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${meta.tone}`}>
                    <TI className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate flex items-center gap-1.5">
                      {entryLabel(e)}
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{meta.label}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">#{e.id}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 font-mono truncate">#{e.ledgerTxId}</div>
                <div><Badge tone={st}>{st[0].toUpperCase() + st.slice(1)}</Badge></div>
                <div className="text-right">
                  <div className={`text-sm font-semibold num ${isIn ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {isIn ? '+' : '−'}{fmtMoney(e.amount, currency)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{currency}</div>
                </div>
                <Icon.ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
