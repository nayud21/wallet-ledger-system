package com.walletledger.reconciliation.dto;

public record ReconciliationMatchResponse(
        Long id,
        Long ledgerEntryId,
        Long externalStatementId,
        String details
) {}
