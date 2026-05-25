package com.walletledger.reconciliation;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ExternalStatementRepository implements PanacheRepository<ExternalStatement> {

    public List<ExternalStatement> findPending() {
        return list("status", "PENDING");
    }
}
