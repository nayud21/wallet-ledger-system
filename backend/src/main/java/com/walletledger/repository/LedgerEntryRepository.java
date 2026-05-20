package com.walletledger.repository;

import com.walletledger.domain.LedgerEntry;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class LedgerEntryRepository implements PanacheRepositoryBase<LedgerEntry, Long> {

    public List<LedgerEntry> findByTxId(Long txId) {
        return list("ledgerTxId", txId);
    }

    public List<LedgerEntry> findByLedgerAccountId(Long accountId) {
        return list("ledgerAccountId", accountId, Sort.by("createdAt").descending());
    }
}
