package com.walletledger.reconciliation.dto;

import java.time.Instant;

public record ReconciliationExceptionResponse(
        Long id,
        String type,
        String payload,
        String status,
        Instant createdAt
) {}
