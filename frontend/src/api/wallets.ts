import { apiFetch } from './client';
import type {
  WalletResponse,
  LedgerEntryResponse,
  CreateWalletRequest,
  TopUpRequest,
  TransferRequest,
  TransferResponse,
  RecentRecipientResponse,
  WalletStatsResponse,
} from '../types/api';

export function fetchWallets(userId?: string, status?: string): Promise<WalletResponse[]> {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (status) params.set('status', status);
  const qs = params.size > 0 ? `?${params}` : '';
  return apiFetch<WalletResponse[]>(`/api/v1/wallets${qs}`);
}

// User-scoped: returns only the authenticated caller's wallets (derived from the JWT).
export function fetchMyWallets(): Promise<WalletResponse[]> {
  return apiFetch<WalletResponse[]>('/api/v1/wallets/me');
}

export function fetchMyTransactions(page = 0, size = 20): Promise<LedgerEntryResponse[]> {
  return apiFetch<LedgerEntryResponse[]>(`/api/v1/wallets/me/transactions?page=${page}&size=${size}`);
}

export function fetchWallet(id: string): Promise<WalletResponse> {
  return apiFetch<WalletResponse>(`/api/v1/wallets/${id}`);
}

export interface RecipientLookup {
  id: string;
  currency: string;
  status: string;
}

// Resolve a wallet you're about to send to — minimal info, not ownership-checked.
export function fetchRecipient(id: string): Promise<RecipientLookup> {
  return apiFetch<RecipientLookup>(`/api/v1/wallets/${id}/recipient`);
}

export function fetchWalletEntries(id: string): Promise<LedgerEntryResponse[]> {
  return apiFetch<LedgerEntryResponse[]>(`/api/v1/wallets/${id}/entries`);
}

export function createWallet(req: CreateWalletRequest): Promise<WalletResponse> {
  return apiFetch<WalletResponse>('/api/v1/wallets', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export function topUpWallet(req: TopUpRequest): Promise<WalletResponse> {
  return apiFetch<WalletResponse>('/api/v1/wallets/top-up', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export function transferWallet(req: TransferRequest): Promise<TransferResponse> {
  return apiFetch<TransferResponse>('/api/v1/wallets/transfer', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export function fetchRecentRecipients(limit = 5): Promise<RecentRecipientResponse[]> {
  return apiFetch<RecentRecipientResponse[]>(`/api/v1/wallets/recent-recipients?limit=${limit}`);
}

export function fetchWalletStats(): Promise<WalletStatsResponse> {
  return apiFetch<WalletStatsResponse>('/api/v1/wallets/stats');
}

export function freezeWallet(id: string): Promise<WalletResponse> {
  return apiFetch<WalletResponse>(`/api/v1/wallets/${id}/freeze`, { method: 'POST' });
}

export function unfreezeWallet(id: string): Promise<WalletResponse> {
  return apiFetch<WalletResponse>(`/api/v1/wallets/${id}/unfreeze`, { method: 'POST' });
}
