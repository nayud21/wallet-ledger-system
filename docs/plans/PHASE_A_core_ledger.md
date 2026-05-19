# Phase A — Core Ledger (Sprint 1–2)

**Goal:** A correct, concurrent-safe, idempotent double-entry ledger backing wallet top-up, transfer, and reversal. All money-touching code covered by Testcontainers integration tests.

**Prerequisite reading:**
- [`docs/ERD_AND_PLAN.md`](../ERD_AND_PLAN.md) §"Phase A".
- [`CLAUDE.md`](../../CLAUDE.md) — Backend non-negotiable rules.
- Existing code: [`backend/src/main/java/com/walletledger/service/WalletService.java`](../../backend/src/main/java/com/walletledger/service/WalletService.java), [`LedgerService.java`](../../backend/src/main/java/com/walletledger/service/LedgerService.java).

**Definition of Done for Phase A:**
- All tasks below have AC met.
- `cd backend && ./mvnw verify` passes with Testcontainers running.
- Coverage of `WalletService` and `LedgerService` ≥ 80 % lines via JaCoCo.
- No `TODO` left in service-layer code touching money.

---

## Task A1 — Bean Validation on DTOs

**Goal:** Reject malformed requests at the REST boundary, before they reach the service layer.

**Files to touch:**
- `backend/src/main/java/com/walletledger/dto/TopUpRequest.java`
- `.../dto/TransferRequest.java`
- `.../dto/ReversalRequest.java`
- `.../dto/CreateWalletRequest.java`
- `.../dto/CreateUserRequest.java`
- All `*Resource.java` files: add `@Valid` to the request body parameter.

**Steps:**
1. For each request DTO record, add annotations on each component:
   - `walletId / userId`: `@NotNull`.
   - `amount`: `@NotNull @DecimalMin(value = "0.0001", inclusive = true) @Digits(integer = 15, fraction = 4)`.
   - `currency`: `@NotBlank @Pattern(regexp = "^[A-Z]{3}$")` (after `.toUpperCase()` normalisation, validation runs on the raw input — document that callers must send uppercase).
   - `idempotencyKey`: `@NotBlank @Size(min = 8, max = 128)`.
   - `externalRef`: `@Size(max = 128)` (nullable).
   - `reason` (reversal): `@NotBlank @Size(max = 256)`.
2. In every REST method signature, change `TopUpRequest req` → `@Valid TopUpRequest req`, etc.
3. Add a global `ExceptionMapper<ConstraintViolationException>` returning RFC-7807 `application/problem+json` with field-level details. Place under `.../api/error/`.

**Acceptance criteria:**
- `POST /api/v1/wallets/top-up` with `amount = -1` returns 400 with a JSON body listing the violation.
- `POST` with missing `idempotencyKey` returns 400, **not** 500.
- Service layer methods can `assert` non-null/positive amounts and trust them.

---

## Task A2 — RFC-7807 Global Exception Mapping

**Goal:** Consistent error responses; never leak stack traces.

**Files to touch:**
- New: `.../api/error/ProblemDetail.java` (record: `String type, String title, int status, String detail, Map<String,Object> extensions`).
- New: `.../api/error/*ExceptionMapper.java` for: `ConstraintViolationException`, `NotFoundException`, `BadRequestException`, `IllegalStateException`, and a catch-all `ExceptionMapper<Throwable>`.

**Steps:**
1. Map `NotFoundException` → 404.
2. Map `BadRequestException` → 400.
3. Map `IllegalStateException` → 409 (used for "settlement account missing", insufficient balance handling will move from `BadRequestException` to a dedicated `InsufficientBalanceException` — see A6).
4. Catch-all mapper logs the full stack trace with `Logger.error`, returns 500 with **no** stack trace in the body.

**AC:**
- Triggering a 500 emits one ERROR log line; HTTP body has only `{type, title, status, detail}`.

---

## Task A3 — Settlement account seed

**Goal:** Guarantee `SETTLEMENT_ASSET` ledger account exists in every fresh DB. Currently `WalletService.topUp` throws if missing — works only because some prior migration must have inserted it; verify and formalise.

**Steps:**
1. Read existing migrations under `backend/src/main/resources/db/migration/`. If no migration seeds `SETTLEMENT_ASSET`, add `V4__seed_settlement_account.sql`:
   ```sql
   INSERT INTO ledger_accounts (name, type, created_at)
   VALUES ('SETTLEMENT_ASSET', 'ASSET', NOW())
   ON CONFLICT (name) DO NOTHING;
   ```
2. If `ledger_accounts.name` does not yet have a UNIQUE constraint, add it in the same migration (`ALTER TABLE ledger_accounts ADD CONSTRAINT uq_ledger_accounts_name UNIQUE (name);`).

**AC:**
- Dropping the DB and running `./mvnw quarkus:dev` brings up the app and `topUp` works without manual SQL.

---

## Task A4 — DB-level invariants for ledger

**Goal:** Enforce ledger correctness at the database, not only in the service.

**Files to touch:** new `V5__ledger_invariants.sql`.

**Steps:**
1. Add CHECK constraints:
   ```sql
   ALTER TABLE ledger_entries
     ADD CONSTRAINT ck_ledger_entries_amount_positive CHECK (amount > 0),
     ADD CONSTRAINT ck_ledger_entries_direction CHECK (direction IN ('DEBIT','CREDIT')),
     ADD CONSTRAINT ck_ledger_entries_currency_format CHECK (currency ~ '^[A-Z]{3}$');
   ```
2. Add a deferred trigger (or after-statement trigger) `trg_ledger_tx_balanced` that, after each `ledger_entries` insert batch in a transaction, verifies for each `ledger_tx_id`:
   `SUM(CASE direction WHEN 'CREDIT' THEN amount ELSE -amount END) = 0` **per currency**.
   - Use `CONSTRAINT TRIGGER ... INITIALLY DEFERRED` so it fires at COMMIT.
   - On violation: `RAISE EXCEPTION 'Ledger transaction % not balanced', NEW.ledger_tx_id;`.
3. Add UNIQUE on `ledger_transactions.idempotency_key` if not already present.

**AC:**
- Manually inserting one entry without its mirror via `psql` causes COMMIT to fail.
- Existing tests (after A8) still pass.

---

## Task A5 — Reversal correctness

**Goal:** `LedgerService.reversal` produces a mirrored transaction and updates wallet balances + snapshots.

**Files to touch:** `.../service/LedgerService.java`.

**Steps:**
1. Read current implementation. Confirm it:
   - Looks up original `LedgerTransaction` by ID; 404 if missing.
   - Refuses to reverse a transaction whose `description` starts with `REVERSAL:` (no double-reversal). If not present, add the check.
   - Locks any wallets affected by the original entries **in ascending UUID order**.
   - Creates a new `LedgerTransaction` with `description = "REVERSAL:" + originalTx.id + ":" + reason` and `idempotencyKey` from the request.
   - For each original entry, inserts a mirrored entry (`DEBIT`↔`CREDIT`, same amount, same currency, `reference = "REVERSAL_OF:" + originalEntry.id`).
   - Adjusts `wallets.available_balance` accordingly and writes a `WalletBalanceSnapshot` per affected wallet.
2. If anything in the above is missing, implement it.
3. Idempotency: replay with the same `idempotencyKey` returns the original reversal's `LedgerTransactionResponse` without side effects.

**AC:**
- Test: top-up 100, reverse → wallet back to original balance, 4 entries total (2 top-up + 2 reversal), 2 snapshots.
- Test: reverse with same key twice → only one reversal transaction exists.
- Test: reverse a `REVERSAL:` transaction → 400 with code `cannot_reverse_reversal`.

---

## Task A6 — Typed domain exceptions

**Goal:** Replace generic `BadRequestException("Insufficient balance")` etc. with typed exceptions for testability and clearer mapping.

**Files to touch:** new `.../service/error/InsufficientBalanceException.java`, `CurrencyMismatchException.java`, `WalletNotActiveException.java`, `IdempotencyConflictException.java` (raised when same `idempotencyKey` is reused with **different** payload).

**Steps:**
1. Each extends `RuntimeException`, carries relevant fields (e.g. `wallet.id`, `requested`, `available`).
2. Update `WalletService` and `LedgerService` to throw these instead of `BadRequestException`.
3. Add mappers in `.../api/error/` returning appropriate 4xx + RFC-7807 body with a stable `type` URI like `urn:walletledger:errors:insufficient-balance`.
4. **Strengthen idempotency check:** when an existing `ledger_transactions` row matches the key, compare its description/entries to the incoming request; if different, throw `IdempotencyConflictException` → 409. Don't silently return the old result.

**AC:**
- Two `topUp` calls with the same key but different amounts → second returns 409, first call's state preserved.
- Insufficient balance returns 422 (`type=urn:walletledger:errors:insufficient-balance`).

---

## Task A7 — BOLA guard (minimal principal)

**Goal:** A caller can only mutate wallets owned by their declared user. No real auth yet — use a header.

**Files to touch:** new `.../api/auth/CallerContext.java` (`@RequestScoped`, holds `UUID callerUserId`), new `.../api/auth/CallerFilter.java` (`@Provider` `ContainerRequestFilter` reading `X-User-Id`).

**Steps:**
1. The filter parses `X-User-Id` (UUID); if missing/invalid on a mutating route, abort 401.
2. In `WalletService`: after loading a wallet, compare `wallet.userId` with `callerContext.callerUserId`. Mismatch → 403 (`urn:...:forbidden`).
3. Whitelist of public routes (health, swagger).
4. Document in `docs/API.md` (create if absent) that the prototype uses `X-User-Id` and will be replaced by OIDC.

**AC:**
- `topUp` on a wallet owned by user A while sending `X-User-Id: <user B>` returns 403.
- Transfer where caller owns neither source nor target: 403.
- Transfer where caller owns source but not target: allowed (sending money out is the source owner's right).

---

## Task A8 — Testcontainers integration test base

**Goal:** Reusable test base spinning up Postgres 15 + Flyway, with helpers for seeding users/wallets.

**Files to touch:**
- New: `backend/src/test/java/com/walletledger/IntegrationTestBase.java`.
- New: `backend/src/test/resources/application.properties` (Quarkus test profile).
- `backend/pom.xml`: add `testcontainers`, `testcontainers-postgresql`, `quarkus-jdbc-postgresql` if not present, `quarkus-junit5`, `rest-assured`.

**Steps:**
1. Use `@QuarkusTestResource` with a custom `QuarkusTestResourceLifecycleManager` that starts `PostgreSQLContainer<>("postgres:15")` and injects `quarkus.datasource.jdbc.url`, `username`, `password`.
2. In base class: helper methods
   - `UUID createUser(String email)`
   - `UUID createWallet(UUID userId, String currency)`
   - `BigDecimal availableBalance(UUID walletId)` (raw SQL).
3. Truncate strategy: `@BeforeEach` truncates `ledger_entries, ledger_transactions, wallet_balance_snapshots, wallets, users` and reseeds settlement account.

**AC:**
- `./mvnw test -Dtest=SmokeIT` boots, creates a user+wallet, asserts initial balance = 0.

---

## Task A9 — Idempotency tests

**Goal:** Cover every mutating endpoint.

**Files to touch:** `backend/src/test/java/com/walletledger/service/IdempotencyIT.java`.

**Steps:** For each of `topUp`, `transfer`, `reversal`, write a test that:
1. Calls the endpoint with key `K`.
2. Asserts state (balance, entry count, snapshot count).
3. Calls again with key `K`.
4. Asserts state is **byte-identical**: same balance, same `ledger_entries` rows (compare by `count(*)` and `sum(amount)`).
5. Additional test: same key, different amount → 409.

**AC:** All 4 tests green.

---

## Task A10 — Concurrency tests

**Goal:** Pessimistic lock works under contention. **This is the most important test in the project.**

**Files to touch:** `backend/src/test/java/com/walletledger/service/ConcurrencyIT.java`.

**Steps:**
1. **TopUp race:** seed wallet at 0. Spawn 10 threads each calling `topUp(amount=100, idempotencyKey=random)`. Use `CountDownLatch` to release all simultaneously. After `awaitTermination`, assert final balance = 1000 (no lost updates).
2. **Transfer deadlock probe:** wallets A and B both seeded with 1000. 20 threads: half call `transfer(A→B, 10)`, half call `transfer(B→A, 10)`, all unique idempotency keys. After completion: `A.balance + B.balance = 2000` and **no thread threw `DeadlockLoserDataAccessException`** (proves ascending-ID ordering works).
3. **Insufficient balance under contention:** wallet seeded with 100. 5 threads each transfer 30 out. Exactly 3 succeed, exactly 2 fail with `InsufficientBalanceException`. Final balance = 10.

**Implementation hint:** use `ExecutorService.invokeAll(...)`. Collect futures, count successes vs typed exceptions; rethrow anything unexpected.

**AC:** All 3 tests green, run in CI consistently (no flakes).

---

## Task A11 — Unit tests for service edge cases

**Goal:** Coverage for branches not easily hit in IT.

**Files to touch:** `backend/src/test/java/com/walletledger/service/WalletServiceTest.java`, `LedgerServiceTest.java` (Mockito).

**Suggested cases:**
- `topUp` on `INACTIVE` wallet → `WalletNotActiveException`.
- `transfer` self-to-self → 400.
- `transfer` currency mismatch.
- `transfer` between active wallets but settlement account missing → `IllegalStateException` (mapped to 500/RFC-7807).
- `reversal` of a non-existent tx → 404.

**AC:** Branch coverage ≥ 80 % on both services per JaCoCo.

---

## Task A12 — JaCoCo + CI sanity

**Goal:** Surface coverage and prevent regressions.

**Steps:**
1. Add JaCoCo plugin to `backend/pom.xml` with `prepare-agent` + `report` bound to `verify`.
2. `mvn verify` produces `target/site/jacoco/index.html`.
3. Optional: enforce minimum line coverage on `com.walletledger.service.*` via `jacoco:check`.

**AC:** `./mvnw verify` runs all tests + produces report.

---

## Out-of-scope reminders (defer to later phases)

- Webhook intake → Phase B.
- Reconciliation → Phase C.
- Real authentication (OIDC/JWT) → post-MVP; for now `X-User-Id` header is enough.
- Multi-currency conversion → explicitly **not** supported; transfers across currencies are rejected.
