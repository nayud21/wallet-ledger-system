-- Dedicated idempotency store, separate from ledger_transactions.
--
-- Why a separate table?
--   ledger_transactions is a permanent financial record. Mixing idempotency
--   bookkeeping (short-lived, TTL-based) into it conflates two concerns:
--   1. It forces the idempotency index to grow forever alongside the ledger,
--      slowing duplicate-key lookups over time.
--   2. It prevents key expiry: idempotency keys are only meaningful during
--      a client's retry window (typically 24-48h), not for the lifetime of
--      the ledger row.
--   A dedicated table can be pruned independently without touching financial
--   records, keeping the idempotency index small and fast.
CREATE TABLE idempotency_keys (
    key          VARCHAR(128) PRIMARY KEY,
    request_hash VARCHAR(64)  NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_idempotency_keys_expires ON idempotency_keys(expires_at);
