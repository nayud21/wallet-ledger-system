package com.walletledger.ledger;

import com.walletledger.idempotency.IdempotencyKeyRepository;
import com.walletledger.ledger.dto.ReversalRequest;
import com.walletledger.shared.exception.AlreadyReversedException;
import com.walletledger.shared.exception.IdempotencyConflictException;
import com.walletledger.wallet.Wallet;
import com.walletledger.wallet.WalletBalanceSnapshot;
import com.walletledger.wallet.WalletBalanceSnapshotRepository;
import com.walletledger.wallet.WalletRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@QuarkusTest
class LedgerServiceTest {

    @Inject LedgerService ledgerService;

    @InjectMock LedgerTransactionRepository ledgerTxRepo;
    @InjectMock LedgerEntryRepository ledgerEntryRepo;
    @InjectMock LedgerAccountRepository ledgerAccountRepo;
    @InjectMock WalletRepository walletRepo;
    @InjectMock WalletBalanceSnapshotRepository snapshotRepo;
    @InjectMock IdempotencyKeyRepository idempotencyKeyRepo;

    private LedgerTransaction originalTx;

    @BeforeEach
    void setup() {
        originalTx = new LedgerTransaction();
        originalTx.id = 1L;
        originalTx.idempotencyKey = "ik-original";
        originalTx.description = "TOP_UP:" + UUID.randomUUID();

        when(idempotencyKeyRepo.checkAndGuard(any(), any())).thenReturn(false);
        doNothing().when(idempotencyKeyRepo).persist(any(String.class), any(String.class));
        when(ledgerTxRepo.findByIdOptional(1L)).thenReturn(Optional.of(originalTx));
        when(ledgerEntryRepo.findByTxId(1L)).thenReturn(List.of());
        doNothing().when(ledgerTxRepo).persist(any(LedgerTransaction.class));
    }

    @Test
    void reverse_alreadyReversed_throwsAlreadyReversedException() {
        originalTx.description = "REVERSAL:99:some reason";

        ReversalRequest req = new ReversalRequest(1L, "re-reverse", "ik-rev-1");

        assertThrows(AlreadyReversedException.class, () -> ledgerService.reverse(req));
    }

    @Test
    void reverse_transactionNotFound_throwsNotFoundException() {
        when(ledgerTxRepo.findByIdOptional(99L)).thenReturn(Optional.empty());

        ReversalRequest req = new ReversalRequest(99L, "reason", "ik-rev-2");

        assertThrows(NotFoundException.class, () -> ledgerService.reverse(req));
    }

    @Test
    void reverse_idempotencyConflict_throws409() {
        when(idempotencyKeyRepo.checkAndGuard(eq("ik-conflict"), any()))
            .thenThrow(new IdempotencyConflictException("ik-conflict"));

        ReversalRequest req = new ReversalRequest(1L, "reason", "ik-conflict");

        assertThrows(IdempotencyConflictException.class, () -> ledgerService.reverse(req));
    }

    @Test
    void reverse_mirrorsEntries_withWalletBalanceUpdate() {
        LedgerEntry entry = new LedgerEntry();
        entry.ledgerAccountId = 10L;
        entry.ledgerTxId = 1L;
        entry.direction = "CREDIT";
        entry.amount = new BigDecimal("100.0000");
        entry.currency = "USD";
        when(ledgerEntryRepo.findByTxId(1L)).thenReturn(List.of(entry));

        Wallet wallet = new Wallet();
        wallet.id = UUID.randomUUID();
        wallet.availableBalance = new BigDecimal("100.0000");
        wallet.reservedBalance = BigDecimal.ZERO;
        when(walletRepo.findByLedgerAccountId(10L)).thenReturn(Optional.of(wallet));
        doNothing().when(snapshotRepo).persist(any(WalletBalanceSnapshot.class));
        doNothing().when(ledgerEntryRepo).persist(any(LedgerEntry.class));

        ReversalRequest req = new ReversalRequest(1L, "test", "ik-rev-ok");
        ledgerService.reverse(req);

        // CREDIT reversed → DEBIT in reversal → wallet loses balance
        assertEquals(new BigDecimal("0.0000"), wallet.availableBalance);
        verify(ledgerEntryRepo).persist(any(LedgerEntry.class));
        verify(snapshotRepo).persist(any(WalletBalanceSnapshot.class));
    }
}
