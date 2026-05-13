-- Wallet Ledger System: initial schema.
-- See docs/ERD_AND_PLAN.md. Money columns are NUMERIC(19,4); ledger_entries is append-only.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(64) NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallets (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id),
    external_id        VARCHAR(128) UNIQUE,
    available_balance  NUMERIC(19,4) NOT NULL DEFAULT 0,
    reserved_balance   NUMERIC(19,4) NOT NULL DEFAULT 0,
    currency           CHAR(3) NOT NULL,
    status             VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_wallet_balances_non_negative CHECK (available_balance >= 0 AND reserved_balance >= 0)
);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);

CREATE TABLE ledger_accounts (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(128) NOT NULL UNIQUE,
    type        VARCHAR(32)  NOT NULL,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger_transactions (
    id               BIGSERIAL PRIMARY KEY,
    idempotency_key  VARCHAR(128) NOT NULL UNIQUE,
    status           VARCHAR(32)  NOT NULL DEFAULT 'POSTED',
    description      VARCHAR(512),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
    id                  BIGSERIAL PRIMARY KEY,
    ledger_account_id   BIGINT NOT NULL REFERENCES ledger_accounts(id),
    ledger_tx_id        BIGINT NOT NULL REFERENCES ledger_transactions(id),
    direction           VARCHAR(8)    NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
    amount              NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency            CHAR(3)       NOT NULL,
    reference           VARCHAR(128),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_entries_tx ON ledger_entries(ledger_tx_id);
CREATE INDEX idx_ledger_entries_account ON ledger_entries(ledger_account_id);

CREATE TABLE wallet_balance_snapshots (
    id                 BIGSERIAL PRIMARY KEY,
    wallet_id          UUID   NOT NULL REFERENCES wallets(id),
    available_balance  NUMERIC(19,4) NOT NULL,
    reserved_balance   NUMERIC(19,4) NOT NULL,
    ledger_tx_id       BIGINT NOT NULL REFERENCES ledger_transactions(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_snapshots_wallet ON wallet_balance_snapshots(wallet_id, created_at DESC);

CREATE TABLE payment_events (
    id            BIGSERIAL PRIMARY KEY,
    provider      VARCHAR(64) NOT NULL,
    external_ref  VARCHAR(128) NOT NULL,
    payload       JSONB NOT NULL,
    status        VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, external_ref)
);

CREATE TABLE external_statements (
    id              BIGSERIAL PRIMARY KEY,
    provider        VARCHAR(64) NOT NULL,
    statement_date  DATE NOT NULL,
    content         JSONB NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reconciliation_runs (
    id          BIGSERIAL PRIMARY KEY,
    run_date    DATE NOT NULL,
    status      VARCHAR(32) NOT NULL DEFAULT 'RUNNING',
    summary     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reconciliation_matches (
    id                      BIGSERIAL PRIMARY KEY,
    reconciliation_run_id   BIGINT NOT NULL REFERENCES reconciliation_runs(id),
    ledger_entry_id         BIGINT REFERENCES ledger_entries(id),
    external_statement_id   BIGINT REFERENCES external_statements(id),
    details                 JSONB
);

CREATE TABLE reconciliation_exceptions (
    id                      BIGSERIAL PRIMARY KEY,
    reconciliation_run_id   BIGINT NOT NULL REFERENCES reconciliation_runs(id),
    type                    VARCHAR(64) NOT NULL,
    payload                 JSONB NOT NULL,
    status                  VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id            BIGSERIAL PRIMARY KEY,
    entity        VARCHAR(64) NOT NULL,
    entity_id     VARCHAR(64) NOT NULL,
    action        VARCHAR(64) NOT NULL,
    diff          JSONB,
    performed_by  VARCHAR(128),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);
