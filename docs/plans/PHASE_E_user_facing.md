# Phase E — User-Facing App

**Goal:** A consumer-facing UI where end-users log in, view their own wallets, send money, and browse their transaction history. This sits on top of the existing ledger infrastructure but requires a new auth layer and strict ownership enforcement before any screen can be built safely.

**Prerequisite reading:**
- [`docs/ERD_AND_PLAN.md`](../ERD_AND_PLAN.md) — data model, especially `users` and `wallets`.
- [`CLAUDE.md`](../../CLAUDE.md) — OWASP rules; BOLA in particular.
- Phase A is fully complete (top-up, transfer, reversal all working).

**Definition of Done:**
- `./mvnw verify` passes including new auth integration tests.
- `npm run build && npm run typecheck && npm run lint` all pass.
- BOLA test: authenticated as user A, attempting to fetch/mutate user B's wallet returns 403.
- Every mutating endpoint still requires `idempotencyKey`.

---

## Why auth must land before any UI

The existing codebase has no session, no token, no ownership check — only a `X-User-Id` header trusted blindly. Shipping a user-facing screen on top of that would expose every wallet to every user. All E1–E3 tasks below must be done before any frontend work begins.

---

## Task E1 — Schema: add auth columns to `users`

**Files to add:**
- `backend/src/main/resources/db/migration/V4__add_user_auth.sql`

**Migration content:**
```sql
ALTER TABLE users
    ADD COLUMN password_hash VARCHAR(255),
    ADD COLUMN role           VARCHAR(32) NOT NULL DEFAULT 'USER',
    ADD COLUMN status         VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX idx_users_email ON users(email);
```

**Notes:**
- `role` values: `USER`, `OPERATOR`, `ADMIN`. Operators/admins access the existing admin UI (Phase D). Users only access Phase E routes.
- `password_hash` stores bcrypt output (cost factor 12). Never store plaintext.
- `status`: `ACTIVE`, `SUSPENDED`. Suspended users get 403 on every authenticated request.

**AC:** Migration runs cleanly; existing rows get `role = USER`, `status = ACTIVE`, `password_hash = NULL` (they will be set on first login/registration).

---

## Task E2 — Backend: JWT auth with Quarkus OIDC / SmallRye JWT

**Approach:** Self-issued JWTs (no external IdP needed for MVP). Quarkus `quarkus-smallrye-jwt` issues and verifies tokens.

**Dependencies to add to `pom.xml`:**
```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-smallrye-jwt</artifactId>
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-smallrye-jwt-build</artifactId>
</dependency>
```

**New files:**
- `backend/src/main/java/com/walletledger/api/AuthResource.java`
  - `POST /api/v1/auth/register` — `{ username, email, password }` → hash password, insert user, return JWT.
  - `POST /api/v1/auth/login` — `{ email, password }` → verify hash, return JWT.
  - JWT claims: `sub` = `user.id` (UUID string), `groups` = `["USER"]` or `["OPERATOR"]`, `exp` = now + 1h.
- `backend/src/main/java/com/walletledger/service/AuthService.java`
  - `register(RegisterRequest)` → check email uniqueness, bcrypt hash, persist, issue token.
  - `login(LoginRequest)` → load user by email, verify hash (`BcryptUtil.matches`), issue token.
  - Both throw `BadRequestException` on invalid input; never leak "email not found" vs "wrong password" (return same message).
- `backend/src/main/java/com/walletledger/dto/RegisterRequest.java` — record with `@NotBlank email`, `@Size(min=8) password`, `@NotBlank username`.
- `backend/src/main/java/com/walletledger/dto/LoginRequest.java` — record with `@NotBlank email`, `@NotBlank password`.
- `backend/src/main/java/com/walletledger/dto/TokenResponse.java` — record `String accessToken, String tokenType, long expiresIn`.

**`application.properties` additions:**
```properties
mp.jwt.verify.publickey.location=META-INF/resources/publicKey.pem
mp.jwt.verify.issuer=wallet-ledger
smallrye.jwt.sign.key.location=META-INF/resources/privateKey.pem
```

Generate RSA key pair once and commit the public key; keep private key out of git (load via env var or Vault in prod).

**AC:**
- `POST /api/v1/auth/register` with duplicate email returns 400.
- `POST /api/v1/auth/login` with wrong password returns 400 (same message as wrong email).
- Valid login returns a JWT decodable with the public key, containing correct `sub` and `groups`.

---

## Task E3 — Backend: BOLA enforcement on wallet endpoints

**Goal:** A user may only read/mutate wallets where `wallet.userId == JWT sub`. Operators bypass this check.

**Files to touch:**
- `backend/src/main/java/com/walletledger/api/WalletResource.java`
- `backend/src/main/java/com/walletledger/service/WalletService.java`

**Changes:**

Inject `JsonWebToken jwt` into `WalletService`. Add a private helper:
```java
private void assertOwnership(Wallet wallet) {
    if (jwt.getGroups().contains("OPERATOR")) return;
    UUID callerId = UUID.fromString(jwt.getSubject());
    if (!wallet.userId.equals(callerId)) {
        throw new ForbiddenException("Wallet does not belong to caller");
    }
}
```

Call `assertOwnership(wallet)` in:
- `topUp()` — after loading the wallet, before any mutation.
- `transfer()` — assert ownership of the **source** wallet only (you can receive from anyone).
- `getWallet()` in `WalletResource` — before returning.

**Existing admin endpoints** (`GET /api/v1/wallets` list-all, `POST /api/v1/wallets` create) stay `@RolesAllowed("OPERATOR")`.

**AC (mandatory Testcontainers test):**
- Register user A and user B.
- Create a wallet for user A.
- Authenticate as user B, `POST /api/v1/wallets/top-up` with user A's walletId → assert 403.
- Authenticate as user A, same request → assert 200.

---

## Task E4 — Backend: user-scoped wallet list endpoint

**New endpoint:** `GET /api/v1/me/wallets`

**Files to add:**
- Handler in `WalletResource.java`:
  ```java
  @GET
  @Path("/me")
  @RolesAllowed("USER")
  public List<WalletResponse> myWallets() {
      UUID userId = UUID.fromString(jwt.getSubject());
      return walletRepo.findByUserId(userId).stream()
          .map(WalletResponse::from).toList();
  }
  ```
- Add `findByUserId(UUID)` to `WalletRepository`.

**AC:** Returns only wallets owned by the authenticated user; other users' wallets are not present.

---

## Task E5 — Backend: user-scoped transaction history

**New endpoint:** `GET /api/v1/me/transactions?page=0&size=20`

Returns paginated ledger entries for all wallet accounts belonging to the calling user, joined with their parent `ledger_transactions`. Ordered by `created_at DESC`.

**Native query sketch (in `LedgerEntryRepository`):**
```sql
SELECT le.*, lt.description, lt.status
FROM ledger_entries le
JOIN ledger_transactions lt ON lt.id = le.ledger_tx_id
JOIN wallets w ON w.ledger_account_id = le.ledger_account_id
WHERE w.user_id = :userId
ORDER BY le.created_at DESC
LIMIT :size OFFSET :page * :size
```

**New DTO:** `UserTransactionResponse` — record with `entryId`, `direction`, `amount`, `currency`, `description`, `createdAt`.

**AC:** User A's history contains only their own entries; cursor pagination works correctly at page boundaries.

---

## Task E6 — Frontend: auth screens

**Routes to add:** `/login`, `/register` (public, no sidebar).

**Files:**
- `frontend/src/features/auth/LoginPage.tsx` — email + password form, calls `POST /api/v1/auth/login`, stores JWT in `localStorage` under key `wl_token`, redirects to `/dashboard`.
- `frontend/src/features/auth/RegisterPage.tsx` — username + email + password + confirm-password form.
- `frontend/src/features/auth/useAuth.ts` — hook exposing `{ user, login, logout, isAuthenticated }`. Parses JWT claims locally (no extra round-trip).
- `frontend/src/lib/api.ts` — update to attach `Authorization: Bearer <token>` header from `localStorage`.

**UX rules:**
- Password field has show/hide toggle.
- On 400, show the server's error message inline under the form (not a toast).
- Redirect unauthenticated users from any protected route to `/login`.

---

## Task E7 — Frontend: user dashboard

**Route:** `/dashboard` (authenticated, role USER)

**Layout:** single-column, max-w-3xl centered (not the admin sidebar layout).

```
┌─────────────────────────────────────────┐
│  Hi, username 👋                logout  │
├────────────────────┬────────────────────┤
│ USD Wallet         │ VND Wallet         │
│ Available: $1,250  │ Available: ₫0      │
│ [Top Up] [Send]    │ [Top Up] [Send]    │
└────────────────────┴────────────────────┘

Recent Transactions
───────────────────────────────────────────
↑ Transfer to wallet-002   -$50.00   today
↓ Top-up                  +$300.00   yesterday
↑ Transfer to wallet-003  -$100.00   May 18
[Load more]
```

**Hooks:**
- `useMyWallets()` → `GET /api/v1/me/wallets`
- `useMyTransactions(page)` → `GET /api/v1/me/transactions`

---

## Task E8 — Frontend: send money flow

**Route:** `/send` or modal triggered from dashboard.

**Steps (wizard-style, 3 steps):**
1. **Recipient** — enter target wallet ID or scan (text input for MVP).
2. **Amount** — amount input, shows sender's current balance, inline error if insufficient.
3. **Confirm** — summary card: from, to, amount, fee (0 for MVP). "Confirm & Send" button generates UUID idempotency key and calls `POST /api/v1/wallets/transfer`.

On success: redirect to dashboard, show success banner with transaction ID.
On `insufficient-balance` 400: jump back to step 2 with inline error.

---

## Task E9 — Frontend: transaction history page

**Route:** `/history`

Full paginated list view (load-more pattern, not pagination numbers).
Filter by: direction (All / Sent / Received), date range.
Each row: direction icon (↑ red / ↓ green), description, amount, date.
Click row → modal with full ledger entry details.

---

## Out-of-scope for Phase E
- Push notifications / email receipts.
- Multi-currency conversion.
- KYC / identity verification.
- Password reset flow (note: add in Phase F if needed).
- Biometric / 2FA (note: add in Phase F if needed).
- Mobile-responsive layout (project is explicitly laptop-first per CLAUDE.md).
