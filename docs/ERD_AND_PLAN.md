# ERD & Detailed Implementation Plan

Date: 2026-05-13

## Goals
This document contains:
- A Mermaid ERD describing the main tables of the Wallet + Ledger + Reconciliation system.
- Per-table descriptions: primary keys, foreign keys, indexes, and key data types.
- A detailed plan of functions / APIs / services / background jobs to implement, with priority, I/O, side effects, transactional boundaries, and acceptance criteria.

---

## ER Diagram (Mermaid)

```mermaid
erDiagram
    USERS {
        UUID id PK "uuid"
        string username
        string email
        timestamp created_at
    }

    WALLETS {
        UUID id PK
        UUID user_id FK
        string external_id
        numeric available_balance
        numeric reserved_balance
        string currency
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    WALLET_BALANCE_SNAPSHOTS {
        BIGINT id PK
        UUID wallet_id FK
        numeric available_balance
        numeric reserved_balance
        BIGINT ledger_tx_id FK
        timestamp created_at
    }

    LEDGER_ACCOUNTS {
        BIGINT id PK
        string name
        string type
        varchar metadata
        timestamp created_at
    }

    LEDGER_TRANSACTIONS {
        BIGINT id PK
        string idempotency_key
        varchar status
        string description
        timestamp created_at
    }

    LEDGER_ENTRIES {
        BIGINT id PK
        BIGINT ledger_account_id FK
        BIGINT ledger_tx_id FK
        varchar direction
        numeric amount
        varchar reference
        timestamp created_at
    }

    PAYMENT_EVENTS {
        BIGINT id PK
        string provider
        string external_ref
        jsonb payload
        varchar status
        timestamp created_at
    }

    EXTERNAL_STATEMENTS {
        BIGINT id PK
        varchar provider
        date statement_date
        jsonb content
        varchar status
        timestamp created_at
    }

    RECONCILIATION_RUNS {
        BIGINT id PK
        date run_date
        varchar status
        jsonb summary
        timestamp created_at
    }

    RECONCILIATION_MATCHES {
        BIGINT id PK
        BIGINT reconciliation_run_id FK
        BIGINT ledger_entry_id FK
        BIGINT external_statement_id FK
        jsonb details
    }

    RECONCILIATION_EXCEPTIONS {
        BIGINT id PK
        BIGINT reconciliation_run_id FK
        varchar type
        jsonb payload
        varchar status
        timestamp created_at
    }

    AUDIT_LOGS {
        BIGINT id PK
        varchar entity
        varchar entity_id
        varchar action
        jsonb diff
        varchar performed_by
        timestamp created_at
    }

    USERS ||--o{ WALLETS : "owns"
    WALLETS ||--o{ WALLET_BALANCE_SNAPSHOTS : "snapshots"
    LEDGER_TRANSACTIONS ||--o{ LEDGER_ENTRIES : "contains"
    LEDGER_ACCOUNTS ||--o{ LEDGER_ENTRIES : "has"
    WALLET_BALANCE_SNAPSHOTS }|..|{ LEDGER_TRANSACTIONS : "created_by"
    RECONCILIATION_RUNS ||--o{ RECONCILIATION_MATCHES : "produces"
    RECONCILIATION_RUNS ||--o{ RECONCILIATION_EXCEPTIONS : "produces"
    EXTERNAL_STATEMENTS ||--o{ RECONCILIATION_MATCHES : "matched_to"
    LEDGER_ENTRIES ||--o{ RECONCILIATION_MATCHES : "matched"
```

> **Implementation notes (for AI assistants):**
> * Primary entities (`users`, `wallets`) use `UUID` IDs.
> * Ledger tables (`ledger_*`, `reconciliation_*`) use `BIGINT` identity columns to guarantee monotonic ordering on queries.
> * Money columns (`amount`, `*_balance`) MUST be `NUMERIC(19,4)` in PostgreSQL and `java.math.BigDecimal` in Java. Never use `float`/`double`.
> * Free-form payloads (`payload`, `content`, `summary`) use PostgreSQL `JSONB` for indexability.
> * The diagram is a logical model; physical table names follow `snake_case` in migrations.

---

## Core Concepts

1. **Double-Entry Bookkeeping.** Every transaction has ≥ 2 entries that sum to zero per currency. Money never appears or disappears — it moves between accounts (e.g. from a settlement asset account to a wallet liability account).
2. **Idempotency.** Prevents duplicated debits/credits from retried webhooks or flaky networks. Implemented via a UNIQUE `idempotency_key` column.
3. **Concurrency Control.** Pessimistic row locks (`SELECT ... FOR UPDATE`) on wallets prevent race conditions on balance updates.
4. **Reconciliation.** A scheduled job compares ledger entries against external bank statements and surfaces unmatched items as exceptions.

---

## Technology Stack

* **Backend:** Java 21, Quarkus, Hibernate ORM with Panache, RESTEasy Reactive, Hibernate Validator, Flyway, SmallRye OpenAPI / Health.
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, TanStack Query.
* **Database:** PostgreSQL 15 (ACID, JSONB, row-level locking).
* **Testing:** JUnit 5, Mockito, Testcontainers (mandatory for any concurrency-sensitive code).

---

## Implementation Plan

### Phase A — MVP / Core Ledger flows (high priority)

1. **`POST /api/v1/wallets/top-up`**
   - Input: `{ walletId, amount, currency, idempotencyKey, externalRef? }`
   - Service: `WalletService.topUp(request)`
   - Steps: lock wallet (`SELECT ... FOR UPDATE`) → insert `ledger_transactions` + two `ledger_entries` (DEBIT settlement, CREDIT wallet liability) → bump `wallets.available_balance` → insert `wallet_balance_snapshots`.
   - AC: calling with the same `idempotencyKey` twice does not change balance; snapshot count increases by exactly one per unique call.

2. **`POST /api/v1/wallets/transfer`**
   - Input: `{ fromWalletId, toWalletId, amount, currency, idempotencyKey }`
   - Concurrency: lock wallets in ascending UUID order to prevent deadlock.
   - AC: source debited, target credited atomically; full rollback if source has insufficient balance.

3. **`POST /api/v1/ledger/reversal`**
   - Input: `{ ledgerTransactionId, reason, idempotencyKey }`
   - Behavior: create a new transaction whose entries mirror the directions of the original. `ledger_entries` remains append-only.

### Phase B — Integrations & idempotency hardening

1. **Webhook inbox: `POST /api/v1/payment/webhook`**
   - Persist the raw payload to `payment_events` (JSONB) and return `200 OK` immediately.
   - A `@Scheduled` worker processes pending events with idempotent semantics, advancing them through `PENDING → PROCESSED | FAILED`.

### Phase C — Reconciliation engine & jobs

1. **`ReconciliationRunner` (scheduled)**
   - Pull rows from `external_statements`.
   - Match against `ledger_entries` by `(amount, date, reference)`.
   - Write matches to `reconciliation_matches`; unmatched go to `reconciliation_exceptions` for manual review.

---

## Execution Roadmap (80/20)

**Sprint 1 (Weeks 1–2): Core Ledger APIs & UI skeleton.** Quarkus + Flyway + Postgres set up. Top-up + transfer endpoints. React shell with sidebar + main panel; laptop-first density from day one.

**Sprint 2 (Weeks 3–4): Resilience, security, transaction history.** Pessimistic locking + Testcontainers concurrency tests. OWASP pass: input validation, BOLA checks, no SQL injection. Transaction history table on the frontend.

**Sprint 3 (Weeks 5–6): Reconciliation engine & admin workspace.** CSV upload endpoint, matching algorithm, exception queue. Admin screen with side-by-side compare (ledger vs. statement).

**Sprint 4 (Weeks 7–8): Background jobs, AI tooling, DevOps.** Webhook inbox pattern. Husky pre-push hooks plus AI-assisted review (Claude Code / Copilot). README polish.
