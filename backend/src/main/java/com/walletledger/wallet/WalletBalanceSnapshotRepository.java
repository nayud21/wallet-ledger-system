package com.walletledger.wallet;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class WalletBalanceSnapshotRepository implements PanacheRepositoryBase<WalletBalanceSnapshot, Long> {

    /** Capture the wallet's current balances against the transaction that produced them. */
    public void record(Wallet wallet, Long ledgerTxId) {
        WalletBalanceSnapshot snap = new WalletBalanceSnapshot();
        snap.walletId = wallet.id;
        snap.availableBalance = wallet.availableBalance;
        snap.reservedBalance = wallet.reservedBalance;
        snap.ledgerTxId = ledgerTxId;
        persist(snap);
    }
}
