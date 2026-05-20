# Flyway — Database Schema Migrations

## Problem
When you change the database schema (add a column, change a type), you need every environment — dev, test, CI, prod — to apply the exact same change in the exact same order. Doing this manually is error-prone and doesn't scale.

## What Flyway Does
Flyway tracks which SQL scripts have been applied to a database and applies new ones automatically on startup. It stores the applied version history in a table called `flyway_schema_history`.

## File Naming Convention
```
V{version}__{description}.sql
```
- `V` — version prefix (required)
- `{version}` — integer, must increase monotonically (`1`, `2`, `3`...)
- `__` — **two** underscores (required separator)
- `{description}` — human-readable description with underscores

```
V1__init_schema.sql          ← baseline schema, all tables
V2__add_wallet_ledger_account.sql
V3__char_to_varchar.sql
V4__add_request_hash.sql
```

## Immutability Rule
**Never edit a committed migration.** Flyway checksums each file. If you change a file after it's been applied, Flyway will detect the checksum mismatch and refuse to start.

To change something:
```
❌ Edit V1__init_schema.sql
✅ Create V5__fix_column_name.sql
```

## Quarkus Configuration
```properties
quarkus.flyway.migrate-at-start=true       # run on every startup
quarkus.flyway.baseline-on-migrate=true    # allow existing DB without history
quarkus.flyway.locations=classpath:db/migration
quarkus.hibernate-orm.schema-management.strategy=validate  # Hibernate only validates; Flyway owns DDL
```

**`validate` strategy is critical:** It prevents Hibernate from silently modifying the schema. If your entity doesn't match the migration, Hibernate will throw an error at startup rather than quietly alter your tables.

## Migration Examples From This Project

### V3 — Changing CHAR(3) to VARCHAR(3)
```sql
-- V3__char_to_varchar.sql
ALTER TABLE wallets ALTER COLUMN currency TYPE VARCHAR(3);
ALTER TABLE ledger_entries ALTER COLUMN currency TYPE VARCHAR(3);
```
Motivation: `CHAR(3)` pads values with spaces, causing string comparison issues in Java.

### V4 — Adding a Nullable Column
```sql
-- V4__add_request_hash.sql
ALTER TABLE ledger_transactions
    ADD COLUMN request_hash VARCHAR(64);
```
Nullable by default → backward compatible with existing rows (they get NULL).

## Migration vs Hibernate `hbm2ddl.auto`
| | Flyway | `hbm2ddl.auto=update` |
|---|---|---|
| Version controlled | ✓ | ✗ |
| Auditable history | ✓ | ✗ |
| Safe to run in prod | ✓ | ✗ |
| Handles data migration | ✓ | ✗ |
| Drops columns | explicit | never |
| Renames columns | explicit | creates new |

**Never use `hbm2ddl.auto=update` in production.** It can silently drop data and doesn't handle renames.

## Code Location
- Migrations: `src/main/resources/db/migration/`
- Config: `src/main/resources/application.properties`
