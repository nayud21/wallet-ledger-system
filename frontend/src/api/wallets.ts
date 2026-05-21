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

export function fetchWallet(id: string): Promise<WalletResponse> {
  return apiFetch<WalletResponse>(`/api/v1/wallets/${id}`);
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

export function fetchRecentRecipients(userId: string, limit = 5): Promise<RecentRecipientResponse[]> {
  return apiFetch<RecentRecipientResponse[]>(
    `/api/v1/wallets/recent-recipients?userId=${encodeURIComponent(userId)}&limit=${limit}`
  );
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
