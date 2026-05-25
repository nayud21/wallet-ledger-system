import React from 'react';

type P = React.SVGProps<SVGSVGElement>;

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const Icon = {
  Logo: (p: P) => (
    <svg viewBox="0 0 28 28" fill="none" {...p}>
      <rect x="2" y="7" width="24" height="16" rx="4" fill="url(#mw-g1)" />
      <rect x="18" y="13" width="7" height="5" rx="1.5" fill="#a5b4fc" />
      <circle cx="21.5" cy="15.5" r="1.1" fill="#3730a3" />
      <path d="M2 11c3-2 7-3 12-3s9 1 12 3" stroke="#6366f1" strokeWidth="0.7" fill="none" opacity="0.7" />
      <defs>
        <linearGradient id="mw-g1" x1="0" y1="0" x2="28" y2="28">
          <stop stopColor="#4f46e5" />
          <stop offset="1" stopColor="#3730a3" />
        </linearGradient>
      </defs>
    </svg>
  ),
  Dashboard: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <rect x="3" y="3" width="6" height="8" rx="1" />
      <rect x="11" y="3" width="6" height="5" rx="1" />
      <rect x="11" y="10" width="6" height="7" rx="1" />
      <rect x="3" y="13" width="6" height="4" rx="1" />
    </svg>
  ),
  Wallet: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <path d="M3 7a2 2 0 012-2h10v12a1 1 0 01-1 1H5a2 2 0 01-2-2V7z" />
      <path d="M3 6h12" />
      <circle cx="13" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Send: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <path d="M3 10h14M11 5l6 5-6 5" />
    </svg>
  ),
  TopUp: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <path d="M10 3v12M5 10l5 5 5-5" />
      <path d="M3 17h14" />
    </svg>
  ),
  Exchange: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <path d="M4 7h10l-2-2m2 2l-2 2" />
      <path d="M16 13H6l2 2m-2-2l2-2" />
    </svg>
  ),
  Withdraw: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <path d="M3 13l4 4 4-4" />
      <path d="M7 17V5" />
      <rect x="12" y="4" width="5" height="13" rx="1" />
    </svg>
  ),
  QR: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <path d="M11 11h2v2h-2zM15 11h2M11 15h2v2h-2zM15 15h2v2" />
    </svg>
  ),
  History: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <path d="M4 10a6 6 0 1011-3" />
      <path d="M4 4v4h4M10 6v4l3 2" />
    </svg>
  ),
  Cards: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <rect x="3" y="5" width="14" height="10" rx="2" />
      <path d="M3 8.5h14M6 12h2" />
    </svg>
  ),
  Settings: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M4.6 15.4L6 14M14 6l1.4-1.4" />
    </svg>
  ),
  Help: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M7.5 8a2.5 2.5 0 015 0c0 1.5-2.5 1.8-2.5 3.5" />
      <circle cx="10" cy="14" r=".6" fill="currentColor" stroke="none" />
    </svg>
  ),
  Search: (p: P) => (
    <svg viewBox="0 0 16 16" {...stroke} {...p}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5l3 3" />
    </svg>
  ),
  Bell: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <path d="M5 9a5 5 0 0110 0v3l1.5 2.5h-13L5 12V9z" />
      <path d="M8.5 17a1.5 1.5 0 003 0" />
    </svg>
  ),
  Chevron: (p: P) => (
    <svg viewBox="0 0 16 16" {...stroke} {...p}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  ),
  ChevronRight: (p: P) => (
    <svg viewBox="0 0 16 16" {...stroke} {...p}>
      <path d="M6 4l4 4-4 4" />
    </svg>
  ),
  Eye: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  ),
  EyeOff: (p: P) => (
    <svg viewBox="0 0 20 20" {...stroke} {...p}>
      <path d="M3 3l14 14" />
      <path d="M7.5 5.4A8.5 8.5 0 0110 4.5c5 0 8 5.5 8 5.5a14 14 0 01-2.4 3" />
      <path d="M5.4 7.4A14 14 0 002 10s3 5.5 8 5.5a8.5 8.5 0 003.4-.7" />
      <path d="M8.5 8.5a2.5 2.5 0 003.4 3.4" />
    </svg>
  ),
  ArrowUp: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 13V3M4 7l4-4 4 4" />
    </svg>
  ),
  ArrowDown: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 3v10M4 9l4 4 4-4" />
    </svg>
  ),
  Filter: (p: P) => (
    <svg viewBox="0 0 16 16" {...stroke} {...p}>
      <path d="M2.5 3.5h11l-4 5v4l-3 1.5v-5.5l-4-5z" />
    </svg>
  ),
  Download: (p: P) => (
    <svg viewBox="0 0 16 16" {...stroke} {...p}>
      <path d="M8 3v8M5 8l3 3 3-3M3 14h10" />
    </svg>
  ),
  Trend: (p: P) => (
    <svg viewBox="0 0 16 16" {...stroke} {...p}>
      <path d="M2 12l4-5 3 3 5-7" />
      <path d="M11 3h3v3" />
    </svg>
  ),
  Plus: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" {...p}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  ),
  Logout: (p: P) => (
    <svg viewBox="0 0 16 16" {...stroke} {...p}>
      <path d="M9 3H4a1 1 0 00-1 1v8a1 1 0 001 1h5" />
      <path d="M11 5l3 3-3 3M14 8H7" />
    </svg>
  ),
  TxCard: (p: P) => (
    <svg viewBox="0 0 16 16" {...stroke} {...p}>
      <rect x="2" y="4" width="12" height="9" rx="1.5" />
      <path d="M2 7h12M4.5 10.5h2" />
    </svg>
  ),
  TxIn: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 3v8M4 8l4 4 4-4" />
    </svg>
  ),
  TxOut: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 13V5M4 9l4-4 4 4" />
    </svg>
  ),
  TxExch: (p: P) => (
    <svg viewBox="0 0 16 16" {...stroke} {...p}>
      <path d="M3 6h8L9 4m2 2L9 8" />
      <path d="M13 10H5l2 2m-2-2l2-2" />
    </svg>
  ),
  TxBank: (p: P) => (
    <svg viewBox="0 0 16 16" {...stroke} {...p}>
      <path d="M2 6L8 3l6 3M3 6v6M13 6v6M6 6v6M10 6v6M2 13h12" />
    </svg>
  ),
  TxFee: (p: P) => (
    <svg viewBox="0 0 16 16" {...stroke} {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 6.5h5M5.5 9.5h5M9.5 4.5l-3 7" />
    </svg>
  ),
};
