package com.walletledger.wallet.dto;

import java.math.BigDecimal;

public record WalletStatsResponse(
        long totalWallets,
        long activeWallets,
        BigDecimal totalVolume24h,
        long pendingEvents
) {}
