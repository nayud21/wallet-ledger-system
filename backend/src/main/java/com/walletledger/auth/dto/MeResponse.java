package com.walletledger.auth.dto;

import java.util.UUID;

public record MeResponse(UUID id, String username, String email, String role) {}
