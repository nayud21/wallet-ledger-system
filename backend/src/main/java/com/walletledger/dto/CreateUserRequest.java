package com.walletledger.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
    @NotBlank @Size(min = 1, max = 64) String username,
    @NotBlank @Email @Size(max = 255) String email
) {}
