# Idempotency

## Problem
Networks are unreliable. A client may retry a request that already succeeded (timeout, dropped connection). Without protection, retrying a top-up of $50 would credit the account twice.

## Solution: Idempotency Key
The client generates a unique key per *logical operation* and sends it with every request. The server:
1. Checks if the key has been seen before.
2. If yes → return the original result, do nothing.
3. If no → execute and persist the key atomically.

```http
POST /api/v1/wallets/top-up
{
  "walletId": "...",
  "amount": "50.00",
  "currency": "USD",
  "idempotencyKey": "order-789-topup"   ← client-generated, UUID or similar
}
```

## Database Enforcement
```sql
CREATE TABLE ledger_transactions (
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,  -- DB rejects duplicates at storage level
    ...
);
```

The UNIQUE constraint is the last line of defense — even if two concurrent requests pass the application-level check simultaneously, only one INSERT will succeed; the other gets a constraint violation.

## Request Fingerprint (Conflict Detection)
Storing only the key is not enough. A buggy client might reuse the same key with different parameters (different amount, different wallet). That must return HTTP 409, not silently apply the original result.

**How it works:**
1. Hash the significant request fields with SHA-256.
2. Store the hash alongside the idempotency key.
3. On retry: if key exists but hashes differ → `IdempotencyConflictException` → 409.

```java
String hash = RequestHasher.hash(
    req.walletId().toString(),
    req.amount().toPlainString(),
    req.currency().toUpperCase()
);
```

```java
ledgerTxRepo.findByIdempotencyKey(req.idempotencyKey()).ifPresent(existing -> {
    if (existing.requestHash != null && !existing.requestHash.equals(hash)) {
        throw new IdempotencyConflictException(req.idempotencyKey());  // → 409
    }
});
```

## Happy-Path Retry vs. Conflict

| Scenario | HTTP Status | Behaviour |
|---|---|---|
| Same key, same payload | 200 | Returns original result |
| Same key, different payload | 409 | Rejected |
| New key | 200/201 | Processed normally |

## Code Location
- Hash utility: `util/RequestHasher.java`
- Exception: `exception/IdempotencyConflictException.java`
- Migration: `V4__add_request_hash.sql` (adds `request_hash` column)
- Service checks: `WalletService.java:topUp()`, `WalletService.java:transfer()`, `LedgerService.java:reverse()`
