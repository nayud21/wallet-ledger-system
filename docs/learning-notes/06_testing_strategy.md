# Testing Strategy

## Two Layers of Tests

### 1. Integration Tests (`@QuarkusTest` + RestAssured)
Test the full HTTP stack: request → JAX-RS → service → database → response.

- **When to use:** Testing actual behavior of an endpoint end-to-end, especially for concurrency, transactions, and database constraints.
- **Database:** Quarkus Dev Services spins up a real PostgreSQL container automatically when `quarkus.devservices.enabled=true` in test profile. No mock DB.
- **Setup:** Each test class uses `@BeforeEach` + direct SQL (`EntityManager.createNativeQuery`) to set up known state and clean up after previous tests.

```java
@QuarkusTest
class WalletTopUpTest {

    @Inject EntityManager em;

    @BeforeEach
    @Transactional
    void setup() {
        em.createNativeQuery("DELETE FROM wallet_balance_snapshots").executeUpdate();
        // ... seed test data
    }

    @Test
    void topUp_creditsBalance() {
        given()
            .contentType(ContentType.JSON)
            .body("""{"walletId":"%s","amount":"100.00",...}""".formatted(walletId))
        .when()
            .post("/api/v1/wallets/top-up")
        .then()
            .statusCode(200)
            .body("availableBalance", equalTo(100.0f));
    }
}
```

### 2. Unit Tests (`@QuarkusTest` + `@InjectMock` + Mockito)
Test service logic in isolation by mocking all dependencies.

- **When to use:** Testing edge cases, error branches, and business rules without needing a database.
- **Mocking:** `@InjectMock` (from `quarkus-junit5-mockito`) replaces a CDI bean with a Mockito mock for the duration of the test.

```java
@QuarkusTest
class WalletServiceTest {

    @Inject WalletService walletService;       // real bean

    @InjectMock WalletRepository walletRepo;   // mocked dependency
    @InjectMock LedgerTxRepository ledgerTxRepo;

    @Test
    void topUp_currencyMismatch_throwsCurrencyMismatchException() {
        when(walletRepo.findByIdForUpdate(walletId)).thenReturn(Optional.of(activeWallet));
        // activeWallet.currency = "USD", request currency = "EUR"
        TopUpRequest req = new TopUpRequest(walletId, new BigDecimal("50.00"), "EUR", "ik", null);

        assertThrows(CurrencyMismatchException.class, () -> walletService.topUp(req));
    }
}
```

## Idempotency Testing Pattern
Call the same endpoint twice with the same `idempotencyKey`, assert state is unchanged after the second call:

```java
@Test
void topUp_idempotency_doesNotDoubleCredit() {
    String body = """{"walletId":"%s","amount":"50.00",...,"idempotencyKey":"ik-idem"}""";

    given().body(body).post("/api/v1/wallets/top-up").then().statusCode(200);

    // Second call — must return same result without changing balance
    given().body(body).post("/api/v1/wallets/top-up")
        .then().statusCode(200)
        .body("availableBalance", equalTo(50.0f));  // not 100
}
```

## Concurrency Testing Pattern
Use `ExecutorService` to fire multiple requests simultaneously and assert final state is consistent:

```java
@Test
void topUp_concurrent_allSucceed_balanceIsConsistent() throws Exception {
    int threads = 5;
    ExecutorService pool = Executors.newFixedThreadPool(threads);
    List<Future<Integer>> futures = new ArrayList<>();

    for (int i = 0; i < threads; i++) {
        final int idx = i;
        futures.add(pool.submit(() ->
            given().body("""{"amount":"20.00","idempotencyKey":"ik-%d"}""".formatted(idx))
                   .post("/api/v1/wallets/top-up").statusCode()
        ));
    }

    pool.shutdown();
    pool.awaitTermination(30, TimeUnit.SECONDS);

    // All 5 × 20 = 100 must be credited exactly once
    given().get("/api/v1/wallets/" + walletId)
        .then().body("availableBalance", equalTo(100.0f));
}
```

Each thread uses a **unique idempotency key** — so this tests concurrent distinct operations, not retries.

## What Each Layer Catches

| Bug type | IT catches | UT catches |
|---|---|---|
| Wrong HTTP status code | ✓ | — |
| SQL/transaction bug | ✓ | — |
| Race condition | ✓ | — |
| Currency mismatch branch | — | ✓ |
| Inactive wallet branch | — | ✓ |
| Idempotency conflict logic | ✓ (slow) | ✓ (fast) |
| Wrong exception thrown | — | ✓ |

## Quarkus Dev Services (Auto Testcontainers)
When `%test.quarkus.devservices.enabled=true` and `quarkus-jdbc-postgresql` is on the classpath, Quarkus automatically:
1. Pulls a PostgreSQL Docker image.
2. Starts a container on a random port.
3. Runs Flyway migrations.
4. Wires `%test.*` datasource to point at that container.
5. Stops and removes the container after the test run.

No explicit Testcontainers boilerplate needed — Quarkus handles it.

## Code Location
- Integration tests: `src/test/java/com/walletledger/Wallet*Test.java`, `LedgerReversalTest.java`
- Unit tests: `src/test/java/com/walletledger/service/WalletServiceTest.java`, `LedgerServiceTest.java`
- Test profile config: `application.properties` (`%test.*` keys)
