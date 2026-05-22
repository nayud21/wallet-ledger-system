-- entity_id changed from UUID to VARCHAR(128) so it can hold both UUID and Long PKs.
-- Drop and recreate the index because the column type changes.
DROP INDEX IF EXISTS idx_idempotency_keys_entity;

ALTER TABLE idempotency_keys
    ALTER COLUMN entity_id TYPE VARCHAR(128) USING entity_id::text;

CREATE INDEX idx_idempotency_keys_entity ON idempotency_keys(entity_type, entity_id)
    WHERE entity_id IS NOT NULL;
