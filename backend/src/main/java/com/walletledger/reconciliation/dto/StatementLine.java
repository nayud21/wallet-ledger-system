package com.walletledger.reconciliation.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StatementLine(
        String reference,
        BigDecimal amount,
        String currency,
        LocalDate date
) {}
