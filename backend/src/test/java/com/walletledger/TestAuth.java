package com.walletledger;

import io.smallrye.jwt.build.Jwt;

import java.time.Duration;
import java.util.Set;
import java.util.UUID;

/** Mints JWTs signed with the same key the app verifies with — for authenticated RestAssured calls. */
public final class TestAuth {

    private TestAuth() {}

    public static String token(String subject, String username, String role) {
        return Jwt.issuer("wallet-ledger")
            .subject(subject)
            .upn(username)
            .groups(Set.of(role))
            .claim("email", username + "@example.com")
            .expiresIn(Duration.ofHours(1))
            .sign();
    }

    public static String user(UUID userId) {
        return token(userId.toString(), "user-" + userId, "USER");
    }

    public static String admin() {
        return token(UUID.randomUUID().toString(), "admin", "ADMIN");
    }
}
