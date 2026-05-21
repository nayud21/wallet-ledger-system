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

## How These Topics Connect

```
Request comes in
    │
    ├─ @Valid ──────────────────────────── Bean Validation (DTO layer)
    │
    ├─ X-User-Id header ────────────────── BOLA check (resource layer)
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
