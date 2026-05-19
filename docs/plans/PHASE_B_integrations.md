# Phase B — Integrations & Webhook Inbox

**Goal:** Accept asynchronous notifications from external payment providers safely. The HTTP handler does as little as possible (persist raw payload, ack); a scheduled worker processes events idempotently and produces ledger transactions.

**Prerequisite:** Phase A complete and green.

**Definition of Done:**
- `POST /api/v1/payment/webhook` returns 200 within 50 ms p95 (no synchronous ledger work).
- Worker drains the inbox every 5 s, advances each row through `PENDING → PROCESSED | FAILED`.
- Same external event delivered twice produces **one** ledger transaction.
- All paths covered by Testcontainers tests including provider-replay.

---

## Task B1 — Migration: `payment_events` (if not already present)

**Goal:** Append-only inbox table.

**File:** `backend/src/main/resources/db/migration/V6__payment_events.sql`.

**Schema:**
```sql
CREATE TABLE payment_events (
  id              BIGSERIAL PRIMARY KEY,
  provider        VARCHAR(64) NOT NULL,
  external_ref    VARCHAR(128) NOT NULL,
  payload         JSONB NOT NULL,
  signature       VARCHAR(512),
  status          VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  attempts        INT NOT NULL DEFAULT 0,
  last_error      TEXT,
  ledger_tx_id    BIGINT REFERENCES ledger_transactions(id),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  CONSTRAINT ck_payment_events_status CHECK (status IN ('PENDING','PROCESSING','PROCESSED','FAILED','SKIPPED')),
  CONSTRAINT uq_payment_events_provider_ref UNIQUE (provider, external_ref)
);
CREATE INDEX idx_payment_events_status_received ON payment_events (status, received_at)
  WHERE status IN ('PENDING','FAILED');
```

**AC:** Migration runs clean on empty DB; UNIQUE guarantees deduplication at insert time.

---

## Task B2 — Domain + Repository

**Files:**
- `.../domain/PaymentEvent.java` (Panache entity, fields mirroring schema).
- `.../repository/PaymentEventRepository.java` (Panache repository).

**Repository methods:**
- `Optional<PaymentEvent> findByProviderAndRef(String provider, String ref)`
- `List<PaymentEvent> claimBatch(int limit)` — `SELECT ... WHERE status='PENDING' ORDER BY received_at LIMIT ? FOR UPDATE SKIP LOCKED`. Use a native query.

---

## Task B3 — Inbox endpoint

**Files:**
- `.../api/PaymentWebhookResource.java`
- `.../service/PaymentInboxService.java`

**Behavior:**
1. `POST /api/v1/payment/webhook/{provider}` accepts raw body + headers.
2. Verify HMAC signature using a provider-specific secret from `application.properties` (`webhook.secret.<provider>=...`). On mismatch → 401, log only the header digest (never the body).
3. Extract `external_ref` from payload (provider-specific JSONPath; start with a hard-coded mapping for two fake providers `STRIPE_LIKE` and `BANK_LIKE`).
4. `INSERT ... ON CONFLICT (provider, external_ref) DO NOTHING`. Always return 200 (the conflict is the success case for replays).
5. Never log full payload at INFO. DEBUG only, with secrets redacted.

**AC:**
- Replaying the same delivery returns 200 and produces only 1 row.
- Bad signature → 401, no row inserted.
- Endpoint completes in < 50 ms p95 in the load test (Task B6).

---

## Task B4 — Scheduled worker

**File:** `.../service/PaymentInboxWorker.java`.

**Behavior:**
1. `@Scheduled(every = "5s", concurrentExecution = SKIP)` — exactly one instance ever runs at a time.
2. In a new transaction: `claimBatch(50)`. For each event, set `status='PROCESSING'`, `attempts = attempts + 1`. Commit the claim transaction.
3. For each claimed event, in its **own** transaction:
   - Translate provider payload → domain action. For `STRIPE_LIKE` of type `payment_succeeded`, call `WalletService.topUp(...)` with `idempotencyKey = "webhook:" + provider + ":" + externalRef`.
   - On success: `status='PROCESSED'`, `processed_at=NOW()`, `ledger_tx_id` = the produced tx.
   - On `IdempotencyConflictException`: `status='SKIPPED'`, `last_error = e.getMessage()`.
   - On any other exception: `status='FAILED'` if `attempts >= 5`, else back to `PENDING` (will retry). Always store `last_error` (truncate to 4 KB).
4. Backoff: a `FAILED` row is **not** retried automatically; expose `POST /api/v1/payment/webhook/{id}/retry` (admin-only via `X-User-Role: ADMIN`) that resets it to `PENDING`.

**AC:**
- Crashing the JVM mid-processing leaves the row in `PROCESSING`; on next start, a sweeper resets `PROCESSING` rows older than 60 s back to `PENDING` (implement in `@Startup`).
- Worker handles 1000 pending events in ≤ 10 s in dev.

---

## Task B5 — Admin read endpoints

**File:** `.../api/PaymentEventAdminResource.java`.

- `GET /api/v1/payment/events?status=&provider=&page=&size=` — paginated list.
- `GET /api/v1/payment/events/{id}` — single row (payload redacted unless caller is ADMIN).

All admin endpoints check `X-User-Role: ADMIN`.

---

## Task B6 — Tests

**Files:** `backend/src/test/java/com/walletledger/inbox/PaymentInboxIT.java`.

**Cases:**
1. **Happy path:** POST a signed `payment_succeeded` → row inserted as PENDING → wait for worker (`Awaitility`) → row PROCESSED, wallet topped up, exactly one ledger tx.
2. **Replay:** POST same delivery 3 times → still one row, one ledger tx.
3. **Signature mismatch:** wrong HMAC → 401, zero rows.
4. **Worker crash recovery:** insert a row in `PROCESSING` with `received_at = NOW() - INTERVAL '2 min'`. Start the sweeper; assert it is reclaimed and processed.
5. **Permanent failure:** stub `WalletService.topUp` to throw a random RuntimeException. After 5 attempts row reaches `FAILED`. Admin retry reverts to `PENDING`.
6. **Concurrency:** 5 worker instances (manually invoked in parallel) over 200 pending events → each event processed exactly once (`FOR UPDATE SKIP LOCKED` proof).

**AC:** All green; no flaky waits (use `Awaitility.atMost(Duration.ofSeconds(15))`).

---

## Out-of-scope reminders
- Real provider SDKs (Stripe, etc.) — keep providers behind an interface `PaymentProviderAdapter` so they can be plugged in later.
- Dead-letter queue to Kafka — not needed for MVP.
