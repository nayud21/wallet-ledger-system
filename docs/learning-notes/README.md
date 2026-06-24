# Technical Learning Notes — Wallet Ledger System

Notes extracted from building a production-grade Wallet + Double-Entry Ledger system with Quarkus, Java 21, and PostgreSQL.

## Index

| # | Topic | Key Concepts |
|---|---|---|
| [01](01_double_entry_bookkeeping.md) | **Double-Entry Bookkeeping** | DEBIT/CREDIT, asset vs liability accounts, append-only ledger, reversals |
| [02](02_idempotency.md) | **Idempotency** | Idempotency keys, request fingerprint (SHA-256), 409 conflict detection |
| [03](03_pessimistic_locking_and_deadlock_prevention.md) | **Pessimistic Locking & Deadlock Prevention** | `SELECT FOR UPDATE`, ascending UUID lock ordering, lock hierarchy |
| [04](04_rfc7807_problem_details.md) | **RFC 7807 Problem Details** | `application/problem+json`, typed domain exceptions, JAX-RS `ExceptionMapper` |
| [05](05_bola_authorization.md) | **BOLA / IDOR** | OWASP API1, object-level ownership check, `X-User-Id` header, 403 vs 404 |
| [06](06_testing_strategy.md) | **Testing Strategy** | Integration tests with `@QuarkusTest`, unit tests with `@InjectMock`, idempotency tests, concurrency tests |
| [07](07_flyway_schema_migrations.md) | **Flyway Migrations** | Versioned SQL, immutability rule, `NUMERIC` vs `FLOAT`, Hibernate `validate` strategy |
| [08](08_money_in_code.md) | **Money in Code** | `BigDecimal` vs `double`, `NUMERIC(19,4)`, `compareTo()` vs `equals()`, currency pairing |
| [09](09_webhook_inbox_pattern.md) | **Webhook Inbox Pattern** | Inbox table, async processing, JSONB storage, `@JdbcTypeCode`, Quarkus `@Scheduled` |
| [10](10_auth_future.md) | **Auth — Future Implementation** | Mock login → JWT/OIDC roadmap, password hashing, token storage, BOLA enforcement, migration checklist |
| [11](11_server_sent_events.md) | **Server-Sent Events (SSE)** | Quarkus Reactive `Multi<String>`, CDI `AFTER_SUCCESS` observer, IO thread constraint, `CopyOnWriteArrayList` |
| [12](12_tanstack_query_patterns.md) | **TanStack Query Patterns** | queryKey design, invalidation, `enabled` flag, stale-while-revalidate, anti-pattern `useEffect+fetch` |
| [13](13_ddd_aggregate_boundaries.md) | **DDD Aggregate Boundaries** | Plain ID vs `@ManyToOne`, cross-aggregate queries, N+1 prevention, native SQL trade-off |
| [14](14_remaining_technical_gaps.md) | **Remaining Technical Gaps** | Sum-zero CHECK, reserved-balance flow, outbox, hash-chained audit, observability, multi-currency, CoA, saga, CQRS, event sourcing, sharding |
| [15](15_idempotency_keys_table.md) | **Idempotency Keys Table** | Dedicated dedup table, TTL pruning, decoupling from `ledger_transactions` |
| [16](16_jwt_auth.html) | **JWT Auth, RBAC & BOLA** 🔑 | SmallRye JWT, RSA self-issued keys, `@RolesAllowed`, service-layer ownership, bcrypt, 401 vs 403, SSE-token & recipient-lookup gotchas |
| [17](17_login_rate_limiting.html) | **Login Rate Limiting** 🔑 | Fixed-window per-IP counter, why not per-username, 429, in-memory vs Redis trade-off |
| [18](18_backend_architecture.html) | **Backend Architecture** 🗺️ | Package-by-feature, layered Resource/Service/Repository, constructor DI, request lifecycle, invariants, async/eventing — overview of notes 01–17 |
| [19](19_react_architecture.html) | **React Architecture** 🗺️ | Server vs client state, TanStack Query hooks, single fetch layer, Context + custom hooks, route guards, the legitimate `useEffect` (SSE), TS guardrails |
| [20](20_kafka_wallet_event_stream.html) | **Kafka Wallet Event Stream** 📨 | Phase F1: CDI→Kafka producer, partition key ⇄ per-wallet ordering, unique group.id = broadcast SSE, the dual-write gap (deferred to F2), SmallRye messaging, KRaft Dev Services |

> 🔑 = Phase E (auth). 🗺️ = architecture overviews. 📨 = Phase F (Kafka). Notes 16–20 are HTML — open them in a browser.

## How These Topics Connect

```
Request comes in
    │
    ├─ @Valid ──────────────────────────── Bean Validation (DTO layer)
    │
    ├─ JWT verify (Bearer) ─────────────── Authentication + RBAC @RolesAllowed (note 16)
    │       └─ assertOwnership() ───────── BOLA check (service layer)
    │
    ├─ Idempotency key lookup ──────────── Idempotency + conflict detection (service layer)
    │       └─ SHA-256 fingerprint
    │
    ├─ SELECT ... FOR UPDATE ───────────── Pessimistic lock (repository layer)
    │       └─ Ascending UUID order
    │
    ├─ BigDecimal arithmetic ───────────── Money handling (service layer)
    │
    ├─ DEBIT / CREDIT entries ──────────── Double-entry bookkeeping (service layer)
    │       └─ Append-only, sum = 0
    │
    └─ Error thrown?
            └─ GlobalExceptionMapper ───── RFC 7807 problem+json (api/error layer)
```

## Quick Reference

```java
// Lock before mutate
walletRepo.findByIdForUpdate(id)   // SELECT ... FOR UPDATE

// Always use BigDecimal
BigDecimal amount = new BigDecimal("100.00");   // from String, not double

// Hash for idempotency conflict detection
RequestHasher.hash(walletId, amount, currency)

// Typed exceptions → automatic RFC 7807 mapping
throw new InsufficientBalanceException(currency, available, requested);  // → 422
throw new IdempotencyConflictException(key);                              // → 409
```
