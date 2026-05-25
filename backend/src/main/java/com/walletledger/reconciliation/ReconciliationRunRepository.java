package com.walletledger.reconciliation;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ReconciliationRunRepository implements PanacheRepository<ReconciliationRun> {

    public List<ReconciliationRun> findRecent(int limit) {
        return find("ORDER BY createdAt DESC").page(0, limit).list();
    }
}
