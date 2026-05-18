-- Seed the system settlement account used by all top-up transactions.
INSERT INTO ledger_accounts (name, type) VALUES ('SETTLEMENT_ASSET', 'ASSET');

-- Each wallet gets its own LIABILITY ledger account created at wallet-creation time.
ALTER TABLE wallets ADD COLUMN ledger_account_id BIGINT REFERENCES ledger_accounts(id);
