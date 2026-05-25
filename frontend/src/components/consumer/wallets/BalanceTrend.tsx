import { useState } from 'react';
import Card from '../ui/Card';
import { fmtMoney } from '../../../utils/format';

interface BalanceTrendProps {
  data: number[];
  monthChange: number;
  currency: string;
}

function fmtCompact(v: number, currency: string) {
  const abs = Math.abs(v);
  if (currency === 'VND') {
    if (abs >= 1_000_000) return `₫${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `₫${(v / 1_000).toFixed(0)}k`;
    return `₫${v.toFixed(0)}`;
  }
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  if (abs >= 1_000) return `${sym}${(v / 1_000).toFixed(1)}k`;
  return `${sym}${v.toFixed(0)}`;
}

export default function BalanceTrend({ data, monthChange, currency }: BalanceTrendProps) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 220;
  const pad = { l: 60, r: 12, t: 14, b: 22 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const yPad = range * 0.08;
  const yMin = min - yPad;
  const yMax = max + yPad;
  const stepX = innerW / Math.max(1, data.length - 1);
  const px = (i: number) => pad.l + stepX * i;
  const py = (v: number) => pad.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const pathLine = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ');
  const pathArea = `${pathLine} L ${px(data.length - 1).toFixed(1)} ${(pad.t + innerH).toFixed(1)} L ${px(0).toFixed(1)} ${(pad.t + innerH).toFixed(1)} Z`;
  const color = monthChange >= 0 ? '#10b981' : '#f43f5e';

  return (
    <Card className="col-span-12 xl:col-span-7 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-900">30-day balance trend</div>
          <div className="text-xs text-slate-500 mt-0.5">Last 30 days</div>
        </div>
        <div className="text-right">
          <div className={`text-base font-bold num ${monthChange >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {monthChange >= 0 ? '+' : ''}{(monthChange * 100).toFixed(2)}%
          </div>
          <div className="text-xs text-slate-500">vs 30 days ago</div>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
          <defs>
            <linearGradient id="walletTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => {
            const y = pad.t + (innerH / 4) * i;
            const v = yMax - ((yMax - yMin) / 4) * i;
            return (
              <g key={i}>
                <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#e5e7eb" strokeDasharray={i === 4 ? '0' : '3 3'} />
                <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-slate-400" style={{ fontSize: 10, fontFamily: 'Geist Mono, monospace' }}>
                  {fmtCompact(v, currency)}
                </text>
              </g>
            );
          })}
          <path d={pathArea} fill="url(#walletTrendFill)" />
          <path d={pathLine} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((v, i) => (
            <g key={i}>
              <rect x={px(i) - stepX / 2} y={pad.t} width={stepX} height={innerH} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              {hover === i && (
                <>
                  <line x1={px(i)} x2={px(i)} y1={pad.t} y2={pad.t + innerH} stroke="#94a3b8" strokeDasharray="3 3" />
                  <circle cx={px(i)} cy={py(v)} r="5" fill="#fff" stroke={color} strokeWidth="2" />
                </>
              )}
            </g>
          ))}
        </svg>
        {hover !== null && (
          <div
            className="absolute pointer-events-none bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl"
            style={{
              left: `${(px(hover) / W) * 100}%`,
              top: 4,
              transform: `translateX(${hover === 0 ? '0%' : hover === data.length - 1 ? '-100%' : '-50%'})`,
            }}
          >
            <div className="font-medium">Day {hover + 1}</div>
            <div className="num text-slate-200">{fmtMoney(data[hover], currency)}</div>
          </div>
        )}
      </div>
    </Card>
  );
}
