# Dedicated Idempotency Keys Table

## The Problem

The initial design stored the idempotency key directly in `ledger_transactions`:

```sql
ALTER TABLE ledger_transactions ADD COLUMN idempotency_key VARCHAR(128) UNIQUE;
ALTER TABLE ledger_transactions ADD COLUMN request_hash    VARCHAR(64);
```

This couples two unrelated concerns in a single table:

| Concern | Nature |
|---|---|
| Financial record (`ledger_transactions`) | Permanent, append-only, audited forever |
| Idempotency dedup (`idempotency_key`) | Short-lived, only meaningful during a client's retry window (~24h) |

**Consequences of coupling them:**

1. **Index bloat over time.** The `UNIQUE` index on `idempotency_key` grows with every transaction and can never be pruned without deleting financial records. At high volume (millions of tx/day) this slows duplicate-key lookups.

2. **No TTL possible.** A key like `order-123-2026-05-22` is meaningless after the retry window closes, but it lives in the ledger forever. This also blocks clients who want to reuse key patterns keyed on date.

3. **Mixed semantics in queries.** `SELECT * FROM ledger_transactions` now serves two purposes: financial audit trail and request dedup cache. This makes both use cases more complex.

## The Solution

Move idempotency tracking to a dedicated table with an explicit TTL:

```sql
CREATE TABLE idempotency_keys (
    key          VARCHAR(128) PRIMARY KEY,
    request_hash VARCHAR(64)  NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL,  -- set to now() + 24h on insert
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_idempotency_keys_expires ON idempotency_keys(expires_at);
```

`ledger_transactions.idempotency_key` is retained as a **non-unique trace column** so each ledger row is traceable back to its origin request, but the UNIQUE constraint and `request_hash` are removed.

## Request Flow

```
1. Compute hash = SHA-256(key request params)
2. SELECT from idempotency_keys WHERE key = ?
   ├── Found, hash matches  → short-circuit, return cached result  (safe replay)
   ├── Found, hash differs  → throw 409 Conflict                   (client bug: reused key with different params)
   └── Not found            → INSERT into idempotency_keys, proceed with operation
3. Execute wallet / ledger operation
4. Persist ledger_transaction (idempotency_key stored as trace only)
```

The INSERT in step 2 acts as the dedup lock. If two concurrent requests race with the same key, only one INSERT wins (PRIMARY KEY violation); the other gets a DB-level duplicate key error, which surfaces as a conflict.

## Cleanup

Expired keys can be pruned independently without touching financial records:

```sql
DELETE FROM idempotency_keys WHERE expires_at < now();
```

This can be scheduled as a nightly job (e.g. Quarkus `@Scheduled`). The `idx_idempotency_keys_expires` index makes the DELETE efficient even on large tables.

## What Changed (V5 / V6 migrations)

- **V5:** Added `idempotency_keys` table.
- **V6:** Dropped `UNIQUE` constraint and `request_hash` column from `ledger_transactions`; made `idempotency_key` nullable (trace only).
- **`IdempotencyKeyRepository`:** Encapsulates the check-then-insert pattern behind `checkAndGuard()` and `persist()`.
- **`WalletService` / `LedgerService`:** Now call `idempotencyKeyRepo.checkAndGuard()` before acquiring wallet locks, eliminating the double `findByIdempotencyKey` query that existed in the old design.
