package com.walletledger.auth;

import com.walletledger.shared.exception.RateLimitedException;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fixed-window login rate limiter keyed by client IP. In-memory only — correct for a
 * single instance, lost on restart. Swap for Redis when scaling horizontally.
 */
@ApplicationScoped
public class LoginRateLimiter {

    private static final long WINDOW_SECONDS = 60;

    @ConfigProperty(name = "auth.login.max-attempts-per-minute", defaultValue = "10")
    int maxAttempts;

    private record Window(long startEpochSec, int count) {}

    private final ConcurrentHashMap<String, Window> attempts = new ConcurrentHashMap<>();

    public void check(String ip) {
        long now = Instant.now().getEpochSecond();
        Window updated = attempts.compute(ip, (k, w) -> {
            if (w == null || now - w.startEpochSec() >= WINDOW_SECONDS) {
                return new Window(now, 1);
            }
            return new Window(w.startEpochSec(), w.count() + 1);
        });
        if (updated.count() > maxAttempts) {
            throw new RateLimitedException("Too many login attempts. Try again later.");
        }
    }

    public void reset(String ip) {
        attempts.remove(ip);
    }
}
