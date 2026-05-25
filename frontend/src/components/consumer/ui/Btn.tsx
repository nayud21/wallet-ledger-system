import { ButtonHTMLAttributes } from 'react';

type Variant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'onDark'
  | 'onDarkSolid'
  | 'danger';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizes: Record<Size, string> = {
  xs: 'h-7 px-2 text-xs',
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-4 text-sm',
};

const variants: Record<Variant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 border border-indigo-700/40 shadow-sm shadow-indigo-600/20',
  secondary:
    'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 border border-slate-200',
  outline:
    'bg-transparent text-slate-700 hover:bg-white hover:border-slate-300 border border-slate-300',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent',
  onDark:
    'bg-white/15 text-white hover:bg-white/25 border border-white/20 backdrop-blur',
  onDarkSolid:
    'bg-white text-indigo-700 hover:bg-indigo-50 border border-white shadow-sm',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 border border-rose-700/40',
};

export default function Btn({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
