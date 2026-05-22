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

    @Column(name = "expires_at", nullable = false)
    public Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();

    // Stripe-style loose reference — nullable so wallet-only operations that
    // produce no ledger entity can still use the same idempotency table.
    // entity_id is String to accommodate both UUID and Long PKs.
    @Column(name = "entity_type", length = 64)
    public String entityType;

    @Column(name = "entity_id", length = 128)
    public String entityId;
}
