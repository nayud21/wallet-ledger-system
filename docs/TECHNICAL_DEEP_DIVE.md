# Technical Deep-Dive Topics

> Concepts to study to deepen knowledge of this ledger system. Each item is a technical area worth implementing or researching.

---

## Already covered (current Phase A/B/C)

- Double-entry bookkeeping (DEBIT/CREDIT, asset vs liability accounts)
- Append-only ledger entries, reversal via mirrored transactions
- Idempotency with request-hash conflict detection (SHA-256)
- Pessimistic locking (`SELECT ... FOR UPDATE`), ascending UUID lock ordering
- Webhook inbox + `FOR UPDATE SKIP LOCKED`
- Reconciliation with multi-pass matching + Levenshtein fuzzy
- RFC-7807 problem details
- Testcontainers concurrency tests
- `BigDecimal` + `NUMERIC(19,4)` money handling
- Flyway migration immutability
- BOLA / object-level ownership (Phase E)

---

## Topics to add and study

### 1. DB-level invariants — sum-zero CHECK constraint
- Move the double-entry invariant from service layer to DB via a constraint trigger.
- `DEFERRABLE INITIALLY DEFERRED` so the check runs at COMMIT, not after each row insert.
- Study: PostgreSQL constraint triggers vs row triggers, when each is appropriate.

### 2. Reserved-balance flow (authorize / capture / release)
- Implement holds: `available -= amount, reserved += amount` on authorize.
- Capture moves money out, release returns it, expire is auto-release after TTL.
- Add `wallet_holds` table tracking lifecycle.
- Study: two-phase commit semantics in payments, card auth vs settlement timing.

### 3. Outbox pattern
- Replace in-process CDI `Event<WalletEvent>` with a durable `outbox_events` table.
- Write outbox row in the **same transaction** as business data.
- Relay worker reads PENDING rows, publishes externally, marks PUBLISHED.
- Study: transactional outbox, change data capture (Debezium), at-least-once delivery semantics.

### 4. Hash-chained audit logs
- Add `prev_hash` + `row_hash` columns; each row's hash includes the previous row's hash.
- Tampering with any historical row breaks the chain.
- Study: Merkle trees, append-only log structures, blockchain-style integrity proofs.

### 5. Observability stack
- OpenTelemetry distributed tracing (`quarkus-opentelemetry`).
- Structured JSON logs with correlation IDs (`traceId`, `walletId`, `idempotencyKey`).
- Prometheus business metrics: counters, histograms, gauges per operation.
- SmallRye Health for outbox lag, DB connectivity, reconciliation freshness.
- Study: RED method (Rate / Errors / Duration), USE method, golden signals.

### 6. Multi-currency + FX rates
- `fx_rates` table with effective-at timestamp + provider.
- Cross-currency transfer = entries in both currencies + `FX_GAIN_LOSS` entry.
- Snapshot the rate at transaction time; never re-derive later.
- End-of-day revaluation job.
- Study: ISO 4217 currency codes, ECB / Fed rate feeds, FX gain/loss accounting.

### 7. Full Chart of Accounts
- Add account types: `REVENUE`, `EXPENSE`, `EQUITY` (not just `ASSET`/`LIABILITY`).
- Examples: `FEE_REVENUE`, `PROVIDER_FEE`, `CHARGEBACK_LOSS`, `RETAINED_EARNINGS`.
- Implement Trial Balance report: total DEBIT must equal total CREDIT system-wide.
- Study: accounting equation (Assets = Liabilities + Equity), GAAP basics, normal balances per account type.

### 8. Saga / compensation for external providers
- When provider calls time out, you don't know if it succeeded.
- State machine: `INITIATED → PROVIDER_CALLED → CONFIRMED | COMPENSATED`.
- Compensation transactions to undo partial work.
- Periodic poll of provider API to resolve uncertain rows.
- Study: saga pattern (orchestration vs choreography), Temporal/Cadence workflows.

### 9. Resilience patterns
- `quarkus-smallrye-fault-tolerance` annotations:
  - `@RateLimit` on mutating endpoints (per-user).
  - `@CircuitBreaker` on external calls.
  - `@Retry` with exponential backoff + jitter.
  - `@Timeout` everywhere external.
- Study: bulkhead pattern, backpressure, hedged requests.

### 10. Idempotency key TTL + cleanup
- Scope keys to TTL (e.g. 24h) and add a cleanup job.
- Document client contract: do not retry after TTL.
- Study: Stripe's idempotency model, 24h window rationale.

### 11. CQRS split
- Write side: only ledger entries.
- Read side: projection workers consume outbox, update balance snapshots + reporting views.
- Accept eventual consistency on reads except balance checks (still locked).
- Study: read/write model separation, projection rebuild, materialized views.

### 12. Formal event sourcing
- Treat `ledger_entries` as the only source of truth.
- `wallets.available_balance` becomes a rebuildable cache.
- Add admin `wallet_replay` endpoint to rebuild balance from entries.
- Study: event sourcing, snapshot strategies, replay performance.

### 13. Sharding & partitioning
- Shard by `user_id` to keep self-transfers within one shard.
- PostgreSQL native partitioning for `ledger_entries` by month.
- Hot/cold split: archive old entries to S3 + Athena/Trino.
- Study: consistent hashing, range vs hash partitioning, cross-shard transactions.

### 14. Compliance & regulatory hooks
- KYC/AML: sanctions screening (OFAC), velocity rules, structuring detection.
- PCI-DSS: never touch raw PAN; always tokenize via provider.
- Data retention: immutable archive 7+ years for financial records.
- Study: SBV reporting (Vietnam), FinCEN (US), local AML regimes.

### 15. Database isolation levels & anomalies
- Currently relying on Postgres default (`READ COMMITTED`) + row locks.
- Study: serializable vs repeatable read, write skew anomaly (relevant for balance constraints), `SERIALIZABLE` isolation with retry loop.
- Read: "A Critique of ANSI SQL Isolation Levels" (Berenson et al.).

### 16. Connection pooling & concurrency limits
- Agroal pool sizing under load.
- How `FOR UPDATE` locks interact with pool exhaustion.
- Study: Little's law for pool sizing, async vs blocking drivers (R2DBC).

---

## Reading list

- **Books**
  - *Designing Data-Intensive Applications* — Martin Kleppmann (ch. 7 transactions, ch. 11 stream processing)
  - *Database Internals* — Alex Petrov
  - *Enterprise Integration Patterns* — Hohpe & Woolf
  - *Patterns of Enterprise Application Architecture* — Fowler (Unit of Work, Identity Map)

- **Engineering blogs**
  - Stripe: "Designing robust and predictable APIs with idempotency"
  - Square / Block: ledger architecture posts
  - Monzo / Wise: balance sheet engineering posts
  - Uber Engineering: Schemaless, money movement

- **Standards**
  - ISO 20022 (financial messaging)
  - ISO 4217 (currency codes)
  - SWIFT MT103/MT202 (interbank transfers)

---

## Decision log

Append a row when implementing any topic above.

| Date | Topic | Approach / trade-off | Link |
|---|---|---|---|
| | | | |
