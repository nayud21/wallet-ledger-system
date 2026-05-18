package com.walletledger.repository;

import com.walletledger.domain.LedgerAccount;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Optional;

@ApplicationScoped
public class LedgerAccountRepository implements PanacheRepositoryBase<LedgerAccount, Long> {

    public Optional<LedgerAccount> findByName(String name) {
        return find("name", name).firstResultOptional();
    }
}
