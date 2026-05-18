package com.walletledger.dto;

import com.walletledger.domain.User;
import java.time.Instant;
import java.util.UUID;

public record UserResponse(UUID id, String username, String email, Instant createdAt) {

    public static UserResponse from(User u) {
        return new UserResponse(u.id, u.username, u.email, u.createdAt);
    }
}
