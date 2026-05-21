package com.walletledger.wallet;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class WalletBalanceSnapshotRepository implements PanacheRepositoryBase<WalletBalanceSnapshot, Long> {
}
