# Phase F — Event Streaming with Kafka

**Goal:** Introduce Apache Kafka as the system's event backbone, replacing the in-memory event path and the polling-based webhook inbox with a durable, multi-consumer message log. This phase is **learning-driven**: the wallet/ledger domain is used as a vehicle to practice the core distributed-messaging patterns (ordering, delivery semantics, the dual-write problem, idempotent consumers). Each sub-phase is independently shippable and adds one concept.

**Prerequisite reading:**
- [`docs/ERD_AND_PLAN.md`](../ERD_AND_PLAN.md) — data model; `ledger_transactions`, `ledger_entries`, `payment_events`.
- [`CLAUDE.md`](../../CLAUDE.md) — money/double-entry/idempotency rules. These do **not** relax under Kafka.
- Phases A, B, C, E are complete. Latest committed migration is **V10**; Phase F migrations start at **V11**.

**Existing seams this phase grows out of:**
- [`WalletEventBus.java`](../../backend/src/main/java/com/walletledger/wallet/event/WalletEventBus.java) — in-memory CDI + Mutiny bus feeding SSE. Single-node only. **F1 replaces its transport with Kafka.**
- [`PaymentEventProcessor.java`](../../backend/src/main/java/com/walletledger/payment/PaymentEventProcessor.java) — `@Scheduled` poller over `payment_events`. This is a hand-rolled inbox/poller; **F2 generalizes it into a Transactional Outbox publisher.**
- Events fired today via CDI `Event<WalletEvent>` at [`WalletService.java:116,190-191`](../../backend/src/main/java/com/walletledger/wallet/WalletService.java#L116) (TOP_UP / TRANSFER_OUT / TRANSFER_IN).

**Definition of Done (whole phase):**
- `cd backend && ./mvnw verify` passes, including Testcontainers Kafka integration tests.
- `docker-compose up -d` brings up Kafka alongside Postgres (or Quarkus Dev Services spins it in dev/test).
- No financial invariant is weakened: double-entry still balances, idempotency keys still dedupe, `ledger_entries` stays append-only.
- A documented learning note per sub-phase in `docs/learning/` capturing the concept and the trade-off observed.

---

## Guiding constraints (read before any task)

1. **Money & ordering.** Kafka guarantees ordering only **within a partition**. Every wallet/ledger topic MUST be keyed by `walletId` (or the relevant aggregate id) so all events for one aggregate land on one partition and stay ordered. Never rely on cross-partition ordering for financial state.
2. **The dual-write problem is non-negotiable.** A service MUST NOT do `db.commit()` then `producer.send()` as two independent steps — a crash between them loses or duplicates a financial event. Use the **Transactional Outbox** (F2). Until F2 lands, F1 publishes only *non-authoritative* notification events (SSE fan-out), where a lost event is cosmetic, not a money bug.
3. **At-least-once by default → consumers must be idempotent.** Reuse the existing `idempotency_keys` table / dedup discipline on the consumer side. Assume every message can be delivered more than once.
4. **Schema discipline.** New tables via new migrations only (`V11+`). Never edit a committed migration. Event payloads are versioned records; treat the wire format as a contract.

---

## Tooling & dependencies (shared across tasks)

**`pom.xml` additions:**
```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-messaging-kafka</artifactId>
</dependency>
```
- **Dev / test:** Quarkus **Dev Services for Kafka** auto-starts a broker (Redpanda/Kafka container) when no `kafka.bootstrap.servers` is configured — zero local install needed for `quarkus:dev` and tests.
- **docker-compose:** add a Kafka (or Redpanda, lighter) service for running the full stack outside dev mode.
- **Testing:** Testcontainers `KafkaContainer`, plus SmallRye `InMemoryConnector` for fast channel-level tests without a broker.

---

## Task F1 — Wallet event stream (replace the in-memory transport)

**What:** Publish `WalletEvent` to a Kafka topic `wallet-events` keyed by `walletId`. The SSE endpoint becomes a *consumer* of that topic instead of an in-memory subscriber. This decouples producers from consumers and survives multiple app instances.

**Concepts practiced:** Topic, Partition, Consumer Group, Offset, **partition key ⇄ per-aggregate ordering**, SmallRye Reactive Messaging (`@Outgoing`/`@Incoming`/`@Channel`/`Emitter`).

**Files to add/change:**
- `wallet/event/WalletEventProducer.java` — listens to the existing CDI `WalletEvent` (keep `@Observes(during = AFTER_SUCCESS)` so nothing publishes on rollback) and emits to channel `wallet-events-out` via an `Emitter<Record<String, String>>`, key = `walletId.toString()`.
- `wallet/event/WalletEventConsumer.java` — `@Incoming("wallet-events-in")`, deserializes, hands off to the SSE fan-out.
- Refactor `WalletEventBus` to be a pure in-JVM SSE fan-out fed by the consumer (drop its role as the event source).
- `application.properties`:
  ```properties
  mp.messaging.outgoing.wallet-events-out.connector=smallrye-kafka
  mp.messaging.outgoing.wallet-events-out.topic=wallet-events
  mp.messaging.incoming.wallet-events-in.connector=smallrye-kafka
  mp.messaging.incoming.wallet-events-in.topic=wallet-events
  mp.messaging.incoming.wallet-events-in.auto.offset.reset=latest
  ```

**Why now:** Lowest risk first step — these events are notification-only, so the dual-write gap (deferred to F2) cannot cause a money bug. It isolates pure Kafka mechanics.

**Trade-offs:** Adds a network hop and broker dependency for what was an in-memory call; loses absolute immediacy. In exchange: multi-consumer, multi-instance, replayable history. Because we publish *after* commit without an outbox, a crash in the publish window drops a notification — acceptable for SSE, **not** acceptable for the authoritative events introduced in F2.

**AC:**
- Top-up and transfer produce messages on `wallet-events` keyed by `walletId`.
- All events for a given `walletId` are observed in commit order on the consumer.
- SSE clients still receive live updates (now via the Kafka consumer).
- Testcontainers test: fire N events for one wallet across concurrent threads → consumer observes them ordered per wallet.

---

## Task F2 — Transactional Outbox + Polling Publisher (the core pattern)

**What:** Guarantee that an authoritative domain event (`ledger.transaction.committed`) is published **if and only if** its ledger transaction committed. Within the *same* `@Transactional` boundary that writes `ledger_entries`, write a row to a new `outbox` table. A separate publisher reads unsent outbox rows and produces them to Kafka, marking them sent.

**Concepts practiced:** **Dual-write problem**, **Transactional Outbox pattern**, **Polling Publisher**, at-least-once publishing, idempotent producer (`enable.idempotence=true`).

**Migration — `V11__add_outbox.sql`:**
```sql
CREATE TABLE outbox (
    id             BIGSERIAL PRIMARY KEY,
    aggregate_type VARCHAR(64)  NOT NULL,   -- 'wallet' | 'ledger_transaction'
    aggregate_id   VARCHAR(64)  NOT NULL,   -- partition key (e.g. walletId)
    event_type     VARCHAR(64)  NOT NULL,
    payload        JSONB        NOT NULL,
    status         VARCHAR(16)  NOT NULL DEFAULT 'PENDING',  -- PENDING | SENT | FAILED
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    sent_at        TIMESTAMPTZ
);
CREATE INDEX idx_outbox_pending ON outbox(id) WHERE status = 'PENDING';
```

**Files to add/change:**
- `shared/outbox/OutboxEvent.java` (Panache entity), `OutboxRepository.java`.
- `shared/outbox/OutboxWriter.java` — `record(aggregateType, aggregateId, eventType, payload)`; called inside `WalletService`/`LedgerService` transactions.
- `shared/outbox/OutboxPublisher.java` — `@Scheduled(every="...")`, reads `findPending()` ordered by `id`, emits to Kafka keyed by `aggregate_id`, sets `SENT`/`sent_at`. Mirror the structure of the existing `PaymentEventProcessor`.
- Set producer `enable.idempotence=true`, `acks=all` on the relevant channel.
- Hook `OutboxWriter.record(...)` into `WalletService.topUp` / `transfer` / `LedgerService.reversal` inside the existing DB transaction.

**Why polling first (not Debezium):** Lets you build and observe the outbox with no extra infrastructure, so the *pattern* is the lesson rather than the tooling. F4 upgrades the transport to CDC and you compare.

**Trade-offs:** Polling adds latency (poll interval) and steady DB load; the outbox grows and needs a pruning job (add `@Scheduled` cleanup of old `SENT` rows). The win: zero lost/duplicated authoritative events even across crashes. Duplicates on the wire are still possible (at-least-once) → consumers must dedupe (F3).

**AC:**
- Outbox row is written in the same transaction as `ledger_entries`; rollback leaves no outbox row (Testcontainers test forcing a rollback).
- Killing the app between commit and publish, then restarting, still publishes the event exactly once observed-as-sent.
- Events for one `aggregate_id` are published in `id` order.

---

## Task F3 — Webhook ingestion via Kafka + Dead Letter Topic

**What:** `POST /api/v1/payment/webhook` publishes the raw payload to `payment.webhooks.raw`. A consumer processes each message idempotently; permanent failures route to `payment.webhooks.dlt`. This replaces the `@Scheduled` scan of `payment_events` as the *processing* trigger (the table can remain as an audit/inbox record).

**Concepts practiced:** Consumer offset commit (manual vs auto), **retry + Dead Letter Topic**, **idempotent consumer**, poison-message handling, consumer lag.

**Files to add/change:**
- `payment/WebhookProducer.java` — emit raw body to `payment.webhooks.raw` keyed by `externalRef`.
- `payment/WebhookConsumer.java` — `@Incoming`, dedupe via `idempotency_keys` (`request_hash` of payload), process, ack. On unrecoverable error let SmallRye route to DLT.
- `application.properties`:
  ```properties
  mp.messaging.incoming.webhooks-in.failure-strategy=dead-letter-queue
  mp.messaging.incoming.webhooks-in.dead-letter-queue.topic=payment.webhooks.dlt
  ```
- Keep webhook endpoint `@PermitAll` + HMAC verification (CLAUDE.md rule); never log raw bodies/secrets.

**Why:** Teaches the operational reality of Kafka — redelivery, backpressure, poison messages — on a flow that already tolerates async processing.

**Trade-offs:** DLT needs monitoring/replay tooling or messages rot silently (add a `log()`-style alert + a small admin view of DLT depth). At-least-once forces idempotency everywhere downstream.

**AC:**
- Valid webhook → message on `raw` → processed exactly once even if redelivered (dedupe proven by Testcontainers test sending the same key twice).
- A handler that always throws lands the message on `payment.webhooks.dlt` after configured retries, and does not block the partition indefinitely.

---

## Task F4 — Upgrade Outbox transport to CDC (Debezium)

**What:** Replace the F2 polling publisher with Debezium Change Data Capture reading the Postgres write-ahead log, so outbox rows stream to Kafka with low latency and no app-side polling.

**Concepts practiced:** **Change Data Capture**, Debezium, Postgres logical replication (`pgoutput`/`wal2json`), the Debezium **Outbox Event Router** SMT, connector offsets.

**Files/infra:**
- Enable logical replication on Postgres (`wal_level=logical`) in `docker-compose`.
- Add Debezium connector (Debezium Server, Kafka Connect, or `quarkus-debezium` embedded) configured against the `outbox` table with the outbox router transform.
- Retire `OutboxPublisher`'s `@Scheduled` publish loop (keep the pruning job).

**Why:** Direct comparison: same outbox table, two transports. You feel the latency/throughput/operational-weight difference firsthand — the point of the exercise.

**Trade-offs:** CDC is powerful but heavy: replication slots can fill disk if a connector stalls, schema/connector ops are real work, and it couples you to DB-internals. Polling is simpler and good enough at low volume. Document when each is worth it.

**AC:**
- A committed ledger transaction's outbox row appears on Kafka via Debezium with no polling loop running.
- Stopping the connector and resuming does not lose events (replication slot retains WAL); ordering per `aggregate_id` preserved.

---

## Task F5 (optional, stretch) — Reconciliation alerting via Kafka Streams

**What:** Stream `reconciliation.exception.created` events and maintain a running count/state with Kafka Streams so the admin UI can react in near-real-time, instead of waiting for the batch run summary.

**Concepts practiced:** Kafka Streams, KStream vs **KTable**, stateful aggregation, log compaction for "current state" topics.

**Why de-prioritized:** Reconciliation is inherently a daily batch; streaming adds little operational value here. Included purely as a stateful-streaming learning capstone — do it last or skip.

**Trade-offs:** Kafka Streams adds a stateful runtime (RocksDB state stores, changelog topics) — significant complexity for a batch-shaped problem. Strictly a learning stretch goal.

---

## Suggested learning order & key concepts to study deeply

Build in order F1 → F2 → F3 → F4 (F5 optional). The three concepts that are load-bearing across all of them:

1. **Partition key ⇄ ordering guarantee** — Kafka orders only within a partition; key by aggregate id.
2. **Dual-write problem → Transactional Outbox** — why you can't just `commit()` then `send()`; why exactly-once does **not** span Kafka and Postgres.
3. **At-least-once → idempotent consumer** — every consumer must tolerate redelivery; reuse `idempotency_keys`.

Supporting keywords (group by tier): brokers/ISR/replication factor; producer `acks`/idempotence/batching; consumer groups/offset commit/rebalancing/lag; delivery semantics (at-most/at-least/exactly-once, Kafka transactions); patterns (outbox, CDC/Debezium, idempotent consumer, DLT, inbox); ops (retention, log compaction, schema registry, backpressure); Quarkus (SmallRye Reactive Messaging, Dev Services for Kafka).

---

## Out-of-scope for Phase F
- Multi-datacenter / MirrorMaker replication.
- Schema Registry + Avro/Protobuf (start with JSON; note as a follow-up once contracts stabilize).
- Exactly-once Kafka transactions across the *producer* path beyond idempotent producer (outbox already gives effective once-delivered-to-DB semantics).
- Replacing Postgres as the system of record — Kafka is the event log, **not** the ledger. The DB remains source of truth.
