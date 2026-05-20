-- Stores a fingerprint of the original request payload so that
-- re-submission with a different payload on the same idempotency key can be rejected (HTTP 409).
ALTER TABLE ledger_transactions
    ADD COLUMN request_hash VARCHAR(64);
