import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTransactions, reverseTransaction } from '../api/ledger';
import type { ReversalRequest } from '../types/api';

export function useTransactions(page: number, size: number) {
  return useQuery({
    queryKey: ['transactions', page, size],
    queryFn: () => fetchTransactions(page, size),
  });
}

export function useReversal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ReversalRequest) => reverseTransaction(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}
