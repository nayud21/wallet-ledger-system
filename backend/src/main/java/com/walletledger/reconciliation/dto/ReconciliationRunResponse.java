package com.walletledger.reconciliation.dto;

import java.time.Instant;
import java.time.LocalDate;

public record ReconciliationRunResponse(
        Long id,
        LocalDate runDate,
        String status,
        String summary,
        Instant createdAt
) {}
