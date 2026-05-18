package com.walletledger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReversalRequest(
    @NotNull Long ledgerTransactionId,
    @NotBlank @Size(min = 1, max = 512) String reason,
    @NotBlank @Size(min = 1, max = 128) String idempotencyKey
) {}
