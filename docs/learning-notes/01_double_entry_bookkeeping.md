# Double-Entry Bookkeeping

## Core Principle
Every financial transaction must affect at least two accounts, and the total debits must always equal total credits. Money never appears or disappears — it moves between accounts.

```
DEBIT  account_A  +100
CREDIT account_B  +100
─────────────────────
SUM = 0  ✓
```

## Account Types in This System

| Type | Meaning | Example |
|---|---|---|
| ASSET | Things the system owns | `SETTLEMENT_ASSET` (bank account) |
| LIABILITY | Things the system owes users | `WALLET_LIABILITY:uuid` (user balance) |

## Top-Up Flow

When a user tops up $100:

```
DEBIT  SETTLEMENT_ASSET    +100   (money enters the system from outside)
CREDIT WALLET_LIABILITY    +100   (the system now owes the user $100)
```

Both sides move together. If one fails, the whole transaction rolls back.

## Transfer Flow ($50 from Wallet A → Wallet B)

```
DEBIT  WALLET_LIABILITY:A  +50    (system owes A $50 less)
CREDIT WALLET_LIABILITY:B  +50    (system owes B $50 more)
```

Net change to the system's total liabilities: zero.

## Reversal Flow (undo the top-up)

Mirror every entry with flipped direction:

```
CREDIT SETTLEMENT_ASSET    +100   (money leaves the system)
DEBIT  WALLET_LIABILITY    +100   (system owes user $100 less)
```

**Key invariant:** `ledger_entries` is **append-only**. Reversals create new rows; original rows are never modified or deleted.

## Why This Matters
- Audit trail is complete and tamper-evident.
- Any point-in-time balance can be derived by replaying entries.
- Errors are corrected by reversals, not edits.

## Code Location
- Service logic: `WalletService.java`, `LedgerService.java`
- Entries table: `V1__init_schema.sql` → `ledger_entries`
- Account seeding: `V2__add_wallet_ledger_account.sql`
