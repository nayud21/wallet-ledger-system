package com.walletledger.ledger;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ledger_transactions")
public class LedgerTransaction extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    // Trace reference back to the originating request. No longer enforces
    // uniqueness — idempotency_keys table is now the authoritative dedup store.
    @Column(name = "idempotency_key", length = 128)
    public String idempotencyKey;

    @Column(nullable = false, length = 32)
    public String status = "POSTED";

    @Column(length = 512)
    public String description;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
