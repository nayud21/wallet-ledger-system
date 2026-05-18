package com.walletledger.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ledger_accounts")
public class LedgerAccount extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false, unique = true, length = 128)
    public String name;

    @Column(nullable = false, length = 32)
    public String type;

    @Column(columnDefinition = "jsonb", insertable = true, updatable = true)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    public String metadata;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
