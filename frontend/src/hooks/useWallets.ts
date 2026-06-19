import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWallets,
  fetchMyWallets,
  fetchMyTransactions,
  fetchWallet,
  fetchWalletEntries,
  fetchRecentRecipients,
  fetchWalletStats,
  freezeWallet,
  unfreezeWallet,
  topUpWallet,
  transferWallet,
  createWallet,
} from '../api/wallets';
import type { CreateWalletRequest, TopUpRequest, TransferRequest } from '../types/api';

export function useWallets(userId?: string, status?: string) {
  return useQuery({
    queryKey: ['wallets', userId, status],
    queryFn: () => fetchWallets(userId, status),
  });
}

// Consumer-facing: the caller's own wallets, scoped server-side by JWT.
export function useMyWallets() {
  return useQuery({
    queryKey: ['myWallets'],
    queryFn: fetchMyWallets,
  });
}

export function useMyTransactions(page = 0, size = 20) {
  return useQuery({
    queryKey: ['myTransactions', page, size],
    queryFn: () => fetchMyTransactions(page, size),
  });
}

export function useWallet(id: string | null) {
  return useQuery({
    queryKey: ['wallets', id],
    queryFn: () => fetchWallet(id!),
    enabled: !!id,
  });
}

export function useWalletEntries(id: string | null) {
  return useQuery({
    queryKey: ['walletEntries', id],
    queryFn: () => fetchWalletEntries(id!),
    enabled: !!id,
  });
}

export function useCreateWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateWalletRequest) => createWallet(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['myWallets'] });
    },
  });
}

export function useTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: TopUpRequest) => topUpWallet(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['myWallets'] });
      qc.invalidateQueries({ queryKey: ['myTransactions'] });
    },
  });
}

export function useTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: TransferRequest) => transferWallet(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['myWallets'] });
      qc.invalidateQueries({ queryKey: ['myTransactions'] });
      qc.invalidateQueries({ queryKey: ['recentRecipients'] });
    },
  });
}

export function useRecentRecipients() {
  return useQuery({
    queryKey: ['recentRecipients'],
    queryFn: () => fetchRecentRecipients(),
  });
}

export function useWalletStats() {
  return useQuery({
    queryKey: ['walletStats'],
    queryFn: fetchWalletStats,
    staleTime: 30_000,
  });
}

export function useFreezeWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => freezeWallet(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets'] }),
  });
}

export function useUnfreezeWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unfreezeWallet(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets'] }),
  });
}
