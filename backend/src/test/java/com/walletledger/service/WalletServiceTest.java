package com.walletledger.service;

import com.walletledger.domain.*;
import com.walletledger.dto.*;
import com.walletledger.exception.*;
import com.walletledger.repository.*;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
class WalletServiceTest {

    @Inject WalletService walletService;

    @InjectMock WalletRepository walletRepo;
    @InjectMock LedgerTransactionRepository ledgerTxRepo;
    @InjectMock LedgerAccountRepository ledgerAccountRepo;
    @InjectMock LedgerEntryRepository ledgerEntryRepo;
    @InjectMock WalletBalanceSnapshotRepository snapshotRepo;
    @InjectMock UserRepository userRepo;

    private UUID walletId;
    private Wallet activeWallet;
    private LedgerAccount settlement;
    private LedgerAccount walletAccount;

    @BeforeEach
    void setup() {
        walletId = UUID.randomUUID();

        walletAccount = new LedgerAccount();
        walletAccount.id = 2L;
        walletAccount.name = "WALLET_LIABILITY:test";
        walletAccount.type = "LIABILITY";

        activeWallet = new Wallet();
        activeWallet.id = walletId;
        activeWallet.userId = UUID.randomUUID();
        activeWallet.currency = "USD";
        activeWallet.status = "ACTIVE";
        activeWallet.availableBalance = new BigDecimal("100.0000");
        activeWallet.reservedBalance = BigDecimal.ZERO;
        activeWallet.ledgerAccountId = walletAccount.id;

        settlement = new LedgerAccount();
        settlement.id = 1L;
        settlement.name = "SETTLEMENT_ASSET";
        settlement.type = "ASSET";

        when(ledgerTxRepo.findByIdempotencyKey(any())).thenReturn(Optional.empty());
        when(walletRepo.findByIdForUpdate(walletId)).thenReturn(Optional.of(activeWallet));
        when(walletRepo.findByIdOptional(walletId)).thenReturn(Optional.of(activeWallet));
        when(ledgerAccountRepo.findByName("SETTLEMENT_ASSET")).thenReturn(Optional.of(settlement));
        when(ledgerAccountRepo.findByIdOptional(walletAccount.id)).thenReturn(Optional.of(walletAccount));
        doNothing().when(ledgerTxRepo).persist(any(LedgerTransaction.class));
        doNothing().when(ledgerEntryRepo).persist(any(LedgerEntry.class));
        doNothing().when(snapshotRepo).persist(any(WalletBalanceSnapshot.class));
    }

    @Test
    void topUp_walletNotActive_throwsWalletNotActiveException() {
        activeWallet.status = "SUSPENDED";
        TopUpRequest req = new TopUpRequest(walletId, new BigDecimal("50.00"), "USD", "ik-1", null);

        assertThrows(WalletNotActiveException.class, () -> walletService.topUp(req));
    }

    @Test
    void topUp_currencyMismatch_throwsCurrencyMismatchException() {
        TopUpRequest req = new TopUpRequest(walletId, new BigDecimal("50.00"), "EUR", "ik-2", null);

        assertThrows(CurrencyMismatchException.class, () -> walletService.topUp(req));
    }

    @Test
    void transfer_insufficientBalance_throwsInsufficientBalanceException() {
        UUID toId = UUID.randomUUID();
        Wallet toWallet = new Wallet();
        toWallet.id = toId;
        toWallet.currency = "USD";
        toWallet.status = "ACTIVE";
        toWallet.availableBalance = BigDecimal.ZERO;
        toWallet.reservedBalance = BigDecimal.ZERO;
        toWallet.ledgerAccountId = 3L;

        LedgerAccount toAccount = new LedgerAccount();
        toAccount.id = 3L;

        // Ensure ascending UUID order lock
        UUID firstId = walletId.compareTo(toId) <= 0 ? walletId : toId;
        UUID secondId = walletId.compareTo(toId) <= 0 ? toId : walletId;
        when(walletRepo.findByIdForUpdate(firstId)).thenReturn(
            firstId.equals(walletId) ? Optional.of(activeWallet) : Optional.of(toWallet));
        when(walletRepo.findByIdForUpdate(secondId)).thenReturn(
            secondId.equals(walletId) ? Optional.of(activeWallet) : Optional.of(toWallet));
        when(ledgerAccountRepo.findByIdOptional(3L)).thenReturn(Optional.of(toAccount));

        TransferRequest req = new TransferRequest(walletId, toId, new BigDecimal("999.00"), "USD", "ik-3");

        assertThrows(InsufficientBalanceException.class, () -> walletService.transfer(req));
    }

    @Test
    void transfer_selfTransfer_throwsBadRequestException() {
        TransferRequest req = new TransferRequest(walletId, walletId, new BigDecimal("10.00"), "USD", "ik-4");

        assertThrows(jakarta.ws.rs.BadRequestException.class, () -> walletService.transfer(req));
    }

    @Test
    void topUp_idempotencyConflict_throws409() {
        LedgerTransaction existing = new LedgerTransaction();
        existing.idempotencyKey = "ik-conflict";
        existing.requestHash = "different-hash";
        when(ledgerTxRepo.findByIdempotencyKey("ik-conflict")).thenReturn(Optional.of(existing));

        TopUpRequest req = new TopUpRequest(walletId, new BigDecimal("50.00"), "USD", "ik-conflict", null);

        assertThrows(IdempotencyConflictException.class, () -> walletService.topUp(req));
    }
}
