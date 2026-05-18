package com.walletledger.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "wallets")
public class Wallet extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false)
    public UUID id;

    @Column(name = "user_id", nullable = false)
    public UUID userId;

    @Column(name = "external_id", unique = true, length = 128)
    public String externalId;

    @Column(name = "available_balance", nullable = false, precision = 19, scale = 4)
    public BigDecimal availableBalance = BigDecimal.ZERO;

    @Column(name = "reserved_balance", nullable = false, precision = 19, scale = 4)
    public BigDecimal reservedBalance = BigDecimal.ZERO;

    @Column(nullable = false, length = 3)
    public String currency;

    @Column(nullable = false, length = 32)
    public String status = "ACTIVE";

    @Column(name = "ledger_account_id")
    public Long ledgerAccountId;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();
}
