package com.walletledger.reconciliation;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ReconciliationMatchRepository implements PanacheRepository<ReconciliationMatch> {

    public List<ReconciliationMatch> findByRun(Long runId) {
        return list("reconciliationRun.id", runId);
    }
}
