# Plan: Migrate Authentication vào hệ thống

**Auth chosen:** JWT (SmallRye JWT)
**Roles:** `user`, `admin`
**Ownership:** wallets đã có `user_id` sẵn (V1 schema), chỉ cần enforce.

---

## Phase 1 — Schema & User model (1 migration)

**`V9__add_auth_to_users.sql`**
- `ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL`
- `ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'user'` + `CHECK (role IN ('user','admin'))`
- `ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'active'` (active/disabled)
- `ADD COLUMN last_login_at TIMESTAMPTZ NULL`
- Index trên `(email)` (đã unique) + `(username)` cho lookup login.

Update `backend/src/main/java/com/walletledger/user/User.java` thêm các field tương ứng. **Không** expose `passwordHash` qua DTO.

---

## Phase 2 — Backend wiring

### 2.1 Dependencies (`backend/pom.xml`)
- `quarkus-smallrye-jwt` (verify)
- `quarkus-smallrye-jwt-build` (issue tokens)
- `quarkus-elytron-security-common` (BCrypt password hashing)

### 2.2 Key generation (dev)
- Sinh RSA keypair: `privateKey.pem` (issuer) + `publicKey.pem` (verifier).
- Cấu hình trong `application.properties`:
  ```
  mp.jwt.verify.publickey.location=publicKey.pem
  mp.jwt.verify.issuer=wallet-ledger
  smallrye.jwt.sign.key.location=privateKey.pem
  quarkus.native.resources.includes=publicKey.pem,privateKey.pem
  ```
- Test profile dùng cùng keys (`application-test.properties`).

### 2.3 New package `com.walletledger.auth`
- `AuthResource` — `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`.
- `AuthService` — register (hash bcrypt, insert user role=`user`), login (verify hash → issue JWT 1h, claims: `sub=userId`, `upn=username`, `groups=[role]`, `email`).
- `PasswordHasher` — wrapper quanh `BcryptUtil`.
- DTOs: `RegisterRequest(username,email,password)`, `LoginRequest(usernameOrEmail,password)`, `TokenResponse(accessToken,expiresIn)`, `MeResponse(id,username,email,role)`.
- Validation: `@Valid` + `@NotBlank`, password ≥ 8 ký tự, email format.
- **Không log** password/token; rate-limit login (Phase 1: counter theo IP in-memory, note để chuyển Redis sau).

### 2.4 Enforce authorization
- Thêm `@RolesAllowed` lên các REST endpoints:
  - `/api/v1/auth/login`, `/register` → `@PermitAll`
  - `/api/v1/wallets/**`, `/api/v1/ledger/**` → `@RolesAllowed("user","admin")`
  - `/api/v1/admin/**` → `@RolesAllowed("admin")`
  - `/api/v1/payments/webhook` → `@PermitAll` (verify HMAC signature, giữ logic webhook hiện tại)
- Inject `JsonWebToken jwt` vào resources cần `currentUserId`; refactor `WalletResource` bỏ tham số `userId` trên path/body, lấy từ `jwt.getSubject()`.

### 2.5 BOLA enforcement (critical)
- Trong `WalletService` mọi operation load wallet → assert `wallet.userId.equals(currentUserId) || isAdmin`. Throw `403` nếu fail.
- Transfer: cả source wallet phải owned bởi caller; destination chỉ cần exist.
- Ledger queries: filter theo wallets thuộc về user (admin bypass).
- Thêm helper `SecurityContext currentUser()` để tránh lặp.

### 2.6 Exception mapping
- `ExceptionMapper` cho `AuthenticationException` → 401, `ForbiddenException` → 403, JWT expired → 401 với header `WWW-Authenticate`.

---

## Phase 3 — Frontend

### 3.1 Auth state
- `AuthContext` (React Context) lưu `{user, token}`; persist token vào `localStorage` (key `wl_token`).
- Axios/fetch wrapper inject `Authorization: Bearer ${token}`; trên 401 → clear + redirect `/login`.

### 3.2 Pages mới
- `/login`, `/register` — form đơn giản, density laptop-first (`text-sm`, `max-w-sm`).
- `ProtectedRoute` wrapper kiểm `token` trước khi render.
- `Topbar` hiện username + nút Logout (clear localStorage).

### 3.3 API calls
- TanStack Query mutations cho `login`/`register`; bỏ field `userId` ở các form (backend tự lấy từ JWT).

---

## Phase 4 — Tests (Testcontainers)

1. `AuthResourceTest`:
   - register → 201, password hash không leak.
   - register duplicate username/email → 409.
   - login đúng → 200 + token; sai → 401.
   - login với account `status=disabled` → 403.
2. `WalletAuthorizationTest`:
   - User A không thể GET / topup / transfer-from wallet của User B → 403 (BOLA test bắt buộc).
   - Admin truy cập được mọi wallet.
   - Endpoint không có token → 401.
3. Idempotency tests hiện tại: thêm header `Authorization`; verify behavior không đổi.
4. Concurrent test: 2 thread login cùng user — JWT stateless nên trivial pass; chỉ để xác nhận không có session conflict.

---

## Phase 5 — Cleanup & docs

- Update `docs/ERD_AND_PLAN.md`: thêm section "Auth" mô tả role/JWT/claims.
- Update `CLAUDE.md` "Security" bullet với rule mới: "Mọi endpoint mutating phải `@RolesAllowed` + check ownership trong service."
- README: hướng dẫn sinh keypair dev.

---

## Rủi ro / lưu ý
- **Key rotation:** Phase 1 dùng file PEM static. Note để Phase sau move sang JWKS endpoint.
- **Refresh token:** chưa làm — access token 1h, user re-login. Có thể thêm sau nếu cần UX tốt hơn.
- **Webhook endpoint** không dùng JWT (giữ HMAC) — đừng nhầm gắn `@RolesAllowed`.
- **Existing users** trong DB (nếu có) sẽ fail `NOT NULL password_hash` → migration cần seed default hash hoặc xoá test data trước khi chạy.
