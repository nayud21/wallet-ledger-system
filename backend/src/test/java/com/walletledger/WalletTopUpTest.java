package com.walletledger;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class WalletTopUpTest {

    @Inject
    EntityManager em;

    private UUID userId;
    private UUID walletId;

    @BeforeEach
    @Transactional
    void setup() {
        em.createNativeQuery("DELETE FROM wallet_balance_snapshots").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_entries").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_transactions").executeUpdate();
        em.createNativeQuery("DELETE FROM idempotency_keys WHERE key LIKE 'ik-%'").executeUpdate();
        em.createNativeQuery("DELETE FROM wallets WHERE external_id LIKE 'test-%'").executeUpdate();
        em.createNativeQuery("DELETE FROM users WHERE email LIKE 'test-%@example.com'").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_accounts WHERE name = 'WALLET_LIABILITY:test-topup'").executeUpdate();

        userId = (UUID) em.createNativeQuery(
                "INSERT INTO users (username, email) VALUES ('testuser', 'test-topup@example.com') RETURNING id", UUID.class)
            .getSingleResult();

        walletId = (UUID) em.createNativeQuery(
                "INSERT INTO wallets (user_id, currency, external_id, ledger_account_id) " +
                "VALUES (?1, 'USD', 'test-wallet-topup', (SELECT id FROM ledger_accounts WHERE name='SETTLEMENT_ASSET')) RETURNING id",
                UUID.class)
            .setParameter(1, userId)
            .getSingleResult();

        // Each wallet needs its own liability account; reuse settlement here only for bootstrapping the FK
        Long liabilityId = (Long) em.createNativeQuery(
                "INSERT INTO ledger_accounts (name, type) VALUES (?1, 'LIABILITY') RETURNING id", Long.class)
            .setParameter(1, "WALLET_LIABILITY:test-topup")
            .getSingleResult();

        em.createNativeQuery("UPDATE wallets SET ledger_account_id = ?1 WHERE id = ?2")
            .setParameter(1, liabilityId)
            .setParameter(2, walletId)
            .executeUpdate();
    }

    @Test
    void topUp_creditsBalance() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                {"walletId":"%s","amount":"100.00","currency":"USD","idempotencyKey":"ik-topup-1"}
                """.formatted(walletId))
        .when()
            .post("/api/v1/wallets/top-up")
        .then()
            .statusCode(200)
            .body("availableBalance", equalTo(100.0f));
    }

    @Test
    void topUp_idempotency_doesNotDoubleCredit() {
        String body = """
            {"walletId":"%s","amount":"50.00","currency":"USD","idempotencyKey":"ik-topup-idem"}
            """.formatted(walletId);

        // First call
        given().contentType(ContentType.JSON).body(body)
            .post("/api/v1/wallets/top-up").then().statusCode(200);

        // Second call with same key — balance must not change
        given().contentType(ContentType.JSON).body(body)
            .when().post("/api/v1/wallets/top-up")
            .then().statusCode(200)
            .body("availableBalance", equalTo(50.0f));
    }

    @Test
    void topUp_concurrent_allSucceed_balanceIsConsistent() throws Exception {
        int threads = 5;
        BigDecimal each = new BigDecimal("20.00");
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        List<Future<Integer>> futures = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            final int idx = i;
            futures.add(pool.submit(() -> {
                String body = """
                    {"walletId":"%s","amount":"20.00","currency":"USD","idempotencyKey":"ik-concurrent-%d"}
                    """.formatted(walletId, idx);
                return given().contentType(ContentType.JSON).body(body)
                    .post("/api/v1/wallets/top-up")
                    .statusCode();
            }));
        }

        pool.shutdown();
        pool.awaitTermination(30, TimeUnit.SECONDS);

        for (Future<Integer> f : futures) {
            assertEquals(200, f.get());
        }

        given()
            .get("/api/v1/wallets/" + walletId)
        .then()
            .statusCode(200)
            .body("availableBalance", equalTo(100.0f)); // 5 × 20
    }
}
