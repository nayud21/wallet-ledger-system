package com.walletledger.ledger;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "ledger_entries")
public class LedgerEntry extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "ledger_account_id", nullable = false)
    public Long ledgerAccountId;

    @Column(name = "ledger_tx_id", nullable = false)
    public Long ledgerTxId;

    @Column(nullable = false, length = 8)
    public String direction;

    @Column(nullable = false, precision = 19, scale = 4)
    public BigDecimal amount;

    @Column(nullable = false, length = 3)
    public String currency;

    @Column(length = 128)
    public String reference;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
