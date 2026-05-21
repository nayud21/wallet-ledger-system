package com.walletledger.ledger;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@ApplicationScoped
public class LedgerEntryRepository implements PanacheRepositoryBase<LedgerEntry, Long> {

    public List<LedgerEntry> findByTxId(Long txId) {
        return list("ledgerTxId", txId);
    }

    public List<LedgerEntry> findByLedgerAccountId(Long accountId) {
        return list("ledgerAccountId", Sort.by("createdAt").descending(), accountId);
    }

    public BigDecimal sumCreditedLast24h() {
        Instant since = Instant.now().minus(24, ChronoUnit.HOURS);
        Object result = getEntityManager()
            .createQuery("SELECT COALESCE(SUM(e.amount), 0) FROM LedgerEntry e WHERE e.direction = 'CREDIT' AND e.createdAt >= :since")
            .setParameter("since", since)
            .getSingleResult();
        return (BigDecimal) result;
    }
}
