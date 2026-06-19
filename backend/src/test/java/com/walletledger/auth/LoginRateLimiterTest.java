package com.walletledger.auth;

import com.walletledger.shared.exception.RateLimitedException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LoginRateLimiterTest {

    private LoginRateLimiter newLimiter(int max) {
        LoginRateLimiter limiter = new LoginRateLimiter();
        limiter.maxAttempts = max;
        return limiter;
    }

    @Test
    void blocksAfterExceedingThreshold() {
        LoginRateLimiter limiter = newLimiter(3);
        String ip = "10.0.0.1";
        for (int i = 0; i < 3; i++) {
            limiter.check(ip); // first 3 allowed
        }
        assertThrows(RateLimitedException.class, () -> limiter.check(ip));
    }

    @Test
    void resetClearsCounter() {
        LoginRateLimiter limiter = newLimiter(2);
        String ip = "10.0.0.2";
        limiter.check(ip);
        limiter.check(ip);
        limiter.reset(ip); // e.g. on successful login
        assertDoesNotThrow(() -> limiter.check(ip));
        assertDoesNotThrow(() -> limiter.check(ip));
    }

    @Test
    void differentIpsAreIndependent() {
        LoginRateLimiter limiter = newLimiter(1);
        limiter.check("1.1.1.1");
        assertThrows(RateLimitedException.class, () -> limiter.check("1.1.1.1"));
        assertDoesNotThrow(() -> limiter.check("2.2.2.2"));
    }
}
