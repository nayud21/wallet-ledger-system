package com.walletledger.ledger;

import com.walletledger.audit.AuditLogService;
import com.walletledger.ledger.dto.LedgerTransactionResponse;
import com.walletledger.ledger.dto.ReversalRequest;
import com.walletledger.shared.exception.AlreadyReversedException;
import com.walletledger.shared.exception.IdempotencyConflictException;
import com.walletledger.shared.util.RequestHasher;
import com.walletledger.wallet.Wallet;
import com.walletledger.wallet.WalletBalanceSnapshot;
import com.walletledger.wallet.WalletBalanceSnapshotRepository;
import com.walletledger.wallet.WalletRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import lombok.RequiredArgsConstructor;
import java.time.Instant;
import java.util.List;

@ApplicationScoped
@RequiredArgsConstructor
public class LedgerService {

    private final LedgerTransactionRepository ledgerTxRepo;
    private final LedgerEntryRepository ledgerEntryRepo;
    private final LedgerAccountRepository ledgerAccountRepo;
    private final WalletRepository walletRepo;
    private final WalletBalanceSnapshotRepository snapshotRepo;
    private final AuditLogService auditLogService;

    @Transactional
    public LedgerTransactionResponse reverse(ReversalRequest req) {
        String hash = RequestHasher.hash(String.valueOf(req.ledgerTransactionId()), req.reason());
        LedgerTransaction existing = ledgerTxRepo.findByIdempotencyKey(req.idempotencyKey()).orElse(null);
        if (existing != null) {
            if (existing.requestHash != null && !existing.requestHash.equals(hash)) {
                throw new IdempotencyConflictException(req.idempotencyKey());
            }
            return LedgerTransactionResponse.from(existing);
        }

        LedgerTransaction original = ledgerTxRepo.findByIdOptional(req.ledgerTransactionId())
            .orElseThrow(() -> new NotFoundException("Transaction not found: " + req.ledgerTransactionId()));

        if (original.description != null && original.description.startsWith("REVERSAL:")) {
            throw new AlreadyReversedException(original.id);
        }

        List<LedgerEntry> originalEntries = ledgerEntryRepo.findByTxId(original.id);

        LedgerTransaction reversal = new LedgerTransaction();
        reversal.idempotencyKey = req.idempotencyKey();
        reversal.description = "REVERSAL:" + original.id + ":" + req.reason();
        reversal.requestHash = hash;
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

        auditLogService.log("ledger_transaction", String.valueOf(original.id), "REVERSAL",
            "{\"reversalTxId\":" + reversal.id + ",\"reason\":\"" + req.reason() + "\"}");

        return LedgerTransactionResponse.from(reversal);
    }
}
