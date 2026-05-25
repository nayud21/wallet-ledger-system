import type { WalletResponse } from '../../types/api';
import Badge from '../ui/Badge';
import { IconChevronRight } from '../icons';

interface WalletTableProps {
  wallets: WalletResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);

function relativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function WalletTable({ wallets, selectedId, onSelect }: WalletTableProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm">
      <div className="grid grid-cols-[minmax(220px,1fr)_72px_minmax(150px,180px)_minmax(120px,140px)_110px_130px_24px] gap-3 px-3 py-2 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 font-medium">
        <div>External ID</div>
        <div>Currency</div>
        <div className="text-right">Available Balance</div>
        <div className="text-right">Reserved</div>
        <div>Status</div>
        <div>Updated</div>
        <div />
      </div>
      <div>
        {wallets.map((w, i) => (
          <button
            key={w.id}
            onClick={() => onSelect(w.id)}
            className={`w-full grid grid-cols-[minmax(220px,1fr)_72px_minmax(150px,180px)_minmax(120px,140px)_110px_130px_24px] gap-3 px-3 py-1.5 text-xs text-left items-center transition-colors ${
              selectedId === w.id ? 'bg-indigo-50' : 'row-hover'
            } ${i < wallets.length - 1 ? 'border-b border-slate-100' : ''}`}
          >
            <div className="min-w-0">
              <div className={`font-mono truncate ${selectedId === w.id ? 'text-indigo-800' : 'text-slate-800'}`}>
                {w.userId}
              </div>
              <div className="font-mono text-xs text-slate-500 truncate">{w.id}</div>
            </div>
            <div className="text-slate-600 font-medium">{w.currency}</div>
            <div className="num text-right text-slate-900 font-medium">{fmtMoney(w.availableBalance)}</div>
            <div className={`num text-right ${w.reservedBalance > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
              {fmtMoney(w.reservedBalance)}
            </div>
            <div>
              <Badge tone={w.status === 'ACTIVE' ? 'green' : 'slate'} dot>
                {w.status}
              </Badge>
            </div>
            <div className="text-slate-500 num text-xs">{relativeTime(w.updatedAt)}</div>
            <div className="text-slate-300">
              <IconChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
