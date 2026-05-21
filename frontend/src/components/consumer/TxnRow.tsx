import { fmtMoney, fmtDate } from '../../utils/format';
import type { LedgerEntryResponse } from '../../types/api';

const ArrowDown = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M8 3v10M4 9l4 4 4-4"/>
  </svg>
);
const ArrowUp = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M8 13V3M4 7l4-4 4 4"/>
  </svg>
);

interface TxnRowProps {
  entry: LedgerEntryResponse;
  walletId?: string;
}

export default function TxnRow({ entry }: TxnRowProps) {
  // CREDIT = money into wallet (IN), DEBIT = money out of wallet (OUT)
  const isIn = entry.direction === 'CREDIT';
  const label = entry.reference
    ? isIn ? `Received · ${entry.reference}` : `Sent · ${entry.reference}`
    : isIn ? 'Top-up' : 'Transfer sent';

  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${isIn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {isIn ? <ArrowDown /> : <ArrowUp />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-900 truncate">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{fmtDate(entry.createdAt)}</div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-semibold ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isIn ? '+' : '−'}{fmtMoney(entry.amount, entry.currency)}
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{entry.currency}</div>
      </div>
    </div>
  );
}
