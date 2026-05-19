# Phase C — Reconciliation Engine

**Goal:** Daily compare external bank statements vs internal ledger entries. Matches go into `reconciliation_matches`; differences go into `reconciliation_exceptions` and surface in an admin UI for manual resolution.

**Prerequisite:** Phase A complete. Phase B optional (helps because webhook events produce ledger entries with `reference` set).

**Definition of Done:**
- Operator can upload a CSV via UI, see a run created, see matched/unmatched counts within ~30 s for 10 k rows.
- All exceptions classifiable into one of: `MISSING_IN_LEDGER`, `MISSING_IN_STATEMENT`, `AMOUNT_MISMATCH`, `DUPLICATE`.
- Manual resolution endpoint lets admin link or write-off exceptions.
- Tests cover all four exception types.

---

## Task C1 — Migrations

**File:** `V7__reconciliation.sql`.

```sql
CREATE TABLE external_statements (
  id              BIGSERIAL PRIMARY KEY,
  provider        VARCHAR(64) NOT NULL,
  statement_date  DATE NOT NULL,
  external_ref    VARCHAR(128) NOT NULL,
  amount          NUMERIC(19,4) NOT NULL,
  currency        VARCHAR(3) NOT NULL,
  direction       VARCHAR(8) NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
  content         JSONB NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'NEW',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_external_statements UNIQUE (provider, statement_date, external_ref)
);
CREATE INDEX idx_external_statements_date ON external_statements(statement_date);
CREATE INDEX idx_external_statements_ref ON external_statements(external_ref);

CREATE TABLE reconciliation_runs (
  id          BIGSERIAL PRIMARY KEY,
  run_date    DATE NOT NULL,
  provider    VARCHAR(64) NOT NULL,
  status      VARCHAR(16) NOT NULL DEFAULT 'RUNNING',
  summary     JSONB,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE reconciliation_matches (
  id                      BIGSERIAL PRIMARY KEY,
  reconciliation_run_id   BIGINT NOT NULL REFERENCES reconciliation_runs(id),
  ledger_entry_id         BIGINT NOT NULL REFERENCES ledger_entries(id),
  external_statement_id   BIGINT NOT NULL REFERENCES external_statements(id),
  details                 JSONB,
  CONSTRAINT uq_match_entry UNIQUE (ledger_entry_id),
  CONSTRAINT uq_match_stmt  UNIQUE (external_statement_id)
);

CREATE TABLE reconciliation_exceptions (
  id                      BIGSERIAL PRIMARY KEY,
  reconciliation_run_id   BIGINT NOT NULL REFERENCES reconciliation_runs(id),
  type                    VARCHAR(32) NOT NULL CHECK (type IN
    ('MISSING_IN_LEDGER','MISSING_IN_STATEMENT','AMOUNT_MISMATCH','DUPLICATE')),
  ledger_entry_id         BIGINT REFERENCES ledger_entries(id),
  external_statement_id   BIGINT REFERENCES external_statements(id),
  payload                 JSONB NOT NULL,
  status                  VARCHAR(16) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','RESOLVED','WRITTEN_OFF')),
  resolution_note         TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at             TIMESTAMPTZ,
  resolved_by             VARCHAR(128)
);
CREATE INDEX idx_recon_exc_open ON reconciliation_exceptions(reconciliation_run_id, status);
```

---

## Task C2 — CSV upload endpoint

**Files:** `.../api/ReconciliationResource.java`, `.../service/StatementImportService.java`.

**Endpoint:** `POST /api/v1/reconciliation/statements` — `multipart/form-data` with fields `provider` (text), `file` (CSV).

**CSV format (header row required):**
```
date,external_ref,amount,currency,direction,memo
2026-05-12,TXN-001,100.0000,USD,CREDIT,top-up via card
```

**Steps:**
1. Stream-parse with `opencsv` or Apache Commons CSV (do not load full file in memory).
2. Validate each row: date `yyyy-MM-dd`, amount `> 0`, currency `^[A-Z]{3}$`, direction in set.
3. `INSERT ... ON CONFLICT (provider, statement_date, external_ref) DO NOTHING` — re-upload safe.
4. Return summary `{ accepted, skipped, errors: [{lineNo, message}] }` (first 100 errors only).

**AC:**
- 10 k rows imports in < 5 s on dev DB.
- Re-uploading same file inserts 0 rows.

---

## Task C3 — Matching algorithm

**File:** `.../service/ReconciliationRunner.java`.

**Algorithm (per run):**
1. Create `reconciliation_runs` row with `status='RUNNING'`.
2. Define window: `statement_date BETWEEN runDate - 2d AND runDate + 2d` (tolerance for posting lag).
3. Load candidate `ledger_entries` where `created_at::date` in window AND not yet matched (left-join `reconciliation_matches` IS NULL).
4. Load candidate `external_statements` in window with `status='NEW'`.
5. **Pass 1 — exact match:** key = `(amount, currency, direction, reference == external_ref)`. Insert into `reconciliation_matches`, mark statement `status='MATCHED'`.
6. **Pass 2 — amount + ref, ignore date drift:** within the window only. Same logic, broader.
7. **Pass 3 — amount + currency + direction, fuzzy ref** (Levenshtein ≤ 2). Each fuzzy match writes an exception of type `AMOUNT_MISMATCH` only if amounts differ; otherwise a match with `details = {confidence: "fuzzy"}`.
8. **Exception generation:**
   - Statements still `NEW` → `MISSING_IN_LEDGER`.
   - Entries still unmatched → `MISSING_IN_STATEMENT`.
   - Multiple statements collapse to one entry, or vice versa → `DUPLICATE` (detected during pass 1 when more than one candidate matches).
9. Write `summary = {matched, missingInLedger, missingInStatement, amountMismatch, duplicates}` to the run, set `status='COMPLETED'`.

**Performance hint:** load both sides into in-memory maps keyed by `(amount, currency, ref)`. Don't do N×M SQL.

**AC:**
- Synthetic dataset: 1000 entries, 1000 statements with 5 % drift → run completes in < 10 s; all four exception types produced for crafted inputs.

---

## Task C4 — Scheduled trigger

**File:** `.../service/ReconciliationScheduler.java`.

- `@Scheduled(cron = "0 30 1 * * ?")` — daily at 01:30 server time.
- Runs once per active provider for `runDate = yesterday`.
- Skips if a `COMPLETED` run for the same `(provider, run_date)` already exists.
- Manual trigger: `POST /api/v1/reconciliation/runs?provider=&date=` (admin only).

---

## Task C5 — Exception resolution endpoints

**File:** `.../api/ReconciliationExceptionResource.java`.

- `GET /api/v1/reconciliation/runs/{id}` — run + summary + paginated exceptions.
- `POST /api/v1/reconciliation/exceptions/{id}/resolve` — body `{ action: "LINK" | "WRITE_OFF", note, linkLedgerEntryId? }`.
  - `LINK`: insert a `reconciliation_matches` row using the provided pair, set exception `status='RESOLVED'`.
  - `WRITE_OFF`: set `status='WRITTEN_OFF'`, record resolver via `X-User-Id`.
- Always idempotent: resolving an already-resolved exception returns 200 with current state.

---

## Task C6 — Tests

**File:** `backend/src/test/java/com/walletledger/recon/ReconciliationIT.java`.

**Cases (each in isolation):**
1. **Perfect day:** 5 entries, 5 statements all exact → 5 matches, 0 exceptions.
2. **Missing in ledger:** 1 statement no entry → 1 `MISSING_IN_LEDGER` exception.
3. **Missing in statement:** 1 entry no statement → 1 `MISSING_IN_STATEMENT`.
4. **Amount mismatch:** entry 100.00, statement 99.99 → `AMOUNT_MISMATCH` with payload `{ledger: 100.0000, statement: 99.9900}`.
5. **Duplicate:** 2 statements with same ref+amount, 1 entry → 1 match + 1 `DUPLICATE`.
6. **Resolution:** create exception → resolve `LINK` → `reconciliation_matches` row present, exception `RESOLVED`.
7. **Re-run idempotency:** run twice for same date → second run skipped (or detects "no new data").

---

## Out-of-scope
- Multi-currency netting.
- Auto-creation of ledger entries from statement (would violate "no money created outside top-up/transfer").
- ML/heuristic matching beyond Levenshtein on reference.
