-- Remove idempotency concerns from ledger_transactions now that idempotency_keys
-- is the authoritative store. The idempotency_key column is retained as a
-- non-unique trace field so ledger rows remain traceable to their origin request,
-- but uniqueness is no longer enforced here.
ALTER TABLE ledger_transactions
    DROP CONSTRAINT IF EXISTS ledger_transactions_idempotency_key_key,
    DROP COLUMN IF EXISTS request_hash,
    ALTER COLUMN idempotency_key DROP NOT NULL;
