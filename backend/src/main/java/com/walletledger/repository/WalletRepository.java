package com.walletledger.repository;

import com.walletledger.domain.Wallet;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
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
}
