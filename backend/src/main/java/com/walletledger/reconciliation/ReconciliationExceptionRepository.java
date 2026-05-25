package com.walletledger.reconciliation;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ReconciliationExceptionRepository implements PanacheRepository<ReconciliationException> {

    public List<ReconciliationException> findByRun(Long runId) {
        return list("reconciliationRun.id", runId);
    }

    public List<ReconciliationException> findOpen() {
        return list("status", "OPEN");
    }
}
