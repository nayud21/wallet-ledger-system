# Webhook Inbox Pattern (Phase B)

## Business Context

Payment providers (Stripe, PayPal, banks) push real-time events to your system via HTTP webhooks — e.g. "payment succeeded", "refund issued", "dispute opened". Your system must:

- **Acknowledge fast** — providers expect `200 OK` within 5–10 seconds, otherwise they retry.
- **Not lose events** — if your business logic crashes, the event must survive and be retried.
- **Not double-process** — providers *will* retry on network failure, so processing the same event twice must be safe.

The Webhook Inbox Pattern solves all three by splitting reception from processing.

---

## The Pattern

```
Provider → POST /webhook → [persist raw payload] → 200 OK
                                    ↓
                          payment_events table
                          (status = PENDING)
                                    ↓
                    @Scheduled worker (every 30s)
                                    ↓
                    process(event) → PROCESSED | FAILED
```

**Reception is dumb and fast.** Business logic is async and retryable.

---

## Why Not Process in the Webhook Handler?

| Approach | Problem |
|---|---|
| Process inline in the HTTP thread | Provider times out if downstream DB/service is slow; partial failure loses the event |
| Queue (Kafka, SQS) | Correct, but heavy infrastructure for many systems |
| **DB inbox table** | Simple, ACID, no extra infra — sufficient for moderate webhook volume |

The inbox table is a lightweight alternative to a message queue. The DB transaction guarantees "persist or nothing" — you never acknowledge a webhook you didn't save.

---

## Idempotency at the Inbox Level

The `payment_events` table has a UNIQUE constraint on `(provider, external_ref)`:

```sql
UNIQUE (provider, external_ref)
```

If the provider retries the same event:
- Application layer: early-return `200 OK` if row already exists (no DB write).
- Database layer: even if two concurrent requests slip past the app check, the UNIQUE constraint rejects the second INSERT.

This is a **two-layer defense** — same pattern as `ledger_transactions.idempotency_key`.

---

## Status Machine

```
PENDING → PROCESSED   (happy path)
        → FAILED      (exception during processing; retained for retry/alerting)
```

`FAILED` rows are intentionally kept visible — they surface as an ops alert rather than silently vanishing.

---

## Technical Details

### JSONB Payload Storage
Raw webhook payload is stored as `JSONB` in PostgreSQL:
- **Flexible schema** — providers change their payload shape without requiring a migration.
- **Queryable** — PostgreSQL can index and filter inside JSON with `@>` and `->>` operators.
- **Auditable** — the original bytes are never transformed at ingest time.

**Hibernate 6 + JSONB mapping:**
```java
@JdbcTypeCode(SqlTypes.JSON)
@Column(nullable = false, columnDefinition = "jsonb")
public String payload;   // stored as String in Java, jsonb in Postgres
```
Without `@JdbcTypeCode(SqlTypes.JSON)`, Hibernate binds the value as `VARCHAR`, and PostgreSQL rejects the implicit cast to `jsonb` with error `42804`. The annotation tells the JDBC driver to use the JSON wire type instead.

### Quarkus Scheduler
```java
@Scheduled(every = "30s", identity = "payment-event-processor")
@Transactional
public void processEvents() { ... }
```
- `identity` — unique name for the job; allows pausing/monitoring it via the scheduler management API.
- `@Transactional` on the scheduled method — all status updates in one transaction; if it rolls back, events stay `PENDING` and will be retried on the next tick.
- `quarkus-scheduler` extension is required in `pom.xml` (not included by default).

### Constructor Injection (Lombok)
All beans in this project use `@RequiredArgsConstructor` with `private final` fields instead of `@Inject` on fields:
```java
@ApplicationScoped
@RequiredArgsConstructor
public class PaymentEventProcessor {
    private final PaymentEventRepository repository;
}
```
Benefits: immutable dependencies, easier unit testing (just call the constructor), no reflection surprises.

---

---

## Risks & Trade-offs of the Inbox Table Pattern

This design is correct for moderate load but has known failure modes worth understanding before scaling.

### Risk 1 — Unbounded `findPending()` (memory bomb)

Current query:
```java
list("status", "PENDING")   // no LIMIT
```
If a backlog of tens of thousands of `PENDING` rows accumulates (e.g. downstream processor is down for an hour), this loads the entire set into JVM heap on the next scheduler tick. At high enough volume this causes OOM or GC pressure.

**Fix when needed:** add `LIMIT N` to the query and loop ticks until the backlog drains.

---

### Risk 2 — No `SELECT ... FOR UPDATE SKIP LOCKED` → duplicate processing under horizontal scale

When running more than one backend instance, every instance runs the `@Scheduled` worker every 30 seconds. Both instances call `findPending()` at the same time, see the same rows, and both attempt to mark them `PROCESSED`. Result: the same event is processed twice.

`SELECT ... FOR UPDATE SKIP LOCKED` is the PostgreSQL primitive that solves this. It atomically locks the rows a worker is about to process and makes other workers *skip* them rather than wait:

```sql
SELECT * FROM payment_events
WHERE status = 'PENDING'
ORDER BY id
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

- `FOR UPDATE` — acquires a row-level write lock.
- `SKIP LOCKED` — other workers skip already-locked rows instead of blocking. No wait, no deadlock, no duplicate processing.

Without this, two concurrent workers will deadlock or double-process. With this, each row is owned by exactly one worker per cycle.

**Current implementation does not use SKIP LOCKED** — safe for single-instance deployments only.

---

### Risk 3 — `FAILED` is a terminal state (silent event loss)

The current status machine:
```
PENDING → PROCESSED
        → FAILED        ← worker never touches this again
```

`findPending()` filters `status = 'PENDING'` only. A `FAILED` event is never retried — it sits in the table indefinitely with no alerting and no re-queue. From a business perspective this is silent data loss: a "payment succeeded" webhook that failed processing will never credit the wallet.

**What production systems do:**
- Add a `retry_count INT DEFAULT 0` and `next_retry_at TIMESTAMPTZ` column.
- On failure: increment `retry_count`, set `next_retry_at = now() + exponential_backoff`, keep status `PENDING`.
- After N retries: set status `DEAD` and fire an alert (PagerDuty, Slack).
- This is the **dead-letter queue** concept applied to a DB table.

---

### Risk 4 — Quarkus `@Scheduled` has no distributed coordination by default

`@Scheduled` fires on every running JVM. There is no leader election, no cluster-aware locking out of the box. It is equivalent to setting up the same cron job on every machine in the cluster.

Options when scaling:
1. **SKIP LOCKED** (Risk 2 above) — lets multiple workers run safely in parallel; simplest.
2. **`quarkus-quartz` with a DB job store** — Quartz clustering uses a shared DB table to elect one node to fire each job; drop-in replacement for `@Scheduled`.
3. **Sidecar / external scheduler** (Kubernetes CronJob) — removes the job from the application entirely.

---

### Risk 5 — Table bloat over time

`PROCESSED` rows are never deleted. Over months of operation at moderate volume (e.g. 1k webhooks/day) the table grows to millions of rows. Effects:
- Sequential scans on unindexed queries slow down.
- `VACUUM` takes longer; index bloat increases write amplification.
- Backup size grows unnecessarily.

**Standard mitigations:**
- Add a partial index on `status = 'PENDING'` so the scheduler query stays fast regardless of total table size: `CREATE INDEX idx_payment_events_pending ON payment_events(id) WHERE status = 'PENDING';`
- Archive or delete `PROCESSED` rows older than N days via a maintenance job.

---

### When Does the DB Actually Become a Bottleneck?

| Load | Behaviour |
|---|---|
| < ~500 webhooks/min | No issues; single instance, current design is fine |
| ~500–5k webhooks/min | Add SKIP LOCKED + LIMIT; add partial index on `status` |
| > 5k webhooks/min sustained | Consider moving to a proper message broker (Kafka, SQS); DB write contention on the UNIQUE index `(provider, external_ref)` becomes measurable |

The inbox table pattern is the right starting point. It graduates to a message broker only when the DB write path becomes the actual measured bottleneck — not before.

---

## What Phase B Does NOT Do Yet

- No signature verification (e.g. Stripe's `Stripe-Signature` HMAC header) — that belongs to a security hardening pass.
- `process()` is a stub — it logs and marks `PROCESSED`. Phase C wires it to the reconciliation engine.
- No dead-letter / alerting for `FAILED` events — ops concern for a later phase.

---

## Code Locations

| File | Role |
|---|---|
| `payment/PaymentEvent.java` | Entity — maps `payment_events` table |
| `payment/PaymentEventRepository.java` | `findPending()`, idempotency existence check |
| `payment/PaymentResource.java` | `POST /api/v1/payment/webhook` — ingest only |
| `payment/PaymentEventProcessor.java` | `@Scheduled` worker — PENDING → PROCESSED/FAILED |
| `payment/dto/WebhookRequest.java` | Inbound DTO with `@Valid` constraints |
