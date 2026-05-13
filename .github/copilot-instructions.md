# GitHub Copilot Instructions — Wallet Ledger System

> These instructions are read by GitHub Copilot Chat and inline completions. Keep them concise and prescriptive — Copilot uses them to bias suggestions, not as a runbook.

## Project at a glance
A **Wallet + Double-Entry Ledger + Reconciliation** platform. Source of truth for data model and roadmap: [`docs/ERD_AND_PLAN.md`](../docs/ERD_AND_PLAN.md).

## Stack
- **Backend:** Java 21, Quarkus 3.15, Hibernate ORM with Panache, RESTEasy Reactive, Flyway, PostgreSQL 15.
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query.
- **Tests:** JUnit 5, Mockito, Testcontainers.

## Hard rules — always apply

### Money
- Use `java.math.BigDecimal` in Java and `NUMERIC(19,4)` in PostgreSQL for all monetary columns. **Never** `float`/`double`/`Double`.
- Always carry a `currency` (ISO-4217, `CHAR(3)`) alongside any amount.

### Ledger invariants
- `ledger_entries` is **append-only**. Generate INSERTs, never UPDATE or DELETE.
- Every `ledger_transaction` must have entries that sum to zero per currency (debits = credits).
- Reversals = a new transaction with mirrored DEBIT/CREDIT directions, not a row mutation.

### Idempotency
- Every mutating endpoint takes an `idempotencyKey` and persists it with a UNIQUE constraint. On duplicate, return the prior result.

### Concurrency
- Wallet mutations lock rows with `SELECT ... FOR UPDATE` (use `@Lock(LockModeType.PESSIMISTIC_WRITE)` in Panache repositories).
- Transfers between two wallets acquire locks in ascending wallet-ID order to prevent deadlock.

### IDs
- `users`, `wallets` → `UUID` (default `gen_random_uuid()`).
- All ledger / reconciliation / event tables → `BIGSERIAL`.

### Security
- Validate inputs with `@Valid` + Hibernate Validator at REST boundaries.
- Always enforce wallet ownership before reads/writes (prevent BOLA).
- Use parameterized queries; never string-concatenate SQL.
- Don't log full webhook bodies or any PAN/secret.

### Migrations
- Schema changes ship as new Flyway files: `backend/src/main/resources/db/migration/V{n}__{name}.sql`. Never edit a committed migration.

### Frontend
- Laptop-first density: prefer compact tables, side-by-side panels, and `text-sm` defaults.
- Use TanStack Query for all server state. No `useEffect` + `fetch` for data loading.
- All API calls go to `/api/v1/...` (Vite dev server proxies to `:8080`).

## Style
- Default to **no comments**. Only comment WHY (non-obvious constraint or invariant).
- Don't introduce abstractions for hypothetical needs.
- Don't add try/catch for cases that can't happen.

## When generating new code, prefer
- Panache repository pattern over raw `EntityManager`.
- Records for DTOs.
- `Optional<T>` over nullable returns in service layer.
- Tailwind utility classes over custom CSS.
