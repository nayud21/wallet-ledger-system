# 14 — Remaining Technical Gaps

Topics not yet implemented in this codebase but worth studying to go deeper into ledger system design. Each item is a pointer for further reading and hands-on work.

---

## 1. DB-level sum-zero CHECK constraint

The double-entry invariant (entries of a transaction sum to zero) is enforced only in service code. A direct SQL bypass can break it. Move it to the database via a constraint trigger.

- PostgreSQL `CREATE CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED` so the check runs at COMMIT.
- Study: row triggers vs constraint triggers, deferred vs immediate, plpgsql.

---

## 2. Reserved-balance flow (authorize / capture / release)

`wallets.reserved_balance` exists but is unused. Implement holds so money can be reserved before final settlement (card auth pattern, escrow).

- States: `ACTIVE → CAPTURED | RELEASED | EXPIRED`.
- New table `wallet_holds` with TTL.
- Endpoints for authorize / capture / release.
- Study: two-phase money movement, card auth vs settlement, escrow patterns.

---

## 3. Outbox pattern

Replace in-process CDI `Event<WalletEvent>` with a durable `outbox_events` table written in the same transaction as business data. A relay worker publishes externally and marks the row sent.

- Crash-safe by construction.
- Study: transactional outbox, at-least-once delivery, Debezium / CDC.

---

## 4. Hash-chained audit logs

Make `audit_logs` tamper-evident by hashing each row with the previous row's hash.

- `row_hash = SHA256(prev_hash || entity || entity_id || action || diff || performed_by || created_at)`.
- Verification job scans the chain for breaks.
- Study: Merkle trees, append-only log integrity, blockchain-style proofs.

---

## 5. Observability stack

Missing entirely. A production ledger without observability is blind.

- **Tracing:** `quarkus-opentelemetry`, propagate trace IDs across services.
- **Structured logs:** JSON with correlation IDs (`traceId`, `walletId`, `idempotencyKey`).
- **Metrics:** Prometheus via `quarkus-micrometer-registry-prometheus`. Counters, histograms, gauges per business operation.
- **Health checks:** SmallRye Health — DB connection, outbox lag, reconciliation freshness.
- Study: RED method, USE method, golden signals.

---

## 6. Multi-currency + FX rates

Each wallet currently fixes one currency. Real systems need cross-currency transfers with rate snapshots.

- `fx_rates` table with `effective_at` and `provider`.
- Cross-currency transfer = entries in both currencies + `FX_GAIN_LOSS` account.
- Always snapshot the rate at transaction time, never re-derive.
- End-of-day revaluation.
- Study: ISO 4217 codes, FX gain/loss accounting, ECB/Fed rate feeds.

---

## 7. Full Chart of Accounts

Only `ASSET` (settlement) and `LIABILITY` (wallets) exist. Real accounting requires `REVENUE`, `EXPENSE`, `EQUITY` types.

- Examples: `FEE_REVENUE`, `PROVIDER_FEE`, `CHARGEBACK_LOSS`, `RETAINED_EARNINGS`.
- Implement Trial Balance: total DEBIT vs total CREDIT system-wide must match.
- Study: accounting equation, GAAP basics, normal balances per account type.

---

## 8. Saga / compensation for external providers

When a provider call (Stripe, VNPay) times out, success/failure is unknown. Need explicit reconciliation.

- State machine: `INITIATED → PROVIDER_CALLED → CONFIRMED | COMPENSATED`.
- Compensation transactions mirror partial work.
- Periodic poll of provider API to resolve uncertain rows.
- Study: saga pattern (orchestration vs choreography), Temporal, idempotent compensations.

---

## 9. Resilience patterns

Currently no fault tolerance. Use `quarkus-smallrye-fault-tolerance`.

- `@RateLimit` on mutating endpoints (per-user).
- `@CircuitBreaker` on external calls.
- `@Retry` with exponential backoff + jitter.
- `@Timeout` on every external call.
- Study: bulkhead pattern, backpressure, hedged requests.

---

## 10. Idempotency key TTL + cleanup

`idempotency_keys` currently grow forever. Production scopes them to a TTL (e.g. 24h) with a cleanup job.

- Document client contract: do not retry after TTL.
- Study: Stripe's 24h idempotency window rationale.

---

## 11. CQRS split

Separate write model (ledger entries, source of truth) from read model (balance snapshots, projections, reporting views).

- Read side updated asynchronously via outbox consumers.
- Balance checks still read through the lock for correctness.
- Study: read/write separation, projection rebuild, materialized views.

---

## 12. Formal event sourcing

Treat `ledger_entries` as the only source of truth and make `wallets.available_balance` a rebuildable cache.

- Admin endpoint to replay balance from entries.
- Snapshots become checkpoint accelerators, not authoritative state.
- Study: event sourcing, snapshot strategies, replay performance.

---

## 13. Sharding & partitioning

Single Postgres collapses around tens of millions of users.

- Shard by `user_id` to keep self-transfers within one shard.
- PostgreSQL native partitioning on `ledger_entries` (monthly).
- Hot/cold split: archive old entries to S3 + Athena/Trino.
- Study: consistent hashing, range vs hash partitioning, cross-shard transactions.

---

## 14. Compliance & regulatory hooks

- **KYC/AML:** sanctions screening (OFAC), velocity rules, structuring detection.
- **PCI-DSS:** never touch raw PAN; tokenize via provider.
- **Data retention:** immutable archive 7+ years for financial records.
- Study: SBV reporting (Vietnam), FinCEN (US), local AML regimes.

---

## 15. Database isolation levels & write skew

Currently relying on Postgres default (`READ COMMITTED`) + row locks. Worth understanding when locks alone are insufficient.

- Write skew anomaly: relevant if balance checks span multiple wallets.
- `SERIALIZABLE` isolation with retry loop as an alternative.
- Study: "A Critique of ANSI SQL Isolation Levels" (Berenson et al.), Postgres SSI implementation.

---

## 16. Connection pooling & concurrency limits

Agroal pool sizing under load. `FOR UPDATE` locks hold connections — pool exhaustion under contention is real.

- Study: Little's law for pool sizing, async vs blocking drivers (R2DBC), connection lifecycle.

---

## Reading list

- *Designing Data-Intensive Applications* — Kleppmann (ch. 7, 11)
- *Database Internals* — Petrov
- *Enterprise Integration Patterns* — Hohpe & Woolf
- Stripe Engineering blog: idempotency, API design
- Square / Block, Monzo, Wise: ledger architecture posts
- ISO 20022, ISO 4217, SWIFT MT103/MT202

---

## Decision log

Append a row when implementing any topic above.

| Date | Topic | Approach / trade-off | Link |
|---|---|---|---|
| | | | |
