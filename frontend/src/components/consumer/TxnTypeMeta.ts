import { Icon } from './ui/icons';
import type { LedgerEntryResponse } from '../../types/api';

export type TxnType = 'topup' | 'transfer' | 'card' | 'exchange' | 'fee';

export interface TxnTypeMeta {
  label: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => JSX.Element;
  tone: string;
}

export const TypeMeta: Record<TxnType, TxnTypeMeta> = {
  topup:    { label: 'Top-up',    icon: Icon.TxBank, tone: 'text-emerald-700 bg-emerald-50' },
  transfer: { label: 'Transfer',  icon: Icon.TxOut,  tone: 'text-indigo-700 bg-indigo-50' },
  card:     { label: 'Card',      icon: Icon.TxCard, tone: 'text-violet-700 bg-violet-50' },
  exchange: { label: 'Exchange',  icon: Icon.TxExch, tone: 'text-amber-700 bg-amber-50' },
  fee:      { label: 'Fee',       icon: Icon.TxFee,  tone: 'text-slate-700 bg-slate-100' },
};

export function classifyEntry(e: LedgerEntryResponse): TxnType {
  const ref = (e.reference ?? '').toLowerCase();
  if (ref.includes('topup') || ref.includes('top-up') || ref.includes('top_up')) return 'topup';
  if (ref.includes('transfer') || ref.includes('send') || ref.includes('receive')) return 'transfer';
  if (ref.includes('card')) return 'card';
  if (ref.includes('exchange') || ref.includes('fx')) return 'exchange';
  if (ref.includes('fee')) return 'fee';
  return e.direction === 'CREDIT' ? 'topup' : 'transfer';
}

export function deriveStatus(_e: LedgerEntryResponse): 'success' | 'pending' | 'failed' {
  return 'success';
}

export function entryLabel(e: LedgerEntryResponse): string {
  if (e.reference) return e.reference;
  return e.direction === 'CREDIT' ? 'Money in' : 'Money out';
}
