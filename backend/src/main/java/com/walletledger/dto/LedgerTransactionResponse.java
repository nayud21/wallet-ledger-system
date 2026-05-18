package com.walletledger.dto;

import com.walletledger.domain.LedgerTransaction;
import java.time.Instant;

public record LedgerTransactionResponse(Long id, String idempotencyKey, String status, String description, Instant createdAt) {

    public static LedgerTransactionResponse from(LedgerTransaction tx) {
        return new LedgerTransactionResponse(tx.id, tx.idempotencyKey, tx.status, tx.description, tx.createdAt);
    }
}
