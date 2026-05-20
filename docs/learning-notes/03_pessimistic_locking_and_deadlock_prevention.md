# Pessimistic Locking & Deadlock Prevention

## Problem
Two concurrent requests arrive at the same time for the same wallet. Without synchronization:

```
Thread A reads balance: 100
Thread B reads balance: 100
Thread A writes balance: 100 - 70 = 30  ✓
Thread B writes balance: 100 - 80 = 20  ✗ (should have failed — only 30 left)
```

Both see the old balance and both succeed. This is a **lost update** / race condition.

## Solution: Pessimistic Locking (`SELECT FOR UPDATE`)
Before reading a wallet's balance to mutate it, acquire an exclusive row lock. Other transactions trying to lock the same row will block until the first transaction commits.

```sql
SELECT * FROM wallets WHERE id = ? FOR UPDATE
```

In Hibernate Panache:
```java
public Optional<Wallet> findByIdForUpdate(UUID id) {
    return find("id", id)
        .withLock(LockModeType.PESSIMISTIC_WRITE)  // → FOR UPDATE
        .firstResultOptional();
}
```

This is safe because the lock is held only for the duration of the transaction (Quarkus `@Transactional`).

## Deadlock Problem in Transfers
A transfer locks two wallets. If two concurrent transfers operate on the same wallets in opposite order:

```
Transfer 1: lock Wallet A → wait for Wallet B
Transfer 2: lock Wallet B → wait for Wallet A
──────────────────────────────────────────────
Deadlock! Both wait forever.
```

## Solution: Lock in Ascending UUID Order
Always acquire locks in a globally consistent order. If every transaction locks the wallet with the smaller UUID first, circular waits become impossible.

```java
UUID firstId = req.fromWalletId().compareTo(req.toWalletId()) <= 0
    ? req.fromWalletId() : req.toWalletId();
UUID secondId = req.fromWalletId().compareTo(req.toWalletId()) <= 0
    ? req.toWalletId() : req.fromWalletId();

walletRepo.findByIdForUpdate(firstId);   // always locks smaller UUID first
walletRepo.findByIdForUpdate(secondId);
```

```
Transfer 1 (A→B): lock A first → lock B
Transfer 2 (B→A): lock A first → lock B  (same order!)
──────────────────────────────────────────────────────
No deadlock. Transfer 2 simply waits for Transfer 1 to release A.
```

## Why UUID Ordering Works
UUID.compareTo() gives a total order over all wallet IDs. As long as every participant follows the same order, you get a **lock hierarchy** — a classic deadlock prevention technique.

## Key Terms
| Term | Meaning |
|---|---|
| Pessimistic lock | Lock before reading; block others until commit |
| Optimistic lock | Read freely; detect conflict at write time (version column) |
| Deadlock | Two transactions each wait for a lock the other holds |
| Lock hierarchy | Agreed global lock ordering that eliminates circular waits |

## Code Location
- `WalletRepository.java:findByIdForUpdate()`
- `WalletService.java:transfer()` — ascending UUID sort before locking
- Concurrent tests: `WalletTopUpTest.java:topUp_concurrent_*`, `WalletTransferTest.java:transfer_concurrent_*`
