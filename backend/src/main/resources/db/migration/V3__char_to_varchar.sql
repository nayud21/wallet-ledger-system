-- Hibernate validates CHAR(3)/bpchar as type mismatch against VARCHAR mapping.
-- Convert all CHAR(3) currency columns to VARCHAR(3) for consistent type mapping.
ALTER TABLE wallets ALTER COLUMN currency TYPE VARCHAR(3);
ALTER TABLE ledger_entries ALTER COLUMN currency TYPE VARCHAR(3);
