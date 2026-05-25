package com.walletledger;

import com.walletledger.reconciliation.ReconciliationRun;
import com.walletledger.reconciliation.ReconciliationService;
import com.walletledger.reconciliation.dto.ReconciliationExceptionResponse;
import com.walletledger.reconciliation.dto.ReconciliationMatchResponse;
import com.walletledger.reconciliation.dto.ReconciliationRunResponse;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class ReconciliationTest {

    @Inject
    EntityManager em;

    @Inject
    ReconciliationService reconciliationService;

    private static final LocalDate TEST_DATE = LocalDate.of(2024, 1, 15);

    @BeforeEach
    @Transactional
    void setup() {
        em.createNativeQuery("DELETE FROM reconciliation_exceptions").executeUpdate();
        em.createNativeQuery("DELETE FROM reconciliation_matches").executeUpdate();
        em.createNativeQuery("DELETE FROM reconciliation_runs").executeUpdate();
        em.createNativeQuery("DELETE FROM external_statements WHERE provider = 'test-provider'").executeUpdate();
        em.createNativeQuery("DELETE FROM wallet_balance_snapshots").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_entries").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_transactions").executeUpdate();
        em.createNativeQuery("DELETE FROM idempotency_keys WHERE key LIKE 'recon-ik-%'").executeUpdate();
        em.createNativeQuery("DELETE FROM wallets WHERE external_id LIKE 'recon-%'").executeUpdate();
        em.createNativeQuery("DELETE FROM users WHERE email = 'recon-test@example.com'").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_accounts WHERE name LIKE 'RECON_%'").executeUpdate();
    }

    @Test
    @Transactional
    void runForDate_matchesLedgerEntryWithStatementLine() {
        // Insert a ledger entry with a known reference, amount, currency on TEST_DATE
        Long txId = (Long) em.createNativeQuery(
                "INSERT INTO ledger_transactions (idempotency_key, status, description) " +
                "VALUES ('recon-ik-1', 'POSTED', 'test') RETURNING id", Long.class)
            .getSingleResult();

        Long accountId = (Long) em.createNativeQuery(
                "INSERT INTO ledger_accounts (name, type) VALUES ('RECON_ASSET', 'ASSET') RETURNING id", Long.class)
            .getSingleResult();

        em.createNativeQuery(
                "INSERT INTO ledger_entries (ledger_account_id, ledger_tx_id, direction, amount, currency, reference, created_at) " +
                "VALUES (?1, ?2, 'CREDIT', 100.0000, 'USD', 'REF-001', CAST(?3 AS timestamptz))")
            .setParameter(1, accountId)
            .setParameter(2, txId)
            .setParameter(3, TEST_DATE.toString() + "T10:00:00Z")
            .executeUpdate();

        // Insert matching external statement
        em.createNativeQuery(
                "INSERT INTO external_statements (provider, statement_date, content, status) " +
                "VALUES ('test-provider', ?1, '[{\"reference\":\"REF-001\",\"amount\":100.0,\"currency\":\"USD\",\"date\":\"2024-01-15\"}]', 'PENDING')")
            .setParameter(1, TEST_DATE)
            .executeUpdate();

        ReconciliationRun run = reconciliationService.runForDate(TEST_DATE);

        assertEquals("COMPLETED", run.status);
        assertTrue(run.summary.contains("\"matched\":1"));
        assertTrue(run.summary.contains("\"unmatched\":0"));

        List<ReconciliationMatchResponse> matches = reconciliationService.listMatches(run.id);
        assertEquals(1, matches.size());
        assertNotNull(matches.get(0).ledgerEntryId());

        List<ReconciliationExceptionResponse> exceptions = reconciliationService.listExceptions(run.id);
        assertTrue(exceptions.isEmpty());
    }

    @Test
    @Transactional
    void runForDate_unmatchedStatementLine_createsException() {
        // Statement with no corresponding ledger entry
        em.createNativeQuery(
                "INSERT INTO external_statements (provider, statement_date, content, status) " +
                "VALUES ('test-provider', ?1, '[{\"reference\":\"NO-MATCH\",\"amount\":50.0,\"currency\":\"USD\",\"date\":\"2024-01-15\"}]', 'PENDING')")
            .setParameter(1, TEST_DATE)
            .executeUpdate();

        ReconciliationRun run = reconciliationService.runForDate(TEST_DATE);

        assertEquals("COMPLETED", run.status);
        assertTrue(run.summary.contains("\"unmatched\":1"));

        List<ReconciliationExceptionResponse> exceptions = reconciliationService.listExceptions(run.id);
        assertEquals(1, exceptions.size());
        assertEquals("UNMATCHED_STATEMENT_LINE", exceptions.get(0).type());
        assertEquals("OPEN", exceptions.get(0).status());
    }

    @Test
    @Transactional
    void runForDate_unmatchedLedgerEntry_createsException() {
        Long txId = (Long) em.createNativeQuery(
                "INSERT INTO ledger_transactions (idempotency_key, status, description) " +
                "VALUES ('recon-ik-2', 'POSTED', 'test') RETURNING id", Long.class)
            .getSingleResult();

        Long accountId = (Long) em.createNativeQuery(
                "INSERT INTO ledger_accounts (name, type) VALUES ('RECON_ASSET_2', 'ASSET') RETURNING id", Long.class)
            .getSingleResult();

        em.createNativeQuery(
                "INSERT INTO ledger_entries (ledger_account_id, ledger_tx_id, direction, amount, currency, reference, created_at) " +
                "VALUES (?1, ?2, 'CREDIT', 200.0000, 'USD', 'ORPHAN-REF', CAST(?3 AS timestamptz))")
            .setParameter(1, accountId)
            .setParameter(2, txId)
            .setParameter(3, TEST_DATE.toString() + "T12:00:00Z")
            .executeUpdate();

        // No statement uploaded for TEST_DATE

        ReconciliationRun run = reconciliationService.runForDate(TEST_DATE);

        assertEquals("COMPLETED", run.status);

        List<ReconciliationExceptionResponse> exceptions = reconciliationService.listExceptions(run.id);
        assertTrue(exceptions.stream().anyMatch(e -> "UNMATCHED_LEDGER_ENTRY".equals(e.type())));
    }

    @Test
    @Transactional
    void listRuns_returnsRecentRuns() {
        reconciliationService.runForDate(TEST_DATE);
        reconciliationService.runForDate(TEST_DATE.plusDays(1));

        List<ReconciliationRunResponse> runs = reconciliationService.listRuns(10);
        assertTrue(runs.size() >= 2);
    }
}
