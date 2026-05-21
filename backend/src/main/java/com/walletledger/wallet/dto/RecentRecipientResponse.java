package com.walletledger.wallet.dto;

import java.util.UUID;

public record RecentRecipientResponse(
    UUID walletId,
    String username,
    String currency
) {}
