package com.walletledger.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record WebhookRequest(
        @NotBlank String provider,
        @NotBlank String externalRef,
        @NotNull Map<String, Object> payload
) {}
