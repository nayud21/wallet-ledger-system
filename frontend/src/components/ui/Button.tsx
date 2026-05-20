import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';
type Size = 'xs' | 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizes: Record<Size, string> = {
  xs: 'h-6 px-2 text-[11px]',
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-8 px-3 text-sm',
};

const variants: Record<Variant, string> = {
  primary:        'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600 disabled:opacity-50',
  secondary:      'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 disabled:opacity-50',
  ghost:          'bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent disabled:opacity-50',
  danger:         'bg-red-600 text-white hover:bg-red-700 border border-red-600 disabled:opacity-50',
  'danger-outline': 'bg-white text-red-600 hover:bg-red-50 border border-red-200 disabled:opacity-50',
};

export default function Button({ variant = 'primary', size = 'sm', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded font-medium transition-colors ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
