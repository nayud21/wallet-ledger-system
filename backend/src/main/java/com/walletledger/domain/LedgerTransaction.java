package com.walletledger.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ledger_transactions")
public class LedgerTransaction extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 128)
    public String idempotencyKey;

    @Column(nullable = false, length = 32)
    public String status = "POSTED";

    @Column(length = 512)
    public String description;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
