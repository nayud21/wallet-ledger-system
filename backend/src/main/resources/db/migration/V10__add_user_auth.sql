ALTER TABLE users
    ADD COLUMN password_hash VARCHAR(255),
    ADD COLUMN role          VARCHAR(32)  NOT NULL DEFAULT 'USER',
    ADD COLUMN status         VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN last_login_at  TIMESTAMPTZ;

ALTER TABLE users
    ADD CONSTRAINT chk_users_role   CHECK (role   IN ('USER', 'ADMIN')),
    ADD CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'SUSPENDED'));

CREATE INDEX idx_users_email ON users (email);

-- Seed a bootstrap admin so admin-only endpoints are testable from a fresh DB.
-- Credentials (dev only): admin@walletledger.local / Admin@12345
-- Hash is bcrypt cost 12 ($2a$), matching BcryptUtil output.
INSERT INTO users (username, email, password_hash, role, status)
VALUES ('admin', 'admin@walletledger.local',
        '$2a$12$xYLHjPNqq3KCFYU8wbSitOTi9AjVTVJE2YR.pdHKKKar0JoCWpObm',
        'ADMIN', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;
