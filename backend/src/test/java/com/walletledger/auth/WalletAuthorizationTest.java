package com.walletledger.auth;

import com.walletledger.TestAuth;
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
class WalletAuthorizationTest {

    @Inject
    EntityManager em;

    private UUID userA;
    private final UUID userB = UUID.randomUUID();
    private UUID walletA;

    @BeforeEach
    @Transactional
    void setup() {
        em.createNativeQuery("DELETE FROM wallet_balance_snapshots").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_entries").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_transactions").executeUpdate();
        em.createNativeQuery("DELETE FROM idempotency_keys WHERE key LIKE 'authz-ik-%'").executeUpdate();
        em.createNativeQuery("DELETE FROM wallets WHERE external_id = 'authz-wallet-a'").executeUpdate();
        em.createNativeQuery("DELETE FROM users WHERE email = 'authz-a@example.com'").executeUpdate();
        em.createNativeQuery("DELETE FROM ledger_accounts WHERE name = 'WALLET_LIABILITY:authz-a'").executeUpdate();

        userA = (UUID) em.createNativeQuery(
                "INSERT INTO users (username, email) VALUES ('authzA', 'authz-a@example.com') RETURNING id", UUID.class)
            .getSingleResult();

        Long liability = (Long) em.createNativeQuery(
                "INSERT INTO ledger_accounts (name, type) VALUES ('WALLET_LIABILITY:authz-a', 'LIABILITY') RETURNING id", Long.class)
            .getSingleResult();

        walletA = (UUID) em.createNativeQuery(
                "INSERT INTO wallets (user_id, currency, external_id, available_balance, ledger_account_id) " +
                "VALUES (?1, 'USD', 'authz-wallet-a', 0.00, ?2) RETURNING id", UUID.class)
            .setParameter(1, userA).setParameter(2, liability)
            .getSingleResult();
    }

    @Test
    void getWallet_withoutToken_returns401() {
        given().get("/api/v1/wallets/" + walletA).then().statusCode(401);
    }

    @Test
    void userB_getsUserAWallet_returns403() {
        given().header("Authorization", "Bearer " + TestAuth.user(userB))
            .get("/api/v1/wallets/" + walletA)
            .then().statusCode(403);
    }

    @Test
    void userB_topsUpUserAWallet_returns403() {
        given().header("Authorization", "Bearer " + TestAuth.user(userB))
            .contentType(ContentType.JSON)
            .body("""
                {"walletId":"%s","amount":"10.00","currency":"USD","idempotencyKey":"authz-ik-1"}
                """.formatted(walletA))
        .when()
            .post("/api/v1/wallets/top-up")
        .then()
            .statusCode(403);
    }

    @Test
    void userA_topsUpOwnWallet_succeeds() {
        given().header("Authorization", "Bearer " + TestAuth.user(userA))
            .contentType(ContentType.JSON)
            .body("""
                {"walletId":"%s","amount":"10.00","currency":"USD","idempotencyKey":"authz-ik-2"}
                """.formatted(walletA))
        .when()
            .post("/api/v1/wallets/top-up")
        .then()
            .statusCode(200);
    }

    @Test
    void admin_getsAnyWallet_succeeds() {
        given().header("Authorization", "Bearer " + TestAuth.admin())
            .get("/api/v1/wallets/" + walletA)
            .then().statusCode(200);
    }

    @Test
    void userB_looksUpRecipientWallet_succeeds_withoutLeakingBalance() {
        // Send flow: anyone authenticated may resolve a recipient wallet, but only minimal info.
        given().header("Authorization", "Bearer " + TestAuth.user(userB))
            .get("/api/v1/wallets/" + walletA + "/recipient")
            .then().statusCode(200)
            .body("currency", equalTo("USD"))
            .body("availableBalance", nullValue())
            .body("userId", nullValue());
    }

    @Test
    void user_callsAdminOnlyLedgerEndpoint_returns403() {
        given().header("Authorization", "Bearer " + TestAuth.user(userA))
            .get("/api/v1/ledger/transactions")
            .then().statusCode(403);
    }
}
