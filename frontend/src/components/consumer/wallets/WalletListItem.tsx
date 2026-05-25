import Badge from '../ui/Badge';
import { Icon } from '../ui/icons';
import CurrencyChip from './CurrencyChip';
import Spark from './Spark';
import { fmtMoney } from '../../../utils/format';
import type { EnrichedWallet } from './types';

interface WalletListItemProps {
  w: EnrichedWallet;
  active: boolean;
  onSelect: () => void;
  spark: number[];
  monthChange: number;
}

export default function WalletListItem({ w, active, onSelect, spark, monthChange }: WalletListItemProps) {
  const frozen = w.status === 'FROZEN';
  const trend = monthChange;
  const sparkColor = trend > 0 ? '#10b981' : trend < 0 ? '#f43f5e' : '#94a3b8';
  return (
    <button
      onClick={onSelect}
      className={`group w-full text-left rounded-xl border transition-all ${
        active
          ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-100'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
      }`}
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          <CurrencyChip cur={w.currency} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{w.currency} Wallet</span>
              {w.primary && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">PRIMARY</span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              <span className="font-mono">{w.id.slice(0, 12)}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span>{w.tag}</span>
            </div>
          </div>
          {active && <Icon.ChevronRight className="w-4 h-4 text-indigo-600 shrink-0" />}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className={`text-[18px] font-bold tracking-tight num ${frozen ? 'text-slate-400' : 'text-slate-900'}`}>
              {fmtMoney(w.availableBalance, w.currency)}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge tone={frozen ? 'slate' : 'success'}>{w.status}</Badge>
              {!frozen && trend !== 0 && (
                <span className={`text-[11px] font-medium num ${trend >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {trend >= 0 ? '+' : ''}{(trend * 100).toFixed(2)}%
                </span>
              )}
            </div>
          </div>
          <div className="w-20 shrink-0 opacity-90">
            <Spark data={spark} color={sparkColor} height={28} fill />
          </div>
        </div>
      </div>
    </button>
  );
}
