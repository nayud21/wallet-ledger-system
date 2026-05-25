import Card from './ui/Card';
import { Icon } from './ui/icons';
import { fmtMoney } from '../../utils/format';

export interface Kpi {
  label: string;
  value: number;
  delta: number;
  dir: 'up' | 'down';
  tone: 'emerald' | 'rose' | 'indigo' | 'slate';
  isPct?: boolean;
  currency?: string;
}

const valueColors: Record<Kpi['tone'], string> = {
  emerald: 'text-emerald-700',
  rose:    'text-rose-600',
  indigo:  'text-indigo-700',
  slate:   'text-slate-900',
};

export default function KpiCard({ k }: { k: Kpi }) {
  const arrowUp = k.dir === 'up';
  const positive = k.tone === 'rose' ? !arrowUp : arrowUp;
  return (
    <Card className="p-4 hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold">{k.label}</div>
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 h-5 rounded ${positive ? 'text-emerald-700 bg-emerald-100' : 'text-rose-600 bg-rose-100'}`}>
          {arrowUp ? <Icon.ArrowUp className="w-3 h-3" /> : <Icon.ArrowDown className="w-3 h-3" />}
          {(k.delta * 100).toFixed(1)}%
        </span>
      </div>
      <div className={`mt-2 text-[24px] font-bold tracking-tight num ${valueColors[k.tone]}`}>
        {k.isPct ? `${(k.value * 100).toFixed(1)}%` : fmtMoney(k.value, k.currency ?? 'USD')}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">vs previous 30 days</div>
    </Card>
  );
}
