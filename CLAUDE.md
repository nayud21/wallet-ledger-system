# Claude Code — Working Instructions

> Read first: [`docs/ERD_AND_PLAN.md`](docs/ERD_AND_PLAN.md). It is the source of truth for the data model, phases (A/B/C), and acceptance criteria.

## Project overview
A **Wallet + Double-Entry Ledger + Reconciliation** system. Two deployables:
- `backend/` — Quarkus 3.15 service (Java 21, Hibernate Panache, Flyway, PostgreSQL).
- `frontend/` — React 18 + TypeScript + Vite + Tailwind + TanStack Query.

PostgreSQL runs via `docker-compose up -d` from the repo root.

## How to work in this repo

### Before writing code
1. Locate the relevant phase in `docs/ERD_AND_PLAN.md` (Phase A/B/C). Call out which phase your change belongs to.
2. Re-read the affected table definition in `backend/src/main/resources/db/migration/V1__init_schema.sql` — types and constraints there are load-bearing.
3. If a change requires schema migration, add a new `V{n}__{name}.sql`. Never edit a committed migration.

### Backend — non-negotiable rules
- **Dependency injection:** use `@RequiredArgsConstructor` (Lombok) with `private final` fields. Never `@Inject` on fields directly.
- **Money:** `java.math.BigDecimal` in code, `NUMERIC(19,4)` in DB. Never `double`. Always pair amounts with a `currency`.
- **Double-entry:** every `ledger_transaction` must have entries summing to zero per currency. Enforce at service layer (assert before commit) and DB (CHECK in a later migration).
- **Append-only:** `ledger_entries` rows are never UPDATEd or DELETEd. Reversals create a new transaction with mirrored entries.
- **Idempotency:** every mutating endpoint accepts an `idempotencyKey`. Persist with UNIQUE constraint. Duplicate calls return the original result, not a new mutation.
- **Concurrency:** wallet mutations use `SELECT ... FOR UPDATE`. For transfers, lock wallets in ascending ID order to prevent deadlock.
- **Security (OWASP):** validate with `@Valid` at REST boundaries; enforce wallet ownership (no BOLA); never log webhook bodies or secrets; only parameterized queries.

### Frontend rules
- **Laptop-first density.** Use compact tables, side-by-side panels for reconciliation screens, `text-sm` defaults. Don't waste horizontal space.
- All server state goes through TanStack Query. No `useEffect` + `fetch`.
- API calls hit `/api/v1/...` — Vite proxies to `http://localhost:8080` in dev.

### Testing expectations
- Any code that touches wallet balance or ledger entries requires a **Testcontainers** integration test that exercises concurrent access (at minimum: two threads calling the same operation).
- Idempotency: every mutating endpoint has a test that calls it twice with the same key and asserts state is unchanged on the second call.
- Run `cd backend && ./mvnw test` and `cd frontend && npm run build` before declaring a task complete.

## Commands

```bash
# Database
docker-compose up -d

# Backend (dev mode, hot reload)
cd backend && ./mvnw quarkus:dev
# → API at http://localhost:8080, Swagger at http://localhost:8080/q/swagger-ui

# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173 (proxies /api → :8080)

# Backend tests
cd backend && ./mvnw test
```

## Code style
- Default to **no comments**. Only explain WHY when non-obvious (a constraint, invariant, or workaround). Don't narrate what the code does.
- Don't add error handling for cases that can't happen — trust framework guarantees.
- Don't introduce abstractions for hypothetical future needs.
- Prefer editing existing files over creating new ones.
- Use Java records for DTOs, `Optional<T>` for nullable service returns.

## What NOT to do
- Don't bypass Flyway by editing schema directly or with `hibernate.hbm2ddl.auto=update`.
- Don't add a "soft delete" flag to `ledger_entries`. The table is append-only.
- Don't store money as `String` "to be safe". Use `BigDecimal`.
- Don't add features outside the phase you're working on, even if you spot them — note them and move on.
- **Never create `.js` files inside `frontend/src/`.** This is a TypeScript project — all new files must use `.ts` or `.tsx`. Creating `.js` duplicates causes Vite to resolve imports to the wrong file (JS is preferred over TS), breaking the app silently.
