import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './ui/icons';
import { fmtMoney } from '../../utils/format';
import type { WalletResponse, LedgerEntryResponse } from '../../types/api';

interface HeroWalletProps {
  wallet: WalletResponse;
  entries?: LedgerEntryResponse[];
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return (
      <svg viewBox="0 0 120 28" className="w-32 h-7">
        <line x1="0" y1="14" x2="120" y2="14" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = 120 / (points.length - 1);
  const coords = points.map((v, i) => [i * stepX, 28 - ((v - min) / range) * 22 - 3]);
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L 120 28 L 0 28 Z`;
  return (
    <svg viewBox="0 0 120 28" className="w-32 h-7">
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkfill)" />
      <path d={line} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HeroWallet({ wallet, entries }: HeroWalletProps) {
  const [hidden, setHidden] = useState(false);

  const { sparkPoints, monthChangePct } = useMemo(() => {
    if (!entries || entries.length === 0) return { sparkPoints: [], monthChangePct: 0 };
    const sorted = [...entries].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    const current = wallet.availableBalance;
    const balances: number[] = [];
    let bal = current;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const e = sorted[i];
      const signed = e.direction === 'CREDIT' ? e.amount : -e.amount;
      balances.unshift(bal);
      bal -= signed;
    }
    balances.unshift(bal);
    const oldest = balances[0];
    const pct = oldest === 0 ? 0 : (current - oldest) / Math.abs(oldest);
    return { sparkPoints: balances.slice(-30), monthChangePct: pct };
  }, [entries, wallet.availableBalance]);

  const balanceStr = fmtMoney(wallet.availableBalance, wallet.currency);
  const availStr = fmtMoney(wallet.availableBalance, wallet.currency);
  const reservedStr = fmtMoney(wallet.reservedBalance, wallet.currency);
  const trendPositive = monthChangePct >= 0;

  return (
    <div className="col-span-12 lg:col-span-8 hero-bg hero-shadow rounded-xl text-white relative overflow-hidden border border-slate-800/80">
      <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 bottom-0 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="relative p-6 lg:p-7 grid grid-cols-12 gap-6 items-stretch">
        <div className="col-span-12 md:col-span-7 flex flex-col">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400 font-medium">
            <Icon.Wallet className="w-3.5 h-3.5" />
            <span className="text-slate-300">{wallet.currency} Wallet · Main</span>
            <span className="text-slate-600">·</span>
            <span className="font-mono normal-case tracking-normal text-slate-500 truncate">{wallet.id}</span>
          </div>

          <div className="mt-4 flex items-end gap-2.5">
            <div className="text-[42px] leading-none font-semibold tracking-tight num text-white">
              {hidden ? '•••••••••' : balanceStr}
            </div>
            <div className="text-slate-400 text-sm font-medium font-mono pb-1.5">{wallet.currency}</div>
            <button
              onClick={() => setHidden((h) => !h)}
              className="ml-1 mb-1 h-7 w-7 grid place-items-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-slate-300"
              aria-label="Toggle balance visibility"
            >
              {hidden ? <Icon.EyeOff className="w-3.5 h-3.5" /> : <Icon.Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3 flex-wrap text-[12.5px]">
            <span className={`inline-flex items-center gap-1.5 font-medium ${trendPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
              {trendPositive ? <Icon.Trend className="w-3.5 h-3.5" /> : <Icon.ArrowDown className="w-3.5 h-3.5" />}
              <span className="num">{trendPositive ? '+' : ''}{(monthChangePct * 100).toFixed(2)}%</span>
            </span>
            <span className="text-slate-500">vs last month</span>
            <span className="h-3 w-px bg-slate-700" />
            <span className="text-slate-400">
              Available <span className="num text-white font-medium">{hidden ? '•••••' : availStr}</span>
            </span>
            <span className="text-slate-400">
              Reserved <span className="num text-white font-medium">{hidden ? '•••••' : reservedStr}</span>
            </span>
          </div>

          <div className="mt-auto pt-6">
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
                  <span className="font-mono text-[13px] text-white tracking-widest">•••• 4282</span>
                  <span className="text-[9px] text-slate-400 font-bold tracking-wider px-1 py-0.5 rounded bg-white/10">VISA</span>
                </div>
              </div>
              <Icon.ChevronRight className="w-3.5 h-3.5 text-slate-500 ml-1" />
            </Link>
          </div>
        </div>

        <div className="col-span-12 md:col-span-5 flex flex-col items-stretch md:items-end justify-between gap-4 md:border-l md:border-white/10 md:pl-6">
          <div className="flex items-center gap-2 md:justify-end">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 h-6 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-300/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" /> {wallet.status}
            </span>
            <span className="inline-flex items-center text-[11px] font-medium px-2 h-6 rounded-full bg-white/5 text-slate-300 border border-white/10 font-mono">{wallet.currency}</span>
          </div>

          <div className="hidden md:flex flex-col items-end gap-1.5 text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">30-day balance</div>
            <Sparkline points={sparkPoints} />
          </div>

          <div className="flex items-center gap-2 md:justify-end w-full md:w-auto">
            <button className="inline-flex items-center justify-center gap-1.5 h-9 px-3 text-[13px] font-medium rounded-lg bg-white/5 text-slate-200 hover:bg-white/10 border border-white/15 transition-all whitespace-nowrap">
              <Icon.Filter className="w-3.5 h-3.5" />Statements
            </button>
            <Link
              to={`/top-up?walletId=${wallet.id}`}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-lg bg-white text-slate-900 hover:bg-indigo-50 border border-white shadow-sm transition-all whitespace-nowrap"
            >
              <Icon.Plus className="w-3.5 h-3.5" />Add money
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
