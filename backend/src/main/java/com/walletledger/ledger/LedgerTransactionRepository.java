package com.walletledger.ledger;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class LedgerTransactionRepository implements PanacheRepositoryBase<LedgerTransaction, Long> {
}
