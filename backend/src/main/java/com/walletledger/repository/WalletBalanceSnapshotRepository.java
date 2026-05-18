package com.walletledger.repository;

import com.walletledger.domain.WalletBalanceSnapshot;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class WalletBalanceSnapshotRepository implements PanacheRepositoryBase<WalletBalanceSnapshot, Long> {
}
