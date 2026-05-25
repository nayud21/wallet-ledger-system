interface CurrencyChipProps {
  cur: string;
  size?: 'sm' | 'md';
}

const tones: Record<string, string> = {
  USD: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  VND: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  EUR: 'bg-violet-50 text-violet-700 ring-violet-200',
  GBP: 'bg-amber-50 text-amber-700 ring-amber-200',
};

export default function CurrencyChip({ cur, size = 'md' }: CurrencyChipProps) {
  const sz = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-[11px]';
  const tone = tones[cur] || 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    <div className={`${sz} ${tone} rounded-lg grid place-items-center font-mono font-semibold ring-1 shrink-0`}>
      {cur}
    </div>
  );
}
