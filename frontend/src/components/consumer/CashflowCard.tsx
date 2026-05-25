import { useMemo, useRef, useState } from 'react';
import Card from './ui/Card';
import { fmtMoney } from '../../utils/format';

export interface CashflowPoint {
  day: string;
  date: string;
  income: number;
  expense: number;
}

function fmtCompact(n: number) {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

function Chart({ data }: { data: CashflowPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const W = 720, H = 260;
  const pad = { l: 44, r: 20, t: 18, b: 30 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const yTicks = 4;
  const tickStep = Math.max(1, Math.ceil(max / yTicks / 100) * 100);
  const yMax = tickStep * yTicks;

  const stepX = innerW / Math.max(1, data.length - 1);
  const px = (i: number) => pad.l + stepX * i;
  const py = (v: number) => pad.t + innerH - (v / yMax) * innerH;

  const pathLine = (key: 'income' | 'expense') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(i).toFixed(1)} ${py(d[key]).toFixed(1)}`).join(' ');
  const pathArea = (key: 'income' | 'expense') =>
    `${pathLine(key)} L ${px(data.length - 1).toFixed(1)} ${(pad.t + innerH).toFixed(1)} L ${px(0).toFixed(1)} ${(pad.t + innerH).toFixed(1)} Z`;

  return (
    <div className="relative" ref={wrapRef}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        <defs>
          <linearGradient id="cfIncFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cfExpFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = pad.t + (innerH / yTicks) * i;
          const v = yMax - tickStep * i;
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#e5e7eb" strokeDasharray={i === yTicks ? '0' : '3 3'} />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-slate-400" style={{ fontSize: 10, fontFamily: 'Geist Mono, monospace' }}>
                ${fmtCompact(v)}
              </text>
            </g>
          );
        })}

        <path d={pathArea('income')} fill="url(#cfIncFill)" />
        <path d={pathArea('expense')} fill="url(#cfExpFill)" />
        <path d={pathLine('expense')} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathLine('income')} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {hover !== null && (
          <line x1={px(hover)} x2={px(hover)} y1={pad.t} y2={pad.t + innerH} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="1" />
        )}

        {data.map((d, i) => {
          const isHover = hover === i;
          return (
            <g key={d.day + i}>
              <rect x={px(i) - stepX / 2} y={pad.t} width={stepX} height={innerH} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              <circle cx={px(i)} cy={py(d.income)}  r={isHover ? 5 : 3} fill="#fff" stroke="#10b981" strokeWidth="2" className="transition-all" />
              <circle cx={px(i)} cy={py(d.expense)} r={isHover ? 5 : 3} fill="#fff" stroke="#f43f5e" strokeWidth="2" className="transition-all" />
              <text x={px(i)} y={H - 10} textAnchor="middle"
                className={isHover ? 'fill-slate-900' : 'fill-slate-500'}
                style={{ fontSize: 11, fontWeight: isHover ? 600 : 500 }}>{d.day}</text>
            </g>
          );
        })}
      </svg>

      {hover !== null && (() => {
        const xPct = (px(hover) / W) * 100;
        const shift = hover === 0 ? '0%' : hover === data.length - 1 ? '-100%' : '-50%';
        const d = data[hover];
        const net = d.income - d.expense;
        return (
          <div
            className="absolute pointer-events-none bg-slate-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl border border-white/5"
            style={{ left: `${xPct}%`, top: 4, transform: `translateX(${shift})`, minWidth: 150 }}
          >
            <div className="font-medium text-white mb-1">{d.date}</div>
            <div className="flex items-center justify-between gap-3 num">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Income</span>
              <span className="text-emerald-300">+${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.income)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 num">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Expenses</span>
              <span className="text-rose-300">−${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.expense)}</span>
            </div>
            <div className="border-t border-white/10 mt-1.5 pt-1.5 flex items-center justify-between num">
              <span>Net</span>
              <span className={net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                {net >= 0 ? '+' : '−'}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(net))}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

interface CashflowCardProps {
  data: CashflowPoint[];
  rangeLabel: string;
}

export default function CashflowCard({ data, rangeLabel }: CashflowCardProps) {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');
  const totals = useMemo(
    () => ({
      income: data.reduce((a, b) => a + b.income, 0),
      expense: data.reduce((a, b) => a + b.expense, 0),
    }),
    [data]
  );
  const net = totals.income - totals.expense;
  return (
    <Card className="col-span-12 lg:col-span-7 p-4">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <div className="text-[14px] font-semibold tracking-tight text-slate-900">Cashflow</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{rangeLabel}</div>
        </div>
        <div className="inline-flex h-7 bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-[11px]">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 h-full rounded-md font-medium transition-colors ${range === r ? 'bg-white text-slate-800 border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold"><span className="w-2 h-2 rounded-sm bg-emerald-500" />Income</div>
          <div className="mt-0.5 text-[16px] font-bold num text-emerald-700">+{fmtMoney(totals.income)}</div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold"><span className="w-2 h-2 rounded-sm bg-rose-500" />Expenses</div>
          <div className="mt-0.5 text-[16px] font-bold num text-rose-600">−{fmtMoney(totals.expense)}</div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold"><span className="w-2 h-2 rounded-sm bg-indigo-500" />Net</div>
          <div className={`mt-0.5 text-[16px] font-bold num ${net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {net >= 0 ? '+' : '−'}{fmtMoney(Math.abs(net))}
          </div>
        </div>
      </div>

      <Chart data={data} />
    </Card>
  );
}
