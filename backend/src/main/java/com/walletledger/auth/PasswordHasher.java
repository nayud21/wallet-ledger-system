package com.walletledger.auth;

import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class PasswordHasher {

    private static final int COST = 12;

    public String hash(String plain) {
        return BcryptUtil.bcryptHash(plain, COST);
    }

    public boolean matches(String plain, String hash) {
        return hash != null && BcryptUtil.matches(plain, hash);
    }
}
