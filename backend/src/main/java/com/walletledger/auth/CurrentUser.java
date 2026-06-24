package com.walletledger.auth;

import jakarta.enterprise.context.RequestScoped;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.UUID;

@RequestScoped
@RequiredArgsConstructor
public class CurrentUser {

    private final JsonWebToken jwt;

    public UUID id() {
        return UUID.fromString(jwt.getSubject());
    }

    public boolean isAdmin() {
        return jwt.getGroups() != null && jwt.getGroups().contains("ADMIN");
    }

    /** JWT subject when authenticated, else "system" (e.g. background jobs without a token). */
    public String principalName() {
        return jwt.getSubject() != null ? jwt.getSubject() : "system";
    }
}
