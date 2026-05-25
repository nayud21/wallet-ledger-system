-- Indexes to support reconciliation queries
CREATE INDEX idx_external_statements_date_status ON external_statements(statement_date, status);
CREATE INDEX idx_reconciliation_matches_run ON reconciliation_matches(reconciliation_run_id);
CREATE INDEX idx_reconciliation_exceptions_run ON reconciliation_exceptions(reconciliation_run_id);
CREATE INDEX idx_reconciliation_exceptions_status ON reconciliation_exceptions(status);
-- Note: timestamptz->date cast is timezone-dependent (not immutable), so a functional index is not viable here.
-- Queries filter by date range on created_at directly using existing ledger_entries PK scan.
