# Implementation Plans

Detailed, step-by-step plans for AI agents (Claude Code) to follow when implementing each phase of the Wallet + Ledger + Reconciliation system.

> Origin: split and expanded from [`docs/ERD_AND_PLAN.md`](../ERD_AND_PLAN.md). On conflict, `ERD_AND_PLAN.md` is the source of truth for the **data model**; files here are the source of truth for **execution order and task breakdown**.

## Files

| File | Phase | Goal | Current status |
|---|---|---|---|
| [PHASE_A_core_ledger.md](PHASE_A_core_ledger.md) | A (Sprint 1–2) | Top-up, transfer, reversal, snapshots, idempotency, locking, tests | Code scaffolded, **no tests yet** |
| [PHASE_B_integrations.md](PHASE_B_integrations.md) | B (Sprint 4 early) | Webhook inbox `payment_events`, scheduled worker | Not started |
| [PHASE_C_reconciliation.md](PHASE_C_reconciliation.md) | C (Sprint 3) | CSV upload, matching engine, exceptions, admin UI | Not started |
| [PHASE_D_frontend_devops.md](PHASE_D_frontend_devops.md) | Frontend + DevOps (cross-cutting) | Laptop-first tables/forms, TanStack Query, husky, README | `App.tsx` empty |

## Rules for AI agents following these plans

1. **Read the relevant phase plan before writing code.** Each task is formatted as:
   - **Goal** — what it accomplishes
   - **Files to touch** — exact paths
   - **Steps** — small, atomic actions
   - **Acceptance criteria (AC)** — checklist to know it's done
2. **Do not skip phases.** If you spot a gap in a later phase, append a note at the bottom of that phase's file and continue with the current phase.
3. **One task = one small commit.** Commit message: `feat(phase-X): <task title>` (or `test`, `fix`, etc.).
4. **Never edit a committed migration.** Always add a new `V{n}__name.sql`.
5. **Money = `BigDecimal` + `NUMERIC(19,4)`**, always paired with a `currency`. Never `double`/`float`.
6. **Every mutating endpoint requires two tests:** (a) calling twice with the same `idempotencyKey` leaves state unchanged; (b) two concurrent threads do not race (Testcontainers).
7. After finishing a task: run `cd backend && ./mvnw test` and `cd frontend && npm run build`. Fix failures before marking the task done.
8. **Default to no comments** in code. Only explain a non-obvious WHY (constraint, invariant, workaround).

## Phase A gap analysis (current snapshot)

Already merged (`d8e961c`, `7eeda25`, `fc7ec98`):
- Migrations `V1__init_schema.sql`, `V2__add_wallet_ledger_account.sql`, `V3__char_to_varchar.sql`.
- Domain entities, repositories, DTOs.
- `WalletService.topUp` and `WalletService.transfer` with pessimistic lock + idempotency.
- `LedgerService` (74 lines, contains `reversal`).
- REST resources for user / wallet / ledger.

**Still missing for Phase A:**
- DB-level CHECK constraint for double-entry sum-zero (currently only enforced in service code).
- Testcontainers integration tests for topUp / transfer / reversal (both idempotency and concurrency).
- Bean Validation annotations on DTOs (`@NotNull`, `@Positive`, `@Size`, ...).
- BOLA check (a caller can only mutate wallets they own) — requires a minimal "principal" concept.
- Global exception mapper returning RFC-7807 problem details.

Details in [PHASE_A_core_ledger.md](PHASE_A_core_ledger.md).
