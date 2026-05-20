package com.walletledger.dto;

import com.walletledger.domain.LedgerTransaction;
import java.time.Instant;
import java.util.List;

public record LedgerTransactionResponse(Long id, String idempotencyKey, String status, String description, Instant createdAt, List<LedgerEntryResponse> entries) {

    public static LedgerTransactionResponse from(LedgerTransaction tx) {
        return new LedgerTransactionResponse(tx.id, tx.idempotencyKey, tx.status, tx.description, tx.createdAt, null);
    }

    public static LedgerTransactionResponse from(LedgerTransaction tx, List<LedgerEntryResponse> entries) {
        return new LedgerTransactionResponse(tx.id, tx.idempotencyKey, tx.status, tx.description, tx.createdAt, entries);
    }
}
