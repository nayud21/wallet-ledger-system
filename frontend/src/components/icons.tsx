import React from 'react';

type SvgProps = React.SVGProps<SVGSVGElement>;

export const IconWallet = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M2 5.5a2 2 0 012-2h8.5v9.5a1 1 0 01-1 1H4a2 2 0 01-2-2v-6.5z"/>
    <path d="M2.5 4.5h9"/>
    <circle cx="11.5" cy="9" r=".9" fill="currentColor" stroke="none"/>
  </svg>
);

export const IconLedger = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="2" width="10" height="12" rx="1"/>
    <path d="M5.5 5h5M5.5 8h5M5.5 11h3"/>
  </svg>
);

export const IconInbox = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M2 9.5l1.5-5A1 1 0 014.5 4h7a1 1 0 011 .5l1.5 5"/>
    <path d="M2 9.5V13a1 1 0 001 1h10a1 1 0 001-1V9.5h-3.5l-1 1.5h-3l-1-1.5H2z"/>
  </svg>
);

export const IconRecon = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 4h6m0 0L7 2m2 2L7 6"/>
    <path d="M13 12H7m0 0l2-2m-2 2l2 2"/>
  </svg>
);

export const IconPlus = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}>
    <path d="M8 3.5v9M3.5 8h9"/>
  </svg>
);

export const IconChevron = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 6l4 4 4-4"/>
  </svg>
);

export const IconChevronRight = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 4l4 4-4 4"/>
  </svg>
);

export const IconRefresh = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M13.5 8a5.5 5.5 0 11-1.7-3.95"/>
    <path d="M13.5 2.5V5h-2.5"/>
  </svg>
);

export const IconSearch = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="7" cy="7" r="4.5"/>
    <path d="M10.5 10.5l3 3"/>
  </svg>
);

export const IconCalendar = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2.5" y="3.5" width="11" height="10" rx="1"/>
    <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2"/>
  </svg>
);

export const IconClose = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
    <path d="M4 4l8 8M12 4l-8 8"/>
  </svg>
);

export const IconFilter = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M2.5 3.5h11l-4 5v4l-3 1.5v-5.5l-4-5z"/>
  </svg>
);

export const IconArrowDown = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M8 3v10M4 9l4 4 4-4"/>
  </svg>
);

export const IconArrowUp = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M8 13V3M4 7l4-4 4 4"/>
  </svg>
);

export const IconCheck = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 8.5l3.5 3.5L13 4.5"/>
  </svg>
);

export const IconReverse = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 8a5 5 0 019.2-2.7"/>
    <path d="M12.5 3v3h-3"/>
    <path d="M13 8a5 5 0 01-9.2 2.7"/>
    <path d="M3.5 13v-3h3"/>
  </svg>
);

export const IconWarn = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M8 2l6 11H2L8 2z"/>
    <path d="M8 6.5v3"/>
    <circle cx="8" cy="11.2" r=".5" fill="currentColor" stroke="none"/>
  </svg>
);

export const IconLink = (p: SvgProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M7 9l-2 2a2.5 2.5 0 01-3.5-3.5l2-2"/>
    <path d="M9 7l2-2a2.5 2.5 0 013.5 3.5l-2 2"/>
    <path d="M6 10l4-4"/>
  </svg>
);
