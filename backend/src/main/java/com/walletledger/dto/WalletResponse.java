package com.walletledger.dto;

import com.walletledger.domain.Wallet;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WalletResponse(
    UUID id,
    UUID userId,
    String currency,
    BigDecimal availableBalance,
    BigDecimal reservedBalance,
    String status,
    Instant updatedAt
) {
    public static WalletResponse from(Wallet w) {
        return new WalletResponse(
            w.id, w.userId, w.currency,
            w.availableBalance, w.reservedBalance,
            w.status, w.updatedAt
        );
    }
}
