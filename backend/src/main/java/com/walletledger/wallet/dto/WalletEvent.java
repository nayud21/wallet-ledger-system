package com.walletledger.wallet.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record WalletEvent(
    UUID walletId,
    String type,         // "CREDIT" | "DEBIT"
    BigDecimal amount,
    String currency,
    String description
) {}
