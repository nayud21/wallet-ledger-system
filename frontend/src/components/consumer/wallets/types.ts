import type { WalletResponse } from '../../../types/api';

export interface EnrichedWallet extends WalletResponse {
  nickname: string;
  primary: boolean;
  tag: string;
  pan: string | null;
  account: string;
  routing: string;
  createdLabel: string;
  limits: {
    dailySend: { used: number; max: number };
    monthlyReceive: { used: number; max: number };
  };
}

const TAGS: Record<string, string> = {
  USD: 'Personal',
  VND: 'Travel',
  EUR: 'Savings',
  GBP: 'Savings',
};

const ACCOUNT_PREFIX: Record<string, string> = {
  USD: 'US',
  VND: 'VN',
  EUR: 'EU',
  GBP: 'GB',
};

function fakeAccount(currency: string, walletId: string): string {
  const prefix = ACCOUNT_PREFIX[currency] ?? 'XX';
  const digits = walletId.replace(/[^0-9a-f]/g, '').padEnd(16, '0').slice(0, 16);
  return `${prefix}${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)} ${digits.slice(10, 14)} ${digits.slice(14, 16)}00`.toUpperCase();
}

function fakePan(walletId: string): string {
  const digits = walletId.replace(/[^0-9]/g, '').padStart(4, '4').slice(-4);
  return `•••• ${digits}`;
}

function fmtCreated(iso: string): string {
  return iso ? iso.slice(0, 10) : '—';
}

export function enrichWallet(w: WalletResponse, index: number): EnrichedWallet {
  const frozen = w.status === 'FROZEN';
  const tag = TAGS[w.currency] ?? 'General';
  const limitsMax = w.currency === 'VND' ? 250_000_000 : w.currency === 'USD' ? 10_000 : 5_000;
  return {
    ...w,
    nickname: ['Main', 'Travel', 'Savings', 'Secondary'][index] ?? 'Wallet',
    primary: index === 0,
    tag,
    pan: frozen ? null : fakePan(w.id),
    account: fakeAccount(w.currency, w.id),
    routing: frozen ? '—' : '021000021',
    createdLabel: fmtCreated(w.updatedAt),
    limits: {
      dailySend: { used: 0, max: frozen ? 0 : limitsMax },
      monthlyReceive: { used: 0, max: frozen ? 0 : limitsMax * 5 },
    },
  };
}
