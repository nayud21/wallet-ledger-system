export interface UserResponse {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface WalletResponse {
  id: string;
  userId: string;
  currency: string;
  availableBalance: number;
  reservedBalance: number;
  status: string;
  updatedAt: string;
}

export interface LedgerEntryResponse {
  id: number;
  ledgerTxId: number;
  direction: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
  reference: string | null;
  createdAt: string;
}

export interface LedgerTransactionResponse {
  id: number;
  idempotencyKey: string;
  status: string;
  description: string;
  createdAt: string;
  entries?: LedgerEntryResponse[];
}

export interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
}

// Mismatch 1 fix: no idempotencyKey (backend doesn't have it); add optional externalId
export interface CreateWalletRequest {
  userId: string;
  currency: string;
  externalId?: string;
}

// Mismatch 2 fix: description → externalRef
export interface TopUpRequest {
  walletId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  externalRef?: string;
}

// Mismatch 3 fix: remove description (not in backend DTO)
export interface TransferRequest {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

// Mismatch 4 fix: add TransferResponse
export interface TransferResponse {
  from: WalletResponse;
  to: WalletResponse;
}

// Mismatch 5 fix: description → reason (required, not optional)
export interface ReversalRequest {
  ledgerTransactionId: number;
  idempotencyKey: string;
  reason: string;
}
