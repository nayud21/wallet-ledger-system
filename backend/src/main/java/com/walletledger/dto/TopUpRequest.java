package com.walletledger.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

public record TopUpRequest(
    @NotNull UUID walletId,
    @NotNull @DecimalMin("0.0001") BigDecimal amount,
    @NotBlank @Size(min = 3, max = 3) String currency,
    @NotBlank @Size(min = 1, max = 128) String idempotencyKey,
    @Size(max = 128) String externalRef
) {}
