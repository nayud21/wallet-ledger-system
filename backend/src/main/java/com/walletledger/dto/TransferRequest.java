package com.walletledger.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

public record TransferRequest(
    @NotNull UUID fromWalletId,
    @NotNull UUID toWalletId,
    @NotNull @DecimalMin("0.0001") BigDecimal amount,
    @NotBlank @Size(min = 3, max = 3) String currency,
    @NotBlank @Size(min = 1, max = 128) String idempotencyKey
) {}
