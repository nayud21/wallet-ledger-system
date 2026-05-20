import React from 'react';

type Tone = 'slate' | 'green' | 'red' | 'amber' | 'indigo';

interface BadgeProps {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
}

const tones: Record<Tone, string> = {
  slate:  'bg-slate-100 text-slate-700',
  green:  'bg-emerald-50 text-emerald-700',
  red:    'bg-red-50 text-red-700',
  amber:  'bg-amber-50 text-amber-800',
  indigo: 'bg-indigo-50 text-indigo-700',
};

const dots: Record<Tone, string> = {
  slate:  'bg-slate-400',
  green:  'bg-emerald-500',
  red:    'bg-red-500',
  amber:  'bg-amber-500',
  indigo: 'bg-indigo-500',
};

export default function Badge({ tone = 'slate', dot, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-medium ${tones[tone]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dots[tone]}`} />}
      {children}
    </span>
  );
}
