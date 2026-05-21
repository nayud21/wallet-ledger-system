import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWallets,
  fetchWallet,
  fetchWalletEntries,
  fetchRecentRecipients,
  topUpWallet,
  transferWallet,
  createWallet,
} from '../api/wallets';
import type { CreateWalletRequest, TopUpRequest, TransferRequest } from '../types/api';

export function useWallets(userId?: string) {
  return useQuery({
    queryKey: ['wallets', userId],
    queryFn: () => fetchWallets(userId),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets'] }),
  });
}

export function useTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: TopUpRequest) => topUpWallet(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets'] }),
  });
}

export function useTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: TransferRequest) => transferWallet(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['recentRecipients'] });
    },
  });
}

export function useRecentRecipients(userId: string) {
  return useQuery({
    queryKey: ['recentRecipients', userId],
    queryFn: () => fetchRecentRecipients(userId),
    enabled: !!userId,
  });
}
