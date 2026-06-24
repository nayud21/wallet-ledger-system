package com.walletledger.wallet;

import com.walletledger.audit.AuditLogService;
import com.walletledger.auth.CurrentUser;
import com.walletledger.idempotency.IdempotencyKeyRepository;
import com.walletledger.ledger.*;
import com.walletledger.payment.PaymentEventRepository;
import com.walletledger.shared.exception.*;
import com.walletledger.shared.util.RequestHasher;
import com.walletledger.user.UserRepository;
import com.walletledger.wallet.dto.*;
import com.walletledger.wallet.event.WalletEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import lombok.RequiredArgsConstructor;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
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
    private final PaymentEventRepository paymentEventRepo;
    private final IdempotencyKeyRepository idempotencyKeyRepo;
    private final Event<WalletEvent> walletEvents;
    private final AuditLogService auditLogService;
    private final CurrentUser currentUser;

    /** BOLA guard: a non-admin caller may only act on wallets they own. */
    public void assertOwnership(Wallet wallet) {
        if (currentUser.isAdmin()) return;
        if (!wallet.userId.equals(currentUser.id())) {
            throw new ForbiddenException("Wallet does not belong to caller");
        }
    }

    @Transactional
    public WalletResponse createWallet(CreateWalletRequest req) {
        // A non-admin may only create wallets for themselves; admins may create for any user.
        UUID ownerId = currentUser.isAdmin() ? req.userId() : currentUser.id();
        if (!userRepo.findByIdOptional(ownerId).isPresent()) {
            throw new NotFoundException("User not found: " + ownerId);
        }

        LedgerAccount account = new LedgerAccount();
        account.name = "WALLET_LIABILITY:" + UUID.randomUUID();
        account.type = "LIABILITY";
        ledgerAccountRepo.persist(account);

        Wallet wallet = new Wallet();
        wallet.userId = ownerId;
        wallet.currency = req.currency().toUpperCase();
        wallet.externalId = req.externalId();
        wallet.ledgerAccountId = account.id;
        walletRepo.persist(wallet);

        auditLogService.log("wallet", wallet.id.toString(), "CREATE",
            Map.of("userId", wallet.userId, "currency", wallet.currency),
            currentUser.principalName());

        return WalletResponse.from(wallet);
    }

    @Transactional
    public WalletResponse topUp(TopUpRequest req) {
        String currency = req.currency().toUpperCase();
        String hash = RequestHasher.hash(req.walletId().toString(), req.amount().toPlainString(), currency);

        // idempotency_keys is the single source of truth for dedup. checkAndGuard returns true
        // if the key already exists with a matching hash (safe replay); throws 409 on hash mismatch.
        if (idempotencyKeyRepo.checkAndGuard(req.idempotencyKey(), hash)) {
            return replay(req.walletId());
        }
        Wallet wallet = walletRepo.findByIdForUpdate(req.walletId())
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + req.walletId()));
        assertOwnership(wallet);
        assertActiveCurrency(wallet, currency);

        LedgerAccount settlement = ledgerAccountRepo.findByName("SETTLEMENT_ASSET")
            .orElseThrow(() -> new IllegalStateException("SETTLEMENT_ASSET account missing"));
        LedgerAccount walletAccount = ledgerAccountRepo.findByIdOptional(wallet.ledgerAccountId)
            .orElseThrow(() -> new IllegalStateException("Wallet ledger account missing"));

        LedgerTransaction tx = newTransaction(req.idempotencyKey(), hash, "TOP_UP:" + wallet.id);

        // Double-entry: asset side (DEBIT settlement = money enters system), liability side (CREDIT wallet)
        persistEntry(settlement.id, tx.id, "DEBIT", req.amount(), wallet.currency, req.externalRef());
        persistEntry(walletAccount.id, tx.id, "CREDIT", req.amount(), wallet.currency, req.externalRef());

        wallet.availableBalance = wallet.availableBalance.add(req.amount());
        wallet.updatedAt = Instant.now();

        snapshotRepo.record(wallet, tx.id);
        walletEvents.fire(new WalletEvent(wallet.id, "CREDIT", req.amount(), wallet.currency, "TOP_UP"));
        auditLogService.log("wallet", wallet.id.toString(), "TOP_UP",
            Map.of("amount", req.amount().toPlainString(), "currency", wallet.currency, "ledgerTxId", tx.id),
            currentUser.principalName());
        return WalletResponse.from(wallet);
    }

    @Transactional
    public TransferResponse transfer(TransferRequest req) {
        if (req.fromWalletId().equals(req.toWalletId())) {
            throw new BadRequestException("Cannot transfer to the same wallet");
        }
        String currency = req.currency().toUpperCase();
        String hash = RequestHasher.hash(req.fromWalletId().toString(), req.toWalletId().toString(),
            req.amount().toPlainString(), currency);

        if (idempotencyKeyRepo.checkAndGuard(req.idempotencyKey(), hash)) {
            return replayTransfer(req.fromWalletId(), req.toWalletId());
        }

        LockedPair pair = lockInOrder(req.fromWalletId(), req.toWalletId());
        Wallet from = pair.from();
        Wallet to = pair.to();

        assertOwnership(from);
        assertActiveCurrency(from, currency);
        assertActiveCurrency(to, currency);
        if (from.availableBalance.compareTo(req.amount()) < 0) {
            throw new InsufficientBalanceException(currency, from.availableBalance, req.amount());
        }

        LedgerAccount fromAccount = ledgerAccountRepo.findByIdOptional(from.ledgerAccountId)
            .orElseThrow(() -> new IllegalStateException("Source wallet ledger account missing"));
        LedgerAccount toAccount = ledgerAccountRepo.findByIdOptional(to.ledgerAccountId)
            .orElseThrow(() -> new IllegalStateException("Target wallet ledger account missing"));

        LedgerTransaction tx = newTransaction(req.idempotencyKey(), hash, "TRANSFER:" + from.id + "->" + to.id);

        // DEBIT source liability (we owe source wallet less), CREDIT target liability (we owe target wallet more)
        persistEntry(fromAccount.id, tx.id, "DEBIT", req.amount(), currency, null);
        persistEntry(toAccount.id, tx.id, "CREDIT", req.amount(), currency, null);

        Instant now = Instant.now();
        from.availableBalance = from.availableBalance.subtract(req.amount());
        from.updatedAt = now;
        to.availableBalance = to.availableBalance.add(req.amount());
        to.updatedAt = now;

        snapshotRepo.record(from, tx.id);
        snapshotRepo.record(to, tx.id);

        walletEvents.fire(new WalletEvent(from.id, "DEBIT", req.amount(), currency, "TRANSFER_OUT"));
        walletEvents.fire(new WalletEvent(to.id, "CREDIT", req.amount(), currency, "TRANSFER_IN"));
        auditLogService.log("wallet", from.id.toString(), "TRANSFER_OUT",
            Map.of("toWalletId", to.id, "amount", req.amount().toPlainString(),
                "currency", currency, "ledgerTxId", tx.id),
            currentUser.principalName());
        auditLogService.log("wallet", to.id.toString(), "TRANSFER_IN",
            Map.of("fromWalletId", from.id, "amount", req.amount().toPlainString(),
                "currency", currency, "ledgerTxId", tx.id),
            currentUser.principalName());

        return new TransferResponse(WalletResponse.from(from), WalletResponse.from(to));
    }

    @Transactional
    public WalletResponse freeze(UUID id) {
        return changeStatus(id, "FROZEN", "FREEZE");
    }

    @Transactional
    public WalletResponse unfreeze(UUID id) {
        return changeStatus(id, "ACTIVE", "UNFREEZE");
    }

    public WalletStatsResponse getStats() {
        long totalWallets = walletRepo.count();
        long activeWallets = walletRepo.count("status", "ACTIVE");
        BigDecimal totalVolume24h = ledgerEntryRepo.sumCreditedLast24h();
        long pendingEvents = paymentEventRepo.count("status", "PENDING");
        return new WalletStatsResponse(totalWallets, activeWallets, totalVolume24h, pendingEvents);
    }

    private WalletResponse changeStatus(UUID id, String newStatus, String action) {
        Wallet wallet = walletRepo.findByIdOptional(id)
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + id));
        String previous = wallet.status;
        wallet.status = newStatus;
        wallet.updatedAt = Instant.now();
        auditLogService.log("wallet", id.toString(), action,
            Map.of("previousStatus", previous, "newStatus", newStatus),
            currentUser.principalName());
        return WalletResponse.from(wallet);
    }

    /** Replay of a top-up: balances already settled, return current state after ownership check. */
    private WalletResponse replay(UUID walletId) {
        Wallet wallet = walletRepo.findByIdOptional(walletId)
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + walletId));
        assertOwnership(wallet);
        return WalletResponse.from(wallet);
    }

    private TransferResponse replayTransfer(UUID fromId, UUID toId) {
        Wallet from = walletRepo.findByIdOptional(fromId)
            .orElseThrow(() -> new NotFoundException("Source wallet not found"));
        assertOwnership(from);
        Wallet to = walletRepo.findByIdOptional(toId)
            .orElseThrow(() -> new NotFoundException("Target wallet not found"));
        return new TransferResponse(WalletResponse.from(from), WalletResponse.from(to));
    }

    private void assertActiveCurrency(Wallet wallet, String currency) {
        if (!"ACTIVE".equals(wallet.status)) {
            throw new WalletNotActiveException(wallet.id, wallet.status);
        }
        if (!wallet.currency.equals(currency)) {
            throw new CurrencyMismatchException(wallet.currency, currency);
        }
    }

    /** Lock both wallets for update in ascending UUID order to prevent deadlock, then orient them. */
    private LockedPair lockInOrder(UUID fromId, UUID toId) {
        boolean fromFirst = fromId.compareTo(toId) <= 0;
        UUID firstId = fromFirst ? fromId : toId;
        UUID secondId = fromFirst ? toId : fromId;

        Wallet first = walletRepo.findByIdForUpdate(firstId)
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + firstId));
        Wallet second = walletRepo.findByIdForUpdate(secondId)
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + secondId));

        return fromFirst ? new LockedPair(first, second) : new LockedPair(second, first);
    }

    private LedgerTransaction newTransaction(String idempotencyKey, String hash, String description) {
        LedgerTransaction tx = new LedgerTransaction();
        tx.idempotencyKey = idempotencyKey;
        tx.description = description;
        ledgerTxRepo.persist(tx);
        idempotencyKeyRepo.persist(idempotencyKey, hash, "ledger_transaction", String.valueOf(tx.id));
        return tx;
    }

    private void persistEntry(Long accountId, Long txId, String direction,
                               BigDecimal amount, String currency, String reference) {
        LedgerEntry entry = new LedgerEntry();
        entry.ledgerAccountId = accountId;
        entry.ledgerTxId = txId;
        entry.direction = direction;
        entry.amount = amount;
        entry.currency = currency;
        entry.reference = reference;
        ledgerEntryRepo.persist(entry);
    }

    private record LockedPair(Wallet from, Wallet to) {}
}
