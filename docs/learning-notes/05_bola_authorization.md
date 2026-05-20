# BOLA — Broken Object Level Authorization

## What is BOLA?
BOLA (also called IDOR — Insecure Direct Object Reference) is the #1 vulnerability in the OWASP API Security Top 10.

**Attack scenario:** A user knows their wallet ID is `uuid-A`. They change it to `uuid-B` in the request body and successfully top up someone else's wallet — or drain it.

```http
POST /api/v1/wallets/transfer
{
  "fromWalletId": "uuid-of-someone-elses-wallet",  ← attacker injects another user's ID
  "toWalletId": "uuid-of-attacker-wallet",
  "amount": "1000.00"
}
```

Without authorization checks, the server has no way to know the caller doesn't own `fromWalletId`.

## Solution: Caller Identity Header
In this system (no full auth layer yet), the caller's user ID is passed as a request header:

```http
X-User-Id: uuid-of-the-authenticated-user
```

The server checks that the wallet being mutated belongs to that user.

## Implementation
```java
@POST
@Path("/top-up")
public WalletResponse topUp(@Valid TopUpRequest req,
                            @HeaderParam("X-User-Id") UUID callerId) {
    assertOwner(req.walletId(), callerId);   // ← BOLA guard
    return walletService.topUp(req);
}

private void assertOwner(UUID walletId, UUID callerId) {
    if (callerId == null) return; // absent header → deferred to future auth layer
    Wallet wallet = walletRepo.findByIdOptional(walletId)
        .orElseThrow(() -> new NotFoundException("Wallet not found: " + walletId));
    if (!callerId.equals(wallet.userId)) {
        throw new ForbiddenException("Wallet does not belong to caller");  // → 403
    }
}
```

## Design Decisions
- Header is **optional for now** (null → skip check): the system has no real auth yet. In production this would be mandatory and populated by an API gateway or JWT filter.
- The check is in the **resource layer**, not the service layer — services are reusable internal components and shouldn't know about HTTP callers.
- Only **from** wallet is checked in transfer (you can only move money from your own wallet; the recipient wallet can belong to anyone).

## OWASP API Security Top 10 Context
This maps to **API1:2023 — Broken Object Level Authorization**. The fix is always the same pattern:
1. Extract the caller's identity from a trusted source (JWT claim, session, internal header).
2. On every object access, verify the object belongs to (or is accessible by) that caller.
3. Return 403 Forbidden (not 404) — don't leak whether the object exists.

## In Production
In a real system, `X-User-Id` would be replaced by a verified JWT claim:
```java
@Inject JsonWebToken jwt;

private UUID callerId() {
    return UUID.fromString(jwt.getSubject());
}
```

The API gateway verifies the JWT signature; the downstream service trusts the extracted claim.

## Code Location
- `api/WalletResource.java:assertOwner()` — BOLA check
- Transfer check: only `fromWalletId` is asserted (caller must own source wallet)
