# RFC 7807 — Problem Details for HTTP APIs

## Problem
By default, errors from REST APIs are inconsistent: one endpoint returns `{"error": "not found"}`, another returns `{"message": "bad request"}`, and another returns a plain HTML page. Clients have to special-case each endpoint.

## RFC 7807 Standard
A specification for a machine-readable error format for HTTP APIs.

**Content-Type:** `application/problem+json`

**Canonical fields:**

| Field | Type | Description |
|---|---|---|
| `type` | URI | Identifies the problem type (link to docs) |
| `title` | string | Short human-readable summary |
| `status` | int | HTTP status code |
| `detail` | string | Specific explanation for this occurrence |

**Example response:**
```json
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://wallet-ledger/problems/insufficient-balance",
  "title": "Insufficient Balance",
  "status": 422,
  "detail": "Insufficient balance: available 30.0000 USD, requested 80.00"
}
```

## HTTP Status Code Choices

| Situation | Status | Reason |
|---|---|---|
| Wallet not found | 404 | Resource doesn't exist |
| Validation failure (`@Valid`) | 400 | Client sent malformed input |
| Self-transfer, bad currency | 400 | Client logic error |
| Insufficient balance | 422 | Input is valid but semantically wrong |
| Wallet not active | 422 | Valid wallet, invalid state |
| Idempotency key conflict | 409 | Conflict with existing resource state |
| Unexpected exception | 500 | Server fault |

**Why 422 instead of 400 for business rule violations?**
400 means the request was *malformed*. 422 means the request was *well-formed but unprocessable* — the server understood the request but couldn't fulfill it due to business logic. This helps clients distinguish "fix your JSON" from "fix your business logic."

## Implementation Pattern: Global ExceptionMapper

JAX-RS provides `ExceptionMapper<T>` — a single place to convert any exception to an HTTP response. This keeps business logic exceptions clean (no HTTP knowledge in services).

```java
@Provider
public class GlobalExceptionMapper implements ExceptionMapper<Throwable> {

    @Override
    public Response toResponse(Throwable ex) {
        if (ex instanceof InsufficientBalanceException) {
            return problem(422, "Insufficient Balance", ex.getMessage());
        }
        if (ex instanceof IdempotencyConflictException) {
            return problem(409, "Idempotency Conflict", ex.getMessage());
        }
        // ... other mappings
        return problem(500, "Internal Server Error", "An unexpected error occurred");
    }

    private Response problem(int status, String title, String detail) {
        return Response.status(status)
            .type("application/problem+json")
            .entity(new ProblemDetail(...))
            .build();
    }
}
```

**`@Provider`** tells JAX-RS (Quarkus REST) to register this as an extension automatically.

## Typed Domain Exceptions
Services throw specific, meaningful exceptions — not `BadRequestException` or raw strings. This makes the code readable and allows the mapper to produce accurate HTTP responses.

```java
// Before (bad):
throw new BadRequestException("Insufficient balance");

// After (good):
throw new InsufficientBalanceException(currency, available, requested);
//  → mapper converts to 422 + problem+json automatically
```

Exception hierarchy in this project:
```
RuntimeException
├── InsufficientBalanceException    → 422
├── CurrencyMismatchException       → 422
├── WalletNotActiveException        → 422
├── AlreadyReversedException        → 422
├── IdempotencyConflictException    → 409
└── jakarta.ws.rs.NotFoundException → 404
```

## Code Location
- `api/error/GlobalExceptionMapper.java`
- `api/error/ProblemDetail.java` (record)
- `exception/` package — all typed exceptions
