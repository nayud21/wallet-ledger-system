package com.walletledger.service;

import com.walletledger.domain.*;
import com.walletledger.dto.*;
import com.walletledger.exception.*;
import com.walletledger.repository.*;
import com.walletledger.util.RequestHasher;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import lombok.RequiredArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@ApplicationScoped
@RequiredArgsConstructor
public class WalletService {

    private final UserRepository userRepo;
    private final WalletRepository walletRepo;
    private final LedgerAccountRepository ledgerAccountRepo;
    private final LedgerTransactionRepository ledgerTxRepo;
    private final LedgerEntryRepository ledgerEntryRepo;
    private final WalletBalanceSnapshotRepository snapshotRepo;

    @Transactional
    public WalletResponse createWallet(CreateWalletRequest req) {
        if (!userRepo.findByIdOptional(req.userId()).isPresent()) {
            throw new NotFoundException("User not found: " + req.userId());
        }

        LedgerAccount account = new LedgerAccount();
        account.name = "WALLET_LIABILITY:" + UUID.randomUUID();
        account.type = "LIABILITY";
        ledgerAccountRepo.persist(account);

        Wallet wallet = new Wallet();
        wallet.userId = req.userId();
        wallet.currency = req.currency().toUpperCase();
        wallet.externalId = req.externalId();
        wallet.ledgerAccountId = account.id;
        walletRepo.persist(wallet);

        return WalletResponse.from(wallet);
    }

    @Transactional
    public WalletResponse topUp(TopUpRequest req) {
        String hash = RequestHasher.hash(req.walletId().toString(), req.amount().toPlainString(), req.currency().toUpperCase());
        ledgerTxRepo.findByIdempotencyKey(req.idempotencyKey()).ifPresent(existing -> {
            if (existing.requestHash != null && !existing.requestHash.equals(hash)) {
                throw new IdempotencyConflictException(req.idempotencyKey());
            }
        });
        if (ledgerTxRepo.findByIdempotencyKey(req.idempotencyKey()).isPresent()) {
            Wallet wallet = walletRepo.findByIdOptional(req.walletId())
                .orElseThrow(() -> new NotFoundException("Wallet not found: " + req.walletId()));
            return WalletResponse.from(wallet);
        }

        Wallet wallet = walletRepo.findByIdForUpdate(req.walletId())
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + req.walletId()));

        if (!"ACTIVE".equals(wallet.status)) {
            throw new WalletNotActiveException(wallet.id, wallet.status);
        }
        if (!wallet.currency.equals(req.currency().toUpperCase())) {
            throw new CurrencyMismatchException(wallet.currency, req.currency().toUpperCase());
        }

        LedgerAccount settlement = ledgerAccountRepo.findByName("SETTLEMENT_ASSET")
            .orElseThrow(() -> new IllegalStateException("SETTLEMENT_ASSET account missing"));
        LedgerAccount walletAccount = ledgerAccountRepo.findByIdOptional(wallet.ledgerAccountId)
            .orElseThrow(() -> new IllegalStateException("Wallet ledger account missing"));

        LedgerTransaction tx = new LedgerTransaction();
        tx.idempotencyKey = req.idempotencyKey();
        tx.description = "TOP_UP:" + wallet.id;
        tx.requestHash = hash;
        ledgerTxRepo.persist(tx);

        // Double-entry: asset side (DEBIT settlement = money enters system), liability side (CREDIT wallet)
        persistEntry(settlement.id, tx.id, "DEBIT", req.amount(), wallet.currency, req.externalRef());
        persistEntry(walletAccount.id, tx.id, "CREDIT", req.amount(), wallet.currency, req.externalRef());

        wallet.availableBalance = wallet.availableBalance.add(req.amount());
        wallet.updatedAt = Instant.now();

        persistSnapshot(wallet, tx.id);
        return WalletResponse.from(wallet);
    }

    @Transactional
    public TransferResponse transfer(TransferRequest req) {
        if (req.fromWalletId().equals(req.toWalletId())) {
            throw new jakarta.ws.rs.BadRequestException("Cannot transfer to the same wallet");
        }

        String hash = RequestHasher.hash(req.fromWalletId().toString(), req.toWalletId().toString(),
            req.amount().toPlainString(), req.currency().toUpperCase());
        ledgerTxRepo.findByIdempotencyKey(req.idempotencyKey()).ifPresent(existing -> {
            if (existing.requestHash != null && !existing.requestHash.equals(hash)) {
                throw new IdempotencyConflictException(req.idempotencyKey());
            }
        });

        if (ledgerTxRepo.findByIdempotencyKey(req.idempotencyKey()).isPresent()) {
            Wallet from = walletRepo.findByIdOptional(req.fromWalletId())
                .orElseThrow(() -> new NotFoundException("Source wallet not found"));
            Wallet to = walletRepo.findByIdOptional(req.toWalletId())
                .orElseThrow(() -> new NotFoundException("Target wallet not found"));
            return new TransferResponse(WalletResponse.from(from), WalletResponse.from(to));
        }

        // Lock in ascending UUID order to prevent deadlock
        UUID firstId = req.fromWalletId().compareTo(req.toWalletId()) <= 0
            ? req.fromWalletId() : req.toWalletId();
        UUID secondId = req.fromWalletId().compareTo(req.toWalletId()) <= 0
            ? req.toWalletId() : req.fromWalletId();

        Wallet first = walletRepo.findByIdForUpdate(firstId)
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + firstId));
        Wallet second = walletRepo.findByIdForUpdate(secondId)
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + secondId));

        Wallet from = req.fromWalletId().equals(firstId) ? first : second;
        Wallet to   = req.fromWalletId().equals(firstId) ? second : first;

        if (!"ACTIVE".equals(from.status)) throw new WalletNotActiveException(from.id, from.status);
        if (!"ACTIVE".equals(to.status)) throw new WalletNotActiveException(to.id, to.status);
        String currency = req.currency().toUpperCase();
        if (!from.currency.equals(currency)) throw new CurrencyMismatchException(from.currency, currency);
        if (!to.currency.equals(currency)) throw new CurrencyMismatchException(to.currency, currency);
        if (from.availableBalance.compareTo(req.amount()) < 0) {
            throw new InsufficientBalanceException(currency, from.availableBalance, req.amount());
        }

        LedgerAccount fromAccount = ledgerAccountRepo.findByIdOptional(from.ledgerAccountId)
            .orElseThrow(() -> new IllegalStateException("Source wallet ledger account missing"));
        LedgerAccount toAccount = ledgerAccountRepo.findByIdOptional(to.ledgerAccountId)
            .orElseThrow(() -> new IllegalStateException("Target wallet ledger account missing"));

        LedgerTransaction tx = new LedgerTransaction();
        tx.idempotencyKey = req.idempotencyKey();
        tx.description = "TRANSFER:" + from.id + "->" + to.id;
        tx.requestHash = hash;
        ledgerTxRepo.persist(tx);

        // DEBIT source liability (we owe source wallet less), CREDIT target liability (we owe target wallet more)
        persistEntry(fromAccount.id, tx.id, "DEBIT", req.amount(), currency, null);
        persistEntry(toAccount.id, tx.id, "CREDIT", req.amount(), currency, null);

        Instant now = Instant.now();
        from.availableBalance = from.availableBalance.subtract(req.amount());
        from.updatedAt = now;
        to.availableBalance = to.availableBalance.add(req.amount());
        to.updatedAt = now;

        persistSnapshot(from, tx.id);
        persistSnapshot(to, tx.id);

        return new TransferResponse(WalletResponse.from(from), WalletResponse.from(to));
    }

    private void persistEntry(Long accountId, Long txId, String direction,
                               java.math.BigDecimal amount, String currency, String reference) {
        LedgerEntry entry = new LedgerEntry();
        entry.ledgerAccountId = accountId;
        entry.ledgerTxId = txId;
        entry.direction = direction;
        entry.amount = amount;
        entry.currency = currency;
        entry.reference = reference;
        ledgerEntryRepo.persist(entry);
    }

    private void persistSnapshot(Wallet wallet, Long txId) {
        WalletBalanceSnapshot snap = new WalletBalanceSnapshot();
        snap.walletId = wallet.id;
        snap.availableBalance = wallet.availableBalance;
        snap.reservedBalance = wallet.reservedBalance;
        snap.ledgerTxId = txId;
        snapshotRepo.persist(snap);
    }
}
