package com.walletledger;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class LedgerReversalTest {

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
        em.createNativeQuery("DELETE FROM wallets WHERE external_id LIKE 'test-rev-%'").executeUpdate();
        em.createNativeQuery("DELETE FROM users WHERE email = 'test-rev@example.com'").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_accounts WHERE name = 'WALLET_LIABILITY:rev'").executeUpdate();

        userId = (UUID) em.createNativeQuery(
                "INSERT INTO users (username, email) VALUES ('revuser', 'test-rev@example.com') RETURNING id", UUID.class)
            .getSingleResult();

        Long liability = (Long) em.createNativeQuery(
                "INSERT INTO ledger_accounts (name, type) VALUES ('WALLET_LIABILITY:rev', 'LIABILITY') RETURNING id", Long.class)
            .getSingleResult();

        walletId = (UUID) em.createNativeQuery(
                "INSERT INTO wallets (user_id, currency, external_id, available_balance, ledger_account_id) " +
                "VALUES (?1, 'USD', 'test-rev-w', 0.00, ?2) RETURNING id", UUID.class)
            .setParameter(1, userId).setParameter(2, liability)
            .getSingleResult();
    }

    @Test
    void reversal_mirrorsEntriesAndRestoresBalance() {
        // First top-up so balance = 100
        given().contentType(ContentType.JSON)
            .body("""
                {"walletId":"%s","amount":"100.00","currency":"USD","idempotencyKey":"ik-rev-topup"}
                """.formatted(walletId))
            .post("/api/v1/wallets/top-up").then().statusCode(200);

        // Find the ledger transaction id
        Long txId = (Long) em.createNativeQuery(
                "SELECT id FROM ledger_transactions WHERE idempotency_key = 'ik-rev-topup'", Long.class)
            .getSingleResult();

        // Reverse it
        given().contentType(ContentType.JSON)
            .body("""
                {"ledgerTransactionId":%d,"reason":"test reversal","idempotencyKey":"ik-rev-1"}
                """.formatted(txId))
        .when()
            .post("/api/v1/ledger/reversal")
        .then()
            .statusCode(200)
            .body("description", containsString("REVERSAL:" + txId));

        // Balance should be back to 0
        given().get("/api/v1/wallets/" + walletId)
            .then().statusCode(200).body("availableBalance", equalTo(0.0f));
    }

    @Test
    void reversal_idempotency_doesNotDoubleReverse() {
        given().contentType(ContentType.JSON)
            .body("""
                {"walletId":"%s","amount":"50.00","currency":"USD","idempotencyKey":"ik-rev-topup2"}
                """.formatted(walletId))
            .post("/api/v1/wallets/top-up").then().statusCode(200);

        Long txId = (Long) em.createNativeQuery(
                "SELECT id FROM ledger_transactions WHERE idempotency_key = 'ik-rev-topup2'", Long.class)
            .getSingleResult();

        String body = """
            {"ledgerTransactionId":%d,"reason":"idempotent reversal","idempotencyKey":"ik-rev-idem"}
            """.formatted(txId);

        given().contentType(ContentType.JSON).body(body)
            .post("/api/v1/ledger/reversal").then().statusCode(200);

        // Second call with same key — must not change balance further
        given().contentType(ContentType.JSON).body(body)
            .post("/api/v1/ledger/reversal").then().statusCode(200);

        given().get("/api/v1/wallets/" + walletId)
            .then().statusCode(200).body("availableBalance", equalTo(0.0f));
    }
}
