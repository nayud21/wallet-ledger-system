import React from 'react';

export type BadgeTone = 'slate' | 'success' | 'pending' | 'failed' | 'info';

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const tones: Record<BadgeTone, string> = {
  slate:   'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  pending: 'bg-amber-50 text-amber-800 border border-amber-200/60',
  failed:  'bg-rose-50 text-rose-700 border border-rose-200/60',
  info:    'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
};

const dots: Record<BadgeTone, string> = {
  slate:   'bg-slate-400',
  success: 'bg-emerald-500',
  pending: 'bg-amber-500',
  failed:  'bg-rose-500',
  info:    'bg-indigo-500',
};

export default function Badge({ tone = 'slate', dot = true, className = '', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 h-5 rounded-full text-[11px] font-medium ${tones[tone]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dots[tone]}`} />}
      {children}
    </span>
  );
}
