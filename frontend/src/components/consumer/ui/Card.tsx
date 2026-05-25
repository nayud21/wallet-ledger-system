import { HTMLAttributes } from 'react';

export default function Card({
  className = '',
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
