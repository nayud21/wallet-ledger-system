# Phase E — Auth Backend Foundation (AUTHORITATIVE)

> **Đây là plan chính thức cho phần auth backend.** Nó thay thế (supersede) các chi tiết
> backend trong [`AUTH_MIGRATION_PLAN.md`](../AUTH_MIGRATION_PLAN.md) và tasks E1–E5 của
> [`PHASE_E_user_facing.md`](PHASE_E_user_facing.md), vốn được viết khi codebase còn ở
> trạng thái cũ. Phần frontend (E6–E9) vẫn theo `PHASE_E_user_facing.md`.
>
> Verified against codebase on 2026-06-18.

## Quyết định đã chốt (resolve các mâu thuẫn giữa 2 doc cũ)

| Vấn đề | 2 doc cũ nói gì | Quyết định | Lý do |
|---|---|---|---|
| **Migration number** | `V4` / `V9` | **`V10__add_user_auth.sql`** | DB đã có V1–V9. Không bao giờ sửa migration đã commit, không trùng số. |
| **Package layout** | `com.walletledger.api.*`, `.service.*`, `.dto.*` | **Feature package `com.walletledger.auth`**, DTO trong `auth/dto/` | Codebase dùng feature-based packages (`wallet/`, `ledger/`, `payment/`...), không phải layer-based. |
| **Role naming** | `user`/`admin` (lowercase) vs `USER`/`OPERATOR`/`ADMIN` | **`USER`, `ADMIN`** (uppercase, chỉ 2 role) | Chốt 2026-06-18: bỏ `OPERATOR` — chưa có nhu cầu tách nhân viên back-office khỏi superuser. `ADMIN` cover toàn bộ admin UI + reconciliation + quản lý ví. Uppercase để khớp convention `status` đã có trong DB. |
| **Vị trí private key** | `META-INF/resources/privateKey.pem` | **`src/main/resources/` (classpath, KHÔNG web-served)** | ⚠️ `META-INF/resources/` là static web root của Quarkus → privateKey sẽ bị serve công khai tại `/privateKey.pem`. Lỗ hổng nghiêm trọng. Xem §4. |

## Trạng thái codebase liên quan (đã verify)

- [`user/User.java`](../../backend/src/main/java/com/walletledger/user/User.java): chỉ có `id, username, email, createdAt`. Chưa có password/role/status.
- [`wallet/Wallet.java`](../../backend/src/main/java/com/walletledger/wallet/Wallet.java): `userId` đã có sẵn (V1). Ownership chỉ cần *enforce*.
- [`wallet/WalletResource.java`](../../backend/src/main/java/com/walletledger/wallet/WalletResource.java): hiện dùng `@HeaderParam("X-User-Id") UUID callerId` + `assertOwner()` — `assertOwner` **return sớm nếu header null** (bất kỳ ai bỏ header đều bypass). Phải bỏ hoàn toàn.
- `WalletRepository.findByUserId(UUID)` **đã tồn tại** (E4 cũ bảo "thêm mới" — sai, đã có).
- [`shared/error/GlobalExceptionMapper.java`](../../backend/src/main/java/com/walletledger/shared/error/GlobalExceptionMapper.java): là `ExceptionMapper<Throwable>` (bắt mọi exception). `ForbiddenException`/`NotAuthorizedException` hiện **không có trong map → rơi xuống 500**. Phải thêm mapping (§6) — KHÔNG tạo ExceptionMapper riêng vì mapper Throwable sẽ nuốt trước.
- `AuditLogService` ([audit/](../../backend/src/main/java/com/walletledger/audit/)): `performed_by` đang hardcode `"system"` → Phase E lấy từ JWT principal.

---

## E1 — Migration: thêm cột auth vào `users`

**File:** `backend/src/main/resources/db/migration/V10__add_user_auth.sql`

```sql
ALTER TABLE users
    ADD COLUMN password_hash VARCHAR(255),
    ADD COLUMN role          VARCHAR(32) NOT NULL DEFAULT 'USER',
    ADD COLUMN status         VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN last_login_at  TIMESTAMPTZ;

ALTER TABLE users
    ADD CONSTRAINT chk_users_role   CHECK (role   IN ('USER','ADMIN')),
    ADD CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE','SUSPENDED'));

CREATE INDEX idx_users_email ON users(email);
```

**Lưu ý:**
- `password_hash` **nullable** (không `NOT NULL`) — các user đã có trong DB (tạo qua API cũ) sẽ có `password_hash = NULL`; login phải reject NULL hash (coi như chưa set password). Tránh việc migration fail vì NOT NULL trên rows cũ.
- `email` đã UNIQUE từ V1; index thêm chỉ tăng tốc lookup login.
- bcrypt cost factor 12 (set ở code, không ở schema).

**AC:** Migration chạy sạch trên DB hiện có; rows cũ nhận `role=USER, status=ACTIVE, password_hash=NULL`.

> Seed 1 admin đầu tiên: vì chưa có admin nào, hoặc (a) thêm `INSERT ... ON CONFLICT` seed 1 user `role=ADMIN` với bcrypt hash cho sẵn trong V10, hoặc (b) promote thủ công bằng `UPDATE users SET role='ADMIN' WHERE email=...` sau register. Chọn (a) cho dev tiện test endpoint admin.

---

## E2 — User entity update

Thêm vào [`User.java`](../../backend/src/main/java/com/walletledger/user/User.java):

```java
@Column(name = "password_hash")
public String passwordHash;          // bcrypt; nullable cho user cũ

@Column(nullable = false, length = 32)
public String role = "USER";

@Column(nullable = false, length = 32)
public String status = "ACTIVE";

@Column(name = "last_login_at")
public Instant lastLoginAt;
```

**Bắt buộc:** `passwordHash` **không được expose** qua bất kỳ DTO nào (`MeResponse`, `WalletResponse`...). Chỉ dùng nội bộ trong `AuthService`.

---

## E3 — Dependencies (`backend/pom.xml`)

```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-smallrye-jwt</artifactId>          <!-- verify -->
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-smallrye-jwt-build</artifactId>     <!-- issue tokens -->
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-elytron-security-common</artifactId> <!-- BcryptUtil -->
</dependency>
```

---

## E4 — RSA keys & config (⚠️ security-sensitive)

**Sinh keypair (1 lần):**
```bash
openssl genrsa -out backend/src/main/resources/privateKey.pem 2048
openssl rsa -in backend/src/main/resources/privateKey.pem -pubout \
    -out backend/src/main/resources/publicKey.pem
```

**Đặt keys ở classpath root `src/main/resources/`, KHÔNG ở `META-INF/resources/`**
(thư mục đó là static web root → file sẽ bị tải công khai qua HTTP).

`.gitignore`: thêm `backend/src/main/resources/privateKey.pem`. Public key có thể commit; private key load qua env/secret ở prod.

**`application.properties`:**
```properties
mp.jwt.verify.publickey.location=publicKey.pem
mp.jwt.verify.issuer=wallet-ledger
smallrye.jwt.sign.key.location=privateKey.pem
```

**`application-test.properties`:** cho phép dùng cùng cặp key dev (commit private key *chỉ* cho test profile, hoặc sinh cặp riêng trong `src/test/resources/`). Test phải verify được token nó tự issue.

---

## E4.5 — Login rate-limiting (in-memory ở phase này)

> Chốt 2026-06-18: dùng in-memory counter, **chưa cần Redis** ở Phase E. Backend hiện chạy single
> instance nên in-memory là đủ. Khi scale nhiều instance / cần persistence → chuyển Redis (note ở Rủi ro).

**`auth/LoginRateLimiter.java`** (`@ApplicationScoped`):
```java
// Map<ip, window> với fixed-window 60s, tối đa N lần. Dùng ConcurrentHashMap.
private record Window(long startEpochSec, int count) {}
private final ConcurrentHashMap<String, Window> attempts = new ConcurrentHashMap<>();
// compute(): nếu window hết hạn (now - start >= 60s) → reset count=1;
// ngược lại count++. count > MAX → ném RateLimitedException (429).
```
- `MAX_ATTEMPTS = 10` / 60s / IP (config qua `@ConfigProperty`, default 10).
- IP lấy từ `X-Forwarded-For` (sau proxy) fallback `RoutingContext` remote address.
- Reset (xoá entry) khi login **thành công**, để không phạt user gõ đúng sau vài lần sai.
- **Không** rate-limit theo username/email (tránh user enumeration + tránh kẻ xấu khoá account người khác). Chỉ theo IP.
- Dọn entry hết hạn: lazy (kiểm tra khi truy cập) là đủ cho MVP; không cần scheduled cleanup.
- ⚠️ State mất khi restart và **không chia sẻ giữa instance** — chấp nhận cho single-instance MVP.

**Exception:** `RateLimitedException` → map 429 trong `GlobalExceptionMapper` (xem E7).

---

## E5 — Package `com.walletledger.auth`

**`auth/AuthResource.java`** — `@Path("/api/v1/auth")`
- `POST /register` `@PermitAll` — `RegisterRequest` → 201 + `TokenResponse`.
- `POST /login` `@PermitAll` — `LoginRequest` → 200 + `TokenResponse`.
- `GET /me` `@RolesAllowed({"USER","OPERATOR","ADMIN"})` — đọc `JsonWebToken` → `MeResponse`.

**`auth/AuthService.java`** (`@RequiredArgsConstructor`, `private final UserRepository`):
- `register`: check trùng email/username → 409 `IdempotencyConflict`-style? không — dùng `ClientErrorException(409)`. Hash bcrypt cost 12, insert role=`USER`, status=`ACTIVE`, issue JWT.
- `login`: load theo email **hoặc** username. Verify `BcryptUtil.matches`. **Reject nếu `passwordHash == null`** (user cũ chưa set pw) hoặc `status=SUSPENDED` (→ 403). Cập nhật `lastLoginAt`. Issue JWT.
- **Không leak** "email không tồn tại" vs "sai mật khẩu" — cùng 1 message + cùng status (401).
- Issue JWT: `Jwt.issuer("wallet-ledger").subject(user.id.toString()).upn(username).groups(Set.of(role)).claim("email", email).expiresIn(Duration.ofHours(1)).sign()`.

**`auth/PasswordHasher.java`** — wrapper quanh `BcryptUtil` (cost 12) để dễ test/đổi.

**`auth/dto/`** (Java records, `@Valid`):
- `RegisterRequest(@NotBlank @Size(min=3,max=64) String username, @Email @NotBlank String email, @NotBlank @Size(min=8) String password)`
- `LoginRequest(@NotBlank String usernameOrEmail, @NotBlank String password)`
- `TokenResponse(String accessToken, String tokenType, long expiresIn)` — `tokenType="Bearer"`
- `MeResponse(UUID id, String username, String email, String role)`

**Rate-limit login:** gọi `LoginRateLimiter` (in-memory) ở đầu `POST /login` — xem §E4.5.

**Security:** không log password/token/hash; chỉ parameterized queries (Panache).

---

## E6 — Authorization + BOLA enforcement (critical)

### 6.1 SecurityContext helper
`auth/CurrentUser.java` (`@RequestScoped`, inject `JsonWebToken jwt`):
```java
public UUID id()      { return UUID.fromString(jwt.getSubject()); }
public boolean isAdmin() { return jwt.getGroups().contains("ADMIN"); }
```
Inject `CurrentUser` vào `WalletService` (constructor — `private final`, đúng rule no field injection).

### 6.2 BOLA trong `WalletService`
```java
private void assertOwnership(Wallet w) {
    if (currentUser.isAdmin()) return;
    if (!w.userId.equals(currentUser.id()))
        throw new ForbiddenException("Wallet does not belong to caller");
}
```
- `topUp()`: assert sau khi load wallet, trước mọi mutation.
- `transfer()`: assert ownership **source wallet** (nhận tiền từ ai cũng được; destination chỉ cần tồn tại).
- `getWallet()`, `getEntries()`, `stream()`: assert trước khi trả data.

### 6.3 `@RolesAllowed` trên endpoints — bảng đầy đủ (đã rà soát toàn bộ resources)

| Endpoint | Annotation | Ghi chú |
|---|---|---|
| `POST /auth/register`, `/login` | `@PermitAll` | |
| `GET /auth/me` | `USER,ADMIN` | |
| `GET /wallets` (list-all), `GET /wallets/stats` | `ADMIN` | dữ liệu toàn hệ thống |
| `POST /wallets` (create) | `ADMIN` | tạo wallet cho user |
| `GET /wallets/{id}`, `/{id}/entries`, `/{id}/stream` | `USER,ADMIN` + BOLA | owner hoặc admin |
| `POST /wallets/top-up`, `/transfer` | `USER,ADMIN` + BOLA | bỏ `@HeaderParam X-User-Id` |
| `POST /wallets/{id}/freeze`, `/unfreeze` | `ADMIN` | hành chính |
| `GET /wallets/recent-recipients` | `USER,ADMIN` | bỏ `userId` query, lấy từ JWT |
| **`GET /me/wallets`** (mới, E4 frontend-plan) | `USER` | self-scoped, lấy `findByUserId(jwt.sub)` |
| **`GET /me/transactions`** (mới) | `USER` | self-scoped history |
| `GET /ledger/transactions`, `POST /ledger/reversal` | `ADMIN` | toàn ledger |
| `POST /statements/**`, `GET /statements/**` | `ADMIN` | reconciliation admin |
| `GET /payment/events` | `ADMIN` | |
| `POST /payment/webhook` | `@PermitAll` | ⚠️ **KHÔNG** gắn `@RolesAllowed`; giữ verify HMAC signature. |

**Refactor bắt buộc:** xoá tham số `@HeaderParam("X-User-Id") UUID callerId` và method `assertOwner` khỏi `WalletResource`; bỏ `userId` query param ở `recent-recipients` (lấy từ JWT). Front-end sẽ ngừng gửi header `X-User-Id`.

### 6.4 Audit principal
`AuditLogService`: thay `performed_by="system"` bằng `currentUser.id().toString()` cho action do user gây ra; giữ `"system"` cho job nền (scheduled reconciliation, webhook processor — không có JWT context).

---

## E7 — Exception mapping (sửa GlobalExceptionMapper, KHÔNG thêm mapper mới)

Thêm vào `ERRORS` map trong [`GlobalExceptionMapper`](../../backend/src/main/java/com/walletledger/shared/error/GlobalExceptionMapper.java):
```java
NotAuthorizedException.class, new ErrorDef(401, "Unauthorized"),
ForbiddenException.class,     new ErrorDef(403, "Forbidden"),
```
Và rate-limit (E4.5): thêm `RateLimitedException.class, new ErrorDef(429, "Too Many Requests")` (tạo `RateLimitedException` trong `shared/exception/`) để giữ problem+json đồng nhất.
- Token thiếu/expired/invalid: Quarkus security ném `UnauthorizedException`/trả 401 trước khi tới mapper với header `WWW-Authenticate` — verify trong test, thêm mapping nếu cần.
- Giữ nguyên RFC-7807 `application/problem+json`.

---

## E8 — Tests (Testcontainers, bắt buộc)

1. **`AuthResourceTest`**
   - register → 201; response **không chứa** `passwordHash`.
   - register trùng username/email → 409.
   - login đúng → 200 + token decodable bằng public key, claims `sub/upn/groups/email` đúng.
   - login sai pw / email không tồn tại → 401 **cùng message**.
   - login user `status=SUSPENDED` → 403.
   - login user `password_hash=NULL` (user cũ) → 401.
2. **`WalletAuthorizationTest` (BOLA — bắt buộc theo CLAUDE.md & DoD)**
   - User A & B; tạo wallet cho A.
   - B `top-up`/`transfer-from`/`GET` wallet của A → **403**.
   - A thao tác chính wallet của mình → 200.
   - ADMIN truy cập mọi wallet → 200.
   - Không có token trên endpoint protected → **401**.
   - USER gọi endpoint admin-only (vd `GET /ledger/transactions`) → **403**.
3. **`LoginRateLimiterTest`** (unit, không cần container)
   - Gọi `/login` sai pw > MAX_ATTEMPTS lần từ cùng IP → **429**.
   - Login thành công reset counter (không bị 429 ngay sau đó).
4. **Idempotency tests hiện có:** thêm header `Authorization: Bearer`; assert behavior idempotent không đổi (gọi 2 lần cùng key → state không đổi).
5. **Concurrency:** 2 thread top-up cùng wallet với token hợp lệ → vẫn đúng (JWT stateless, không tạo session conflict); tái dùng `WalletTopUpTest` concurrent có auth.

**Definition of Done:** `cd backend && ./mvnw verify` pass (gồm test auth mới); `cd frontend && npm run build` pass. (Không dùng `tsc -b` — sinh .js cạnh .ts, xem memory.)

---

## E9 — Cleanup & docs

- `CLAUDE.md` Security bullet: thêm "Mọi endpoint mutating phải `@RolesAllowed` + check ownership trong service layer; webhook giữ HMAC, không JWT."
- `ERD_AND_PLAN.md`: thêm section Auth (role/JWT/claims).
- README: hướng dẫn sinh RSA keypair dev.
- `STATUS.md`: đánh dấu Phase E backend ✅ khi xong.

---

## Thứ tự thực thi đề xuất

E1 → E2 → E3+E4 (deps & keys) → E4.5 (in-memory rate-limiter) → E5 (auth endpoints, test register/login trước) → E7 (exception mapping) → E6 (bật `@RolesAllowed` + BOLA toàn bộ — **làm cuối** vì sẽ khoá hết endpoint, dễ vỡ test cũ) → E8 (tests) → E9.

Backend (E1–E8) phải xong & xanh **trước khi** chạm frontend E6–E9 của `PHASE_E_user_facing.md` — không ship UI lên trên auth chưa enforce.

## Rủi ro / lưu ý

- **Key rotation:** Phase này dùng PEM static. Note chuyển JWKS endpoint sau.
- **Refresh token:** chưa làm; access token 1h, hết hạn re-login.
- **User cũ trong DB:** `password_hash=NULL` → không login được tới khi set pw (chấp nhận cho MVP; hoặc thêm flow set-password).
- **Webhook:** tuyệt đối không gắn `@RolesAllowed` lên `/payment/webhook`.
- **Scheduled jobs** (reconciliation, payment processor) chạy ngoài request context → không có JWT; audit principal = `"system"`.
- **Rate-limit in-memory:** chỉ đúng cho single-instance, mất state khi restart. Khi scale ngang hoặc cần persistence → chuyển sang Redis (đổi mình `LoginRateLimiter`, các chỗ khác giữ nguyên).
