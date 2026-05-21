# 13 — DDD Aggregate Boundaries & Cross-Aggregate Queries

## The Design Choice: Plain ID vs. `@ManyToOne`

In this project, `Wallet` holds `Long ledgerAccountId` — a plain foreign key — rather than a `@ManyToOne LedgerAccount` JPA navigation reference.

```java
// Current approach — DDD aggregate boundary style
@Entity
public class Wallet extends PanacheEntityBase {
    public Long ledgerAccountId;  // plain FK, not an ORM reference
}

// Typical ORM approach — not used here
@Entity
public class Wallet extends PanacheEntityBase {
    @ManyToOne
    public LedgerAccount ledgerAccount;  // allows JPQL navigation
}
```

## Why Plain IDs?

### 1. Aggregate boundaries

In DDD, an **Aggregate** is a cluster of domain objects treated as a single unit with a clear boundary. The rule: **cross-aggregate access must go through identity (ID), not object references**.

- `Wallet` is one aggregate (Wallet domain)
- `LedgerAccount` is a separate aggregate (Ledger domain)
- They should not hold direct references to each other's internals

This keeps the two domains independently evolvable — the Ledger domain can change its `LedgerAccount` structure without the Wallet domain recompiling.

### 2. Preventing accidental N+1 queries

With `@ManyToOne(fetch = LAZY)`:
```java
List<Wallet> wallets = walletRepo.listAll();  // 1 query
wallets.forEach(w -> w.ledgerAccount.getName());  // N additional queries — N+1!
```

With a plain `Long ledgerAccountId`, traversal is impossible by accident. A developer must write an explicit query to load the related data, which forces awareness of the query cost.

### 3. Explicit, traceable data access

Every time data from `LedgerAccount` is needed, it requires a deliberate query. This makes the intent visible, performance issues easier to trace, and removes "magic" lazy loads that are hard to spot in code review.

## The Trade-off: Native SQL for Cross-Aggregate Queries

Without `@ManyToOne`, JPQL cannot join unrelated entities:

```java
// ❌ JPQL cannot do this — no mapped relationship exists
SELECT w FROM Wallet w JOIN w.ledgerAccount la WHERE ...

// ✅ Must use native SQL instead
@Query(value = """
    SELECT to_w.id, u.username, to_w.currency
    FROM ledger_entries debit_e
    JOIN ledger_transactions lt  ON lt.id = debit_e.ledger_tx_id
    JOIN ledger_entries credit_e ON credit_e.ledger_tx_id = lt.id AND credit_e.direction = 'CREDIT'
    JOIN wallets from_w ON from_w.ledger_account_id = debit_e.ledger_account_id
    JOIN wallets to_w   ON to_w.ledger_account_id = credit_e.ledger_account_id
    JOIN users u        ON u.id = to_w.user_id
    WHERE from_w.user_id = :userId AND ...
    """, nativeQuery = true)
```

This is the accepted cost of enforcing aggregate boundaries. The query is more verbose but the intent is explicit and the performance is fully controlled.

## When Is `@ManyToOne` Appropriate?

Use `@ManyToOne` when two entities belong to the **same aggregate** — tightly coupled, sharing a lifecycle. Examples:

- `Order` ↔ `OrderItem` — an `OrderItem` cannot exist without its `Order`
- `LedgerTransaction` ↔ `LedgerEntry` — entries are owned by the transaction; they are deleted/reversed together

Use plain IDs when entities belong to **different aggregates** — independently deployable, with separate domain ownership.

## Summary

| Approach | Pros | Cons |
|---|---|---|
| Plain ID (current) | No N+1 risk, explicit data access, clean aggregate boundaries | Cross-aggregate queries require native SQL |
| `@ManyToOne` | Easy JPQL joins | Risk of accidental N+1, tight coupling across domain boundaries |

The current design is correct for this project — `Wallet` and `LedgerAccount` belong to different bounded contexts, and the plain ID enforces that boundary.
