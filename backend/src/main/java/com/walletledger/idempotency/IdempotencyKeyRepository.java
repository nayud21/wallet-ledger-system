package com.walletledger.idempotency;

import com.walletledger.shared.exception.IdempotencyConflictException;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@ApplicationScoped
public class IdempotencyKeyRepository implements PanacheRepositoryBase<IdempotencyKey, String> {

    private static final Duration TTL = Duration.ofHours(24);

    public Optional<IdempotencyKey> findByKey(String key) {
        return findByIdOptional(key);
    }

    /**
     * Checks whether the key is a duplicate request. Throws if the same key was
     * submitted with different parameters (hash mismatch = client bug). Returns
     * true when the key already exists with a matching hash (safe to short-circuit).
     */
    public boolean checkAndGuard(String key, String requestHash) {
        return findByKey(key).map(existing -> {
            if (!existing.requestHash.equals(requestHash)) {
                throw new IdempotencyConflictException(key);
            }
            return true;
        }).orElse(false);
    }

    public void persist(String key, String requestHash) {
        IdempotencyKey record = new IdempotencyKey();
        record.key = key;
        record.requestHash = requestHash;
        record.expiresAt = Instant.now().plus(TTL);
        persist(record);
    }
}
