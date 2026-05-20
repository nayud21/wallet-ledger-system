# Handling Money in Code

## Why Not `double` or `float`?
Floating-point types use binary representation, which cannot exactly represent most decimal fractions.

```java
double a = 0.1 + 0.2;
System.out.println(a);  // 0.30000000000000004  ← wrong!

// In a financial system:
double balance = 0.10;
balance += 0.20;
// Expected: 0.30
// Actual:   0.30000000000000004
// After 1000 transactions: significant drift
```

## Use `java.math.BigDecimal`
`BigDecimal` stores exact decimal values and supports precise arithmetic.

```java
BigDecimal a = new BigDecimal("0.1");
BigDecimal b = new BigDecimal("0.2");
System.out.println(a.add(b));  // 0.3  ✓

// Always construct from String, not double:
BigDecimal correct = new BigDecimal("0.1");
BigDecimal wrong   = new BigDecimal(0.1);  // inherits float imprecision!
```

## Always Pair Amount with Currency
An amount without a currency is meaningless. In this system every entry and every request carries both:

```java
public record TopUpRequest(
    UUID walletId,
    BigDecimal amount,    // amount
    String currency,      // paired currency
    String idempotencyKey,
    String externalRef
) {}
```

The service enforces that the wallet's currency matches the request's currency before any mutation.

## Database: `NUMERIC(19,4)`

```sql
amount NUMERIC(19,4) NOT NULL CHECK (amount > 0)
```

- `19` — total digits (sufficient for values up to ~$999 trillion)
- `4` — decimal places (supports sub-cent precision for FX/crypto)
- `NUMERIC` (= `DECIMAL`) is exact; `FLOAT`/`DOUBLE PRECISION` is not

## Wallet Balance Column

```sql
available_balance NUMERIC(19,4) NOT NULL DEFAULT 0
reserved_balance  NUMERIC(19,4) NOT NULL DEFAULT 0
CONSTRAINT chk_wallet_balances_non_negative CHECK (available_balance >= 0 AND reserved_balance >= 0)
```

The CHECK constraint prevents negative balances at the database level — a safety net even if the application has a bug.

## BigDecimal Arithmetic Rules

```java
// Addition / subtraction — use BigDecimal methods, never operators:
wallet.availableBalance = wallet.availableBalance.add(req.amount());
wallet.availableBalance = wallet.availableBalance.subtract(req.amount());

// Comparison — use compareTo(), never equals() for value comparison:
if (from.availableBalance.compareTo(req.amount()) < 0) {
    throw new InsufficientBalanceException(...);
}
// Note: new BigDecimal("1.0").equals(new BigDecimal("1.00")) → false (different scale)
//       new BigDecimal("1.0").compareTo(new BigDecimal("1.00")) → 0  (same value)

// Formatting for logging:
req.amount().toPlainString()  // "100.0000" not "1E+2"
```

## Summary of Rules

| Layer | Type |
|---|---|
| Java entity / service | `java.math.BigDecimal` |
| Database column | `NUMERIC(19,4)` |
| JSON input / output | String (Jackson serializes `BigDecimal` as number; use `@JsonSerialize` if precision matters) |
| Java construction | Always from `String`: `new BigDecimal("10.50")` |
| Comparison | Always `compareTo()`, never `==` or `equals()` for value |

## Code Location
- DTO validation: `dto/TopUpRequest.java` — `@DecimalMin("0.0001")`
- Entity columns: `domain/Wallet.java`, `domain/LedgerEntry.java`
- Schema: `V1__init_schema.sql` — all `NUMERIC(19,4)` columns
