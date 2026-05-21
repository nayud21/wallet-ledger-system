package com.walletledger.wallet;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "wallet_balance_snapshots")
public class WalletBalanceSnapshot extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "wallet_id", nullable = false)
    public UUID walletId;

    @Column(name = "available_balance", nullable = false, precision = 19, scale = 4)
    public BigDecimal availableBalance;

    @Column(name = "reserved_balance", nullable = false, precision = 19, scale = 4)
    public BigDecimal reservedBalance;

    @Column(name = "ledger_tx_id", nullable = false)
    public Long ledgerTxId;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
