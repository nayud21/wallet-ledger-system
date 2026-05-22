package com.walletledger.idempotency;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "idempotency_keys")
public class IdempotencyKey extends PanacheEntityBase {

    @Id
    @Column(length = 128)
    public String key;

    @Column(name = "request_hash", nullable = false, length = 64)
    public String requestHash;

    // Keys expire after the client's retry window. Expired rows can be pruned
    // without affecting financial records in ledger_transactions.
    @Column(name = "expires_at", nullable = false)
    public Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
