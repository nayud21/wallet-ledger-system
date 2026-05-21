package com.walletledger.wallet;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class WalletRepository implements PanacheRepositoryBase<Wallet, UUID> {

    public Optional<Wallet> findByIdForUpdate(UUID id) {
        return find("id", id).withLock(LockModeType.PESSIMISTIC_WRITE).firstResultOptional();
    }

    public Optional<Wallet> findByLedgerAccountId(Long ledgerAccountId) {
        return find("ledgerAccountId", ledgerAccountId).firstResultOptional();
    }

    public List<Wallet> findByUserId(UUID userId) {
        return list("userId", userId);
    }
}
