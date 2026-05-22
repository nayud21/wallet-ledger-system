-- Stripe-style loose reference: trace which entity an idempotency key produced
-- without a hard FK (entity may live in a different table or be pruned independently).
ALTER TABLE idempotency_keys
    ADD COLUMN entity_type VARCHAR(64)  NULL,
    ADD COLUMN entity_id   UUID         NULL;

CREATE INDEX idx_idempotency_keys_entity ON idempotency_keys(entity_type, entity_id)
    WHERE entity_id IS NOT NULL;
