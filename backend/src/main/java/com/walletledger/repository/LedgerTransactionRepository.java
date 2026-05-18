package com.walletledger.repository;

import com.walletledger.domain.LedgerTransaction;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Optional;

@ApplicationScoped
public class LedgerTransactionRepository implements PanacheRepositoryBase<LedgerTransaction, Long> {

    public Optional<LedgerTransaction> findByIdempotencyKey(String key) {
        return find("idempotencyKey", key).firstResultOptional();
    }
}
