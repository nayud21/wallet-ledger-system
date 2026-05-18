package com.walletledger.service;

import com.walletledger.domain.*;
import com.walletledger.dto.LedgerTransactionResponse;
import com.walletledger.dto.ReversalRequest;
import com.walletledger.repository.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import java.time.Instant;
import java.util.List;

@ApplicationScoped
public class LedgerService {

    @Inject LedgerTransactionRepository ledgerTxRepo;
    @Inject LedgerEntryRepository ledgerEntryRepo;
    @Inject LedgerAccountRepository ledgerAccountRepo;
    @Inject WalletRepository walletRepo;
    @Inject WalletBalanceSnapshotRepository snapshotRepo;

    @Transactional
    public LedgerTransactionResponse reverse(ReversalRequest req) {
        LedgerTransaction existing = ledgerTxRepo.findByIdempotencyKey(req.idempotencyKey())
            .orElse(null);
        if (existing != null) {
            return LedgerTransactionResponse.from(existing);
        }

        LedgerTransaction original = ledgerTxRepo.findByIdOptional(req.ledgerTransactionId())
            .orElseThrow(() -> new NotFoundException("Transaction not found: " + req.ledgerTransactionId()));

        List<LedgerEntry> originalEntries = ledgerEntryRepo.findByTxId(original.id);

        LedgerTransaction reversal = new LedgerTransaction();
        reversal.idempotencyKey = req.idempotencyKey();
        reversal.description = "REVERSAL:" + original.id + ":" + req.reason();
        ledgerTxRepo.persist(reversal);

        for (LedgerEntry orig : originalEntries) {
            LedgerEntry mirror = new LedgerEntry();
            mirror.ledgerAccountId = orig.ledgerAccountId;
            mirror.ledgerTxId = reversal.id;
            mirror.direction = "DEBIT".equals(orig.direction) ? "CREDIT" : "DEBIT";
            mirror.amount = orig.amount;
            mirror.currency = orig.currency;
            mirror.reference = orig.reference;
            ledgerEntryRepo.persist(mirror);

            // Reflect balance change on the wallet whose liability account is affected
            walletRepo.findByLedgerAccountId(orig.ledgerAccountId).ifPresent(wallet -> {
                // mirror.direction is the reversal direction:
                //   CREDIT in reversal → original was DEBIT → wallet was losing; reversal gives money back
                //   DEBIT in reversal  → original was CREDIT → wallet was gaining; reversal takes money away
                if ("CREDIT".equals(mirror.direction)) {
                    wallet.availableBalance = wallet.availableBalance.add(orig.amount);
                } else {
                    wallet.availableBalance = wallet.availableBalance.subtract(orig.amount);
                }
                wallet.updatedAt = Instant.now();

                WalletBalanceSnapshot snap = new WalletBalanceSnapshot();
                snap.walletId = wallet.id;
                snap.availableBalance = wallet.availableBalance;
                snap.reservedBalance = wallet.reservedBalance;
                snap.ledgerTxId = reversal.id;
                snapshotRepo.persist(snap);
            });
        }

        return LedgerTransactionResponse.from(reversal);
    }
}
