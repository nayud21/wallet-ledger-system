# Phase D — Frontend, DevOps & AI tooling (cross-cutting)

**Goal:** A laptop-first admin/operator UI exercising every backend phase, plus the engineering hygiene (lint, hooks, CI, README) needed for the project to be reviewable.

This phase runs **in parallel** with A/B/C: build each UI slice immediately after its backend endpoint lands.

**Prerequisite reading:** [`CLAUDE.md`](../../CLAUDE.md) §"Frontend rules".

**Definition of Done:**
- `npm run build` passes, `npm run typecheck` passes, `npm run lint` passes with 0 warnings.
- All server data is fetched via TanStack Query; no `useEffect + fetch`.
- Husky pre-push runs `mvn verify` + `npm run build`.
- README explains: stack, how to run, how to test, where each phase doc lives.

---

## D1 — Frontend foundations

**Goal:** App shell + routing + query client + API client.

**Files to add (under `frontend/src/`):**
- `lib/api.ts` — `fetch` wrapper that prefixes `/api/v1`, attaches `X-User-Id` from a local store, JSON-parses, throws `ApiError` on non-2xx (parses RFC-7807).
- `lib/queryClient.ts` — TanStack Query client with `defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }`.
- `app/providers.tsx` — wraps app with `QueryClientProvider`, router.
- `app/routes.tsx` — React Router (or TanStack Router) with routes: `/`, `/wallets`, `/wallets/:id`, `/ledger`, `/reconciliation`, `/reconciliation/runs/:id`, `/inbox`.
- `components/Layout.tsx` — left sidebar (compact `w-56`), top bar with user selector, main content `flex-1 overflow-auto`.
- `components/DataTable.tsx` — generic dense table: `text-sm`, `py-1.5 px-2`, sticky header, optional virtualisation via `@tanstack/react-table`.

**Tooling:**
- Add `eslint`, `@typescript-eslint`, `eslint-plugin-react-hooks`, `prettier`.
- Add `npm run typecheck` → `tsc --noEmit`.

**AC:** Visiting `/` shows the shell with sidebar; switching `X-User-Id` in the top bar changes the header propagated by API client (verify in Network tab).

---

## D2 — Wallet screens

**Routes / components:**
- `/wallets` — table: external id, currency, available, reserved, status, updated_at. Compact rows, right-aligned numerics with `tabular-nums`.
- `/wallets/:id` — two-column layout:
  - Left: wallet detail, recent snapshots (table).
  - Right: action panel — Top-up form, Transfer form. Both submit with generated UUID `idempotencyKey` (button to "regenerate" so users can re-submit on purpose).
- Below: ledger entry history for the wallet (joined via `ledger_account_id`).

**Hooks (`features/wallets/*.ts`):**
- `useWallets()`, `useWallet(id)`, `useTopUp()`, `useTransfer()`, `useWalletEntries(id, page)`.
- Mutations invalidate `['wallets']` and `['wallets', id]`.

**UX rules:**
- Money displayed as `Intl.NumberFormat(currency, minimumFractionDigits: 2, maximumFractionDigits: 4)`.
- On 422 `insufficient-balance`, show inline error on the amount field, not a toast.
- On 409 `idempotency-conflict`, show modal with the original transaction details (fetch by key).

**AC:** Operator can complete a top-up + transfer end-to-end without devtools.

---

## D3 — Ledger / Transaction history

- `/ledger` — table of `ledger_transactions` with filter by date range, description, idempotency key.
- Click row → drawer with all entries (account, direction, amount, reference). Highlight that DEBIT+CREDIT sums to zero.
- Button "Reverse" (admin only) → form asking for reason + idempotency key. Confirms in modal showing what entries will be produced.

**AC:** Reversing produces a new transaction visible immediately on the list.

---

## D4 — Payment inbox (Phase B UI)

- `/inbox` — table: provider, external ref, status (badge), attempts, received_at, processed_at, last_error (truncated, tooltip on hover).
- Filters: status, provider, date range.
- Row action: "Retry" (admin) for `FAILED` rows.

**AC:** Triggering a retry flips status badge from FAILED → PENDING → PROCESSED (poll every 3 s via `refetchInterval` while any PENDING/PROCESSING is in view).

---

## D5 — Reconciliation workspace (Phase C UI)

- `/reconciliation` — list of runs, filter by date/provider. Status badge + summary chips.
- `/reconciliation/runs/:id` — **side-by-side layout** (this is the marquee UI of the project):
  - Left pane: matches (collapsible).
  - Right pane: exceptions grouped by type. Each exception card shows the ledger entry and statement side-by-side with diff highlights.
  - Action buttons: `Link to entry…` (opens entry picker), `Write off`.
- Upload page `/reconciliation/upload` — drag-and-drop CSV, shows accepted/skipped/errors summary.

**Density:** Use `grid grid-cols-2 gap-2 text-sm`. Avoid cards with heavy padding; max 16 px of padding per pane.

**AC:** Operator resolves every exception in a 50-exception sample without keyboard-only complaints (basic accessibility: focus rings, Esc closes modals).

---

## D6 — DevOps / hygiene

**Files:**
- `.husky/pre-push` — runs `cd backend && ./mvnw -q -DskipITs=false verify` + `cd frontend && npm run typecheck && npm run lint && npm run build`. Skip ITs only locally if `SKIP_IT=1`.
- `.github/workflows/ci.yml` (or GitLab equivalent if applicable):
  - Job 1 `backend`: setup Java 21, run `./mvnw verify` with a service container Postgres (or rely on Testcontainers' Docker).
  - Job 2 `frontend`: Node 20, `npm ci`, `typecheck`, `lint`, `build`.
- `README.md` rewrite:
  - 1-paragraph project pitch.
  - "Run locally" block (docker-compose, mvn, npm).
  - Link to `docs/ERD_AND_PLAN.md` and each phase plan under `docs/plans/`.
  - "Engineering decisions" section with 3 bullets: double-entry, idempotency, pessimistic locking.

**AC:** Fresh clone → docker-compose up → `./mvnw quarkus:dev` + `npm run dev` works in < 5 minutes following README only.

---

## D7 — AI-assisted review (optional polish)

- Add `.claude/` settings allowing common safe commands (`mvn`, `npm`, `psql -c "SELECT ..."`) without prompting (see `fewer-permission-prompts` skill).
- Add a CLAUDE.md note pointing future agents at `docs/plans/`.
- Optionally enable `/security-review` and `/review` skills as pre-merge checks.

---

## Out-of-scope
- Real auth UI (login screen) — keep `X-User-Id` selector for MVP.
- i18n.
- Mobile-responsive layouts — explicitly laptop-first per `CLAUDE.md`.
- Charts/dashboards — not in scope unless reconciliation metrics demand it.
