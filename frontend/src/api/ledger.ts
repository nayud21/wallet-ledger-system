import { apiFetch } from './client';
import type { LedgerTransactionResponse, PageResponse, ReversalRequest } from '../types/api';

export function fetchTransactions(
  page: number,
  size: number,
): Promise<PageResponse<LedgerTransactionResponse>> {
  return apiFetch<PageResponse<LedgerTransactionResponse>>(
    `/api/v1/ledger/transactions?page=${page}&size=${size}`,
  );
}

export function reverseTransaction(req: ReversalRequest): Promise<LedgerTransactionResponse> {
  return apiFetch<LedgerTransactionResponse>('/api/v1/ledger/reversal', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}
