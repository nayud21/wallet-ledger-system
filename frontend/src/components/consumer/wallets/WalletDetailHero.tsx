import { Link } from 'react-router-dom';
import { Icon } from '../ui/icons';
import Spark from './Spark';
import { fmtMoney } from '../../../utils/format';
import type { EnrichedWallet } from './types';

interface WalletDetailHeroProps {
  w: EnrichedWallet;
  hidden: boolean;
  onToggleHide: () => void;
  spark: number[];
  monthChange: number;
}

export default function WalletDetailHero({ w, hidden, onToggleHide, spark, monthChange }: WalletDetailHeroProps) {
  const frozen = w.status === 'FROZEN';
  const balance = hidden ? '••••••••' : fmtMoney(w.availableBalance, w.currency);
  return (
    <div className="hero-bg hero-shadow rounded-xl text-white relative overflow-hidden border border-slate-800/80">
      <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 bottom-0 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="relative p-6 grid grid-cols-12 gap-6 items-stretch">
        <div className="col-span-12 md:col-span-7 flex flex-col">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-medium">
            <Icon.Wallet className="w-3.5 h-3.5" />
            <span className="text-slate-300">{w.currency} Wallet · {w.nickname}</span>
            <span className="text-slate-600">·</span>
            <span className="font-mono normal-case tracking-normal text-slate-500 truncate">{w.id}</span>
          </div>

          <div className="mt-4 flex items-end gap-2.5">
            <div className="text-[42px] leading-none font-semibold tracking-tight num text-white">{balance}</div>
            <div className="text-slate-400 text-sm font-medium font-mono pb-1.5">{w.currency}</div>
            <button
              onClick={onToggleHide}
              className="ml-1 mb-1 h-7 w-7 grid place-items-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-slate-300"
            >
              {hidden ? <Icon.EyeOff className="w-3.5 h-3.5" /> : <Icon.Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3 flex-wrap text-[13px]">
            {!frozen && monthChange !== 0 && (
              <span className={`inline-flex items-center gap-1.5 font-medium ${monthChange > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                <Icon.Trend className="w-3.5 h-3.5" />
                <span className="num">{monthChange >= 0 ? '+' : ''}{(monthChange * 100).toFixed(2)}%</span>
              </span>
            )}
            <span className="text-slate-500">vs last month</span>
            <span className="h-3 w-px bg-slate-700" />
            <span className="text-slate-400">
              Available <span className="num text-white font-medium">{hidden ? '•••••' : fmtMoney(w.availableBalance, w.currency)}</span>
            </span>
            {w.reservedBalance > 0 && (
              <span className="text-slate-400">
                Reserved <span className="num text-white font-medium">{hidden ? '•••••' : fmtMoney(w.reservedBalance, w.currency)}</span>
              </span>
            )}
          </div>

          <div className="mt-auto pt-6">
            {w.pan ? (
              <Link
                to="/cards"
                className="inline-flex items-center gap-3 p-2.5 pr-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-7 rounded bg-gradient-to-br from-slate-700 to-slate-800 grid place-items-center relative overflow-hidden border border-white/10">
                  <div className="w-6 h-4 rounded-sm bg-gradient-to-br from-yellow-200 to-amber-500" />
                </div>
                <div className="flex flex-col">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium leading-tight">Linked card</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[13px] text-white tracking-widest">{w.pan}</span>
                    <span className="text-[9px] text-slate-400 font-bold tracking-wider px-1 py-0.5 rounded bg-white/10">VISA</span>
                  </div>
                </div>
                <Icon.ChevronRight className="w-3.5 h-3.5 text-slate-500 ml-1" />
              </Link>
            ) : (
              <button className="inline-flex items-center gap-2 px-3 h-8 rounded-lg bg-white/5 border border-dashed border-white/20 hover:bg-white/10 text-[12px] text-slate-300">
                <Icon.Plus className="w-3.5 h-3.5" />
                Link a card to this wallet
              </button>
            )}
          </div>
        </div>

        <div className="col-span-12 md:col-span-5 flex flex-col items-stretch md:items-end justify-between gap-4 md:border-l md:border-white/10 md:pl-6">
          <div className="flex items-center gap-2 md:justify-end">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 h-6 rounded-full border ${frozen ? 'bg-slate-500/15 text-slate-300 border-slate-300/25' : 'bg-emerald-400/15 text-emerald-300 border-emerald-300/25'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${frozen ? 'bg-slate-400' : 'bg-emerald-300'}`} />{w.status}
            </span>
            <span className="inline-flex items-center text-[11px] font-medium px-2 h-6 rounded-full bg-white/5 text-slate-300 border border-white/10 font-mono">{w.currency}</span>
          </div>

          <div className="hidden md:flex flex-col items-end gap-1.5 text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">30-day balance</div>
            <div className="w-36 h-9">
              <Spark data={spark} color={frozen ? '#94a3b8' : monthChange >= 0 ? '#34d399' : '#fb7185'} height={36} fill />
            </div>
          </div>

          <div className="flex items-center gap-2 md:justify-end w-full md:w-auto">
            <button
              disabled={frozen}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 text-[13px] font-medium rounded-lg bg-white/5 text-slate-200 hover:bg-white/10 border border-white/15 transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon.Filter className="w-3.5 h-3.5" />Statements
            </button>
            <Link
              to={frozen ? '#' : `/top-up?walletId=${w.id}`}
              className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-lg bg-white text-slate-900 hover:bg-indigo-50 border border-white shadow-sm transition-all whitespace-nowrap ${frozen ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <Icon.Plus className="w-3.5 h-3.5" />Add money
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
