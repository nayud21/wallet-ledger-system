package com.walletledger.wallet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateWalletRequest(
    @NotNull UUID userId,
    @NotBlank @Size(min = 3, max = 3) String currency,
    @Size(max = 128) String externalId
) {}
