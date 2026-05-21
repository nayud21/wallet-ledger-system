package com.walletledger.ledger.dto;

import com.walletledger.ledger.LedgerEntry;
import java.math.BigDecimal;
import java.time.Instant;

public record LedgerEntryResponse(Long id, Long ledgerTxId, String direction, BigDecimal amount, String currency, String reference, Instant createdAt) {

    public static LedgerEntryResponse from(LedgerEntry e) {
        return new LedgerEntryResponse(e.id, e.ledgerTxId, e.direction, e.amount, e.currency, e.reference, e.createdAt);
    }
}
