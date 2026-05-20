package com.walletledger;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class WalletTransferTest {

    @Inject
    EntityManager em;

    private UUID userId;
    private UUID walletA;
    private UUID walletB;

    @BeforeEach
    @Transactional
    void setup() {
        em.createNativeQuery("DELETE FROM wallet_balance_snapshots").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_entries").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_transactions").executeUpdate();
        em.createNativeQuery("DELETE FROM wallets WHERE external_id LIKE 'test-xfer-%'").executeUpdate();
        em.createNativeQuery("DELETE FROM users WHERE email = 'test-xfer@example.com'").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_accounts WHERE name IN ('WALLET_LIABILITY:xfer-a','WALLET_LIABILITY:xfer-b')").executeUpdate();

        userId = (UUID) em.createNativeQuery(
                "INSERT INTO users (username, email) VALUES ('xferuser', 'test-xfer@example.com') RETURNING id", UUID.class)
            .getSingleResult();

        Long liabilityA = (Long) em.createNativeQuery(
                "INSERT INTO ledger_accounts (name, type) VALUES ('WALLET_LIABILITY:xfer-a', 'LIABILITY') RETURNING id", Long.class)
            .getSingleResult();
        Long liabilityB = (Long) em.createNativeQuery(
                "INSERT INTO ledger_accounts (name, type) VALUES ('WALLET_LIABILITY:xfer-b', 'LIABILITY') RETURNING id", Long.class)
            .getSingleResult();

        walletA = (UUID) em.createNativeQuery(
                "INSERT INTO wallets (user_id, currency, external_id, available_balance, ledger_account_id) " +
                "VALUES (?1, 'USD', 'test-xfer-a', 200.00, ?2) RETURNING id", UUID.class)
            .setParameter(1, userId).setParameter(2, liabilityA)
            .getSingleResult();

        walletB = (UUID) em.createNativeQuery(
                "INSERT INTO wallets (user_id, currency, external_id, available_balance, ledger_account_id) " +
                "VALUES (?1, 'USD', 'test-xfer-b', 0.00, ?2) RETURNING id", UUID.class)
            .setParameter(1, userId).setParameter(2, liabilityB)
            .getSingleResult();
    }

    @Test
    void transfer_movesBalanceAtomically() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                {"fromWalletId":"%s","toWalletId":"%s","amount":"75.00","currency":"USD","idempotencyKey":"ik-xfer-1"}
                """.formatted(walletA, walletB))
        .when()
            .post("/api/v1/wallets/transfer")
        .then()
            .statusCode(200)
            .body("from.availableBalance", equalTo(125.0f))
            .body("to.availableBalance", equalTo(75.0f));
    }

    @Test
    void transfer_insufficientBalance_returns400() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                {"fromWalletId":"%s","toWalletId":"%s","amount":"999.00","currency":"USD","idempotencyKey":"ik-xfer-over"}
                """.formatted(walletA, walletB))
        .when()
            .post("/api/v1/wallets/transfer")
        .then()
            .statusCode(422);
    }

    @Test
    void transfer_idempotency_doesNotDoubleDebit() {
        String body = """
            {"fromWalletId":"%s","toWalletId":"%s","amount":"30.00","currency":"USD","idempotencyKey":"ik-xfer-idem"}
            """.formatted(walletA, walletB);

        given().contentType(ContentType.JSON).body(body)
            .post("/api/v1/wallets/transfer").then().statusCode(200);

        given().contentType(ContentType.JSON).body(body)
            .when().post("/api/v1/wallets/transfer")
            .then().statusCode(200)
            .body("from.availableBalance", equalTo(170.0f))
            .body("to.availableBalance", equalTo(30.0f));
    }

    @Test
    void transfer_concurrent_balanceRemainsConsistent() throws Exception {
        // 5 concurrent transfers of 20 each from A (200) to B (0); total moved should be 100
        int threads = 5;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        List<Future<Integer>> futures = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            final int idx = i;
            futures.add(pool.submit(() -> {
                String body = """
                    {"fromWalletId":"%s","toWalletId":"%s","amount":"20.00","currency":"USD","idempotencyKey":"ik-xfer-c%d"}
                    """.formatted(walletA, walletB, idx);
                return given().contentType(ContentType.JSON).body(body)
                    .post("/api/v1/wallets/transfer")
                    .statusCode();
            }));
        }

        pool.shutdown();
        pool.awaitTermination(30, TimeUnit.SECONDS);

        for (Future<Integer> f : futures) {
            assertEquals(200, f.get());
        }

        given().get("/api/v1/wallets/" + walletA).then()
            .statusCode(200).body("availableBalance", equalTo(100.0f));
        given().get("/api/v1/wallets/" + walletB).then()
            .statusCode(200).body("availableBalance", equalTo(100.0f));
    }
}
