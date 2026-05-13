# Wallet Ledger System

A wallet platform built on a double-entry general ledger with automatic reconciliation against external bank statements.

> **Source of truth for the data model and roadmap:** [`docs/ERD_AND_PLAN.md`](docs/ERD_AND_PLAN.md).
> **AI assistant rules:** [`CLAUDE.md`](CLAUDE.md) (Claude Code), [`.github/copilot-instructions.md`](.github/copilot-instructions.md) (GitHub Copilot), [`.cursorrules`](.cursorrules) (Cursor).

## Stack
- **Backend:** Java 21, Quarkus 3.15, Hibernate ORM with Panache, Flyway, PostgreSQL 15.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, TanStack Query.
- **Infra:** Docker Compose (PostgreSQL).

## Repository layout
```
wallet-ledger-system/
├── .cursorrules                 # Rules for Cursor
├── .github/
│   └── copilot-instructions.md  # Rules for GitHub Copilot
├── CLAUDE.md                    # Rules for Claude Code
├── docs/
│   └── ERD_AND_PLAN.md          # ERD + phased plan (source of truth)
├── backend/                     # Quarkus service
├── frontend/                    # React app
└── docker-compose.yml           # PostgreSQL 15
```

## Prerequisites
- JDK 21
- Maven 3.9+ (or use the wrapper `./mvnw`)
- Node.js 20+ and npm
- Docker (for PostgreSQL)

## Quick start

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Backend (dev mode, hot reload)
cd backend
./mvnw quarkus:dev
# → API:        http://localhost:8080
# → Health:     http://localhost:8080/api/v1/health
# → Swagger UI: http://localhost:8080/q/swagger-ui

# 3. Frontend (in a separate terminal)
cd frontend
npm install
npm run dev
# → http://localhost:5173 (proxies /api → :8080)
```

## Tests

```bash
cd backend && ./mvnw test
cd frontend && npm run build   # type-check via `tsc -b`
```

Backend tests use Quarkus dev-services (Testcontainers) to spin up a real PostgreSQL — no mocks for ledger logic.

## Architectural invariants
- **Double-entry:** every ledger transaction has entries that sum to zero per currency.
- **Append-only:** `ledger_entries` is never updated or deleted; reversals are new transactions.
- **Idempotency:** all mutating endpoints require an `idempotencyKey`.
- **Concurrency:** wallet mutations lock rows with `SELECT ... FOR UPDATE`; transfers lock wallets in ascending ID order.
- **Money:** `BigDecimal` / `NUMERIC(19,4)` everywhere. Never `float`/`double`.

See [`CLAUDE.md`](CLAUDE.md) for the full rule set.
