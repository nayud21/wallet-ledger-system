# Phase E — Runbook thực thi (step-by-step)

> Kèm theo plan kỹ thuật chính thức [`PHASE_E_auth_backend.md`](PHASE_E_auth_backend.md) (backend) và
> [`PHASE_E_user_facing.md`](PHASE_E_user_facing.md) (frontend E6–E9). Doc này là **trình tự thi công**:
> làm gì trước–sau, output mỗi bước, và cách tự kiểm.
> Created 2026-06-18. Roles: **USER / ADMIN**. Rate-limit: **in-memory**.

---

## 0. Nguyên tắc thi công

- Mỗi giai đoạn (S0–S6) là **1 commit độc lập, build/test xanh** trước khi sang giai đoạn sau.
- Branch: `feat/phase-e-auth` (không làm trực tiếp trên `main`).
- "Làm `@RolesAllowed` cuối cùng" (S4) — vì bật security sẽ khoá hết endpoint và làm vỡ test cũ; phải có auth chạy được trước.
- Sau mỗi giai đoạn backend: `cd backend && ./mvnw test`. Sau frontend: `cd frontend && npm run build`.

---

## 1. Lộ trình thực hiện

### S0 — Chuẩn bị (không đụng business logic)
| Task | Output mong đợi |
|---|---|
| Tạo branch `feat/phase-e-auth` | branch checked out |
| Thêm 3 deps vào `backend/pom.xml` (smallrye-jwt, smallrye-jwt-build, elytron-security-common) | `./mvnw quarkus:dev` vẫn khởi động được |
| Sinh RSA keypair vào `backend/src/main/resources/` + thêm `privateKey.pem` vào `.gitignore` | 2 file `.pem` tồn tại; `git status` KHÔNG thấy privateKey |
| Thêm config JWT vào `application.properties` + `application-test.properties` | app khởi động, log không lỗi cấu hình JWT |

**Tự kiểm:** `git check-ignore backend/src/main/resources/privateKey.pem` → in ra path (đã ignore). `curl localhost:8080/q/health` OK.

### S1 — Schema & entity (E1, E2)
| Task | Output |
|---|---|
| Tạo `V10__add_user_auth.sql` (cột password_hash nullable, role, status, last_login_at, 2 CHECK, index email, seed 1 admin) | migration mới, **không** sửa V1–V9 |
| Update `User.java` thêm 4 field, `passwordHash` không expose | entity compile |
| Khởi động app cho Flyway chạy V10 | log Flyway `Migrating ... V10`; `\d users` thấy cột mới |

**Tự kiểm:** kết nối DB (`localhost:5435`), `SELECT role, status FROM users LIMIT 5;` → rows cũ = `USER/ACTIVE`. Seed admin tồn tại.

### S2 — Auth endpoints + rate limiter (E3 còn lại, E4.5, E5)
| Task | Output |
|---|---|
| `auth/PasswordHasher.java` (bcrypt cost 12) | unit test hash/verify pass |
| `auth/LoginRateLimiter.java` (in-memory, 10/60s/IP) | unit test 429 sau ngưỡng |
| `auth/dto/` 4 records (Register/Login/Token/Me) với `@Valid` | compile |
| `auth/AuthService.java` (register/login, issue JWT, không leak lý do sai) | — |
| `auth/AuthResource.java` (`/register`, `/login` `@PermitAll`; `/me`) | — |
| `RateLimitedException` trong `shared/exception/` | — |

**Output giai đoạn:** đăng ký + đăng nhập chạy, **chưa bật** authorization toàn cục.
**Tự kiểm (manual qua curl/Swagger):**
```
POST /api/v1/auth/register {username,email,password} → 201 + token, response KHÔNG có passwordHash
POST /api/v1/auth/login (đúng) → 200 + token; (sai) → 401 cùng message
GET  /api/v1/auth/me  (Bearer token) → 200, claims đúng
login sai > 10 lần/phút → 429
```

### S3 — Exception mapping (E7)
| Task | Output |
|---|---|
| Thêm `NotAuthorizedException→401`, `ForbiddenException→403`, `RateLimitedException→429` vào `ERRORS` map của `GlobalExceptionMapper` | 403/401 trả problem+json đúng status (không còn 500) |

**Tự kiểm:** ném thử `ForbiddenException` từ 1 endpoint tạm → nhận 403 (không phải 500). Xoá code thử.

### S4 — Bật authorization + BOLA (E6) ⚠️ giai đoạn rủi ro nhất
| Task | Output |
|---|---|
| `auth/CurrentUser.java` (`@RequestScoped`, `id()`, `isAdmin()`) | — |
| Inject `CurrentUser` vào `WalletService` (constructor) | — |
| `assertOwnership()` + gắn vào topUp/transfer(source)/getWallet/getEntries/stream | — |
| Gắn `@RolesAllowed` theo bảng E6.3 lên TẤT CẢ resource (wallet/ledger/statement/payment) | — |
| **Bỏ** `@HeaderParam("X-User-Id")` + method `assertOwner` cũ khỏi `WalletResource`; bỏ `userId` query ở `recent-recipients` | grep `X-User-Id` trong backend = rỗng |
| `/payment/webhook` giữ `@PermitAll` (KHÔNG `@RolesAllowed`) | — |
| `AuditLogService`: principal = `currentUser.id()` cho action user; `"system"` cho job nền | — |
| Thêm endpoint `GET /me/wallets`, `GET /me/transactions` (USER) | — |

**Tự kiểm:** mọi endpoint protected không token → 401; webhook không token → vẫn 200.

### S5 — Tests (E8)
| Task | Output |
|---|---|
| `AuthResourceTest` (register/login/me/suspended/null-hash/duplicate) | pass |
| `WalletAuthorizationTest` (BOLA A↔B 403, admin bypass, no-token 401, user gọi admin-only 403) | pass |
| `LoginRateLimiterTest` (unit, 429 + reset) | pass |
| Cập nhật idempotency tests cũ: thêm `Authorization` header | pass |
| Cập nhật concurrency test (`WalletTopUpTest`) có auth | pass |

**Tự kiểm:** `cd backend && ./mvnw verify` xanh toàn bộ.

### S6 — Frontend (E6–E9 của `PHASE_E_user_facing.md`)
Chỉ bắt đầu khi S0–S5 xanh. Login/Register page, `useAuth`, attach `Authorization` header, `ProtectedRoute`, dashboard, send-money, history. Bỏ gửi header `X-User-Id`.
**Tự kiểm:** `cd frontend && npm run build` pass; đăng nhập → xem ví của mình; thử gọi ví người khác → 403.

### S7 — Docs & cleanup (E9)
Cập nhật `CLAUDE.md` (security rule), `ERD_AND_PLAN.md` (section Auth), `README` (sinh keypair), `STATUS.md` (Phase E ✅).

---

## 2. Checkbox điều kiện tiên quyết (làm TRƯỚC khi code)

- [ ] `docker-compose up -d` chạy, Postgres healthy ở `localhost:5435`.
- [ ] `cd backend && ./mvnw test` **xanh ở trạng thái hiện tại** (baseline sạch — để biết test nào vỡ là do mình).
- [ ] `cd frontend && npm install && npm run build` pass ở baseline.
- [ ] Đã đọc `PHASE_E_auth_backend.md` (plan kỹ thuật) + bảng `@RolesAllowed` E6.3.
- [ ] Xác nhận migration kế tiếp là **V10** (`ls backend/src/main/resources/db/migration/` → cao nhất là V9).
- [ ] Có `openssl` để sinh RSA keypair.
- [ ] Đã tạo branch `feat/phase-e-auth`, không commit lên `main`.
- [ ] Xác nhận quyết định: **2 role USER/ADMIN**, rate-limit **in-memory**, private key đặt ở `src/main/resources/` (KHÔNG `META-INF/resources/`).
- [ ] Biết cách lấy 1 JWT hợp lệ để test thủ công (Swagger `/auth/login` hoặc curl).

---

## 3. Rủi ro / sai sót phổ biến & cách khắc phục

### R1 — Private key bị web-serve công khai (lỗ hổng nghiêm trọng)
**Triệu chứng:** đặt key vào `src/main/resources/META-INF/resources/` → tải được tại `http://localhost:8080/privateKey.pem`.
**Khắc phục:** đặt key ở `src/main/resources/` (classpath root, KHÔNG web root). Config trỏ `privateKey.pem` (relative classpath). **Verify bắt buộc:** `curl -i http://localhost:8080/privateKey.pem` phải trả **404**. Thêm `privateKey.pem` vào `.gitignore` và kiểm `git status` không thấy nó.

### R2 — `GlobalExceptionMapper<Throwable>` nuốt 401/403 → trả 500
**Triệu chứng:** BOLA fail trả 500 thay vì 403; client không phân biệt được "cấm" và "lỗi server".
**Nguyên nhân:** mapper là `ExceptionMapper<Throwable>`, bắt mọi exception trước; `ForbiddenException` không có trong `ERRORS` → rơi default 500.
**Khắc phục:** làm **S3 trước S4** — thêm 401/403/429 vào `ERRORS` map. Đừng tạo `ExceptionMapper` riêng (mapper Throwable ưu tiên hơn, sẽ chặn). Test xác nhận status đúng.

### R3 — Bật `@RolesAllowed` làm vỡ hàng loạt test/endpoint cũ
**Triệu chứng:** sau S4, idempotency/concurrency test cũ trả 401; frontend trắng màn vì mọi call 401.
**Khắc phục:** (a) làm S4 **sau** khi auth chạy được (S2) và mapping xong (S3); (b) cập nhật test cũ thêm `Authorization` header **trong cùng commit S4/S5**; (c) frontend bỏ `X-User-Id`, thêm Bearer **cùng đợt**; (d) chạy `./mvnw test` ngay sau S4 để khoanh vùng test vỡ.

### R4 — Migration fail vì `password_hash NOT NULL` trên rows cũ / sai số thứ tự
**Triệu chứng:** Flyway lỗi `column "password_hash" contains null values`, hoặc trùng số V9.
**Khắc phục:** `password_hash` để **nullable** (login reject NULL hash thay vì DB ép NOT NULL). Đặt tên đúng **V10**. Tuyệt đối **không sửa** migration đã commit. Nếu lỡ chạy sai trên DB dev: `docker-compose down -v` để reset volume rồi chạy lại (chỉ dev data).

### R5 — Rò rỉ thông tin / BOLA sót
**Triệu chứng:** login trả message khác nhau cho "email sai" vs "mật khẩu sai" (→ user enumeration); transfer kiểm sai phía ví; `passwordHash` lọt ra DTO; rate-limit theo username (kẻ xấu khoá account người khác).
**Khắc phục:** login luôn cùng message + status 401; `assertOwnership` chỉ trên **source** wallet ở transfer (nhận tiền từ ai cũng được); rà soát mọi DTO không chứa `passwordHash`; rate-limit chỉ theo **IP**. `WalletAuthorizationTest` phải cover các case này.

---

## 4. Tiêu chí nghiệm thu (Definition of Done)

### Bắt buộc — build/test
- [ ] `cd backend && ./mvnw verify` xanh (gồm `AuthResourceTest`, `WalletAuthorizationTest`, `LoginRateLimiterTest` mới + test cũ đã thêm auth).
- [ ] `cd frontend && npm run build` pass (KHÔNG dùng `tsc -b` — sinh .js cạnh .ts).

### Bắt buộc — bảo mật (OWASP / CLAUDE.md)
- [ ] **BOLA:** đăng nhập user A, gọi GET/top-up/transfer-from ví của user B → **403**; chính ví mình → 200; ADMIN truy cập mọi ví → 200.
- [ ] Endpoint protected không token → **401**; USER gọi endpoint admin-only → **403**.
- [ ] `curl http://localhost:8080/privateKey.pem` → **404** (key không bị web-serve).
- [ ] `grep -rn "X-User-Id" backend/` → rỗng (đã bỏ header trust cũ).
- [ ] Response của register/login/me/wallet **không chứa** `passwordHash`.
- [ ] Login email-sai và mật-khẩu-sai trả **cùng message + 401**.
- [ ] `/api/v1/payment/webhook` vẫn nhận được không cần JWT (giữ HMAC).
- [ ] Login sai > ngưỡng/phút/IP → **429**; login đúng reset counter.

### Bắt buộc — chức năng
- [ ] Migration V10 chạy sạch; rows cũ = `role=USER, status=ACTIVE`; có seed admin.
- [ ] JWT claims đúng: `sub`=userId, `upn`=username, `groups`=[role], `email`, `exp`≈1h.
- [ ] `GET /me/wallets` chỉ trả ví của chính user; `GET /me/transactions` chỉ trả lịch sử của user.
- [ ] Mọi endpoint mutating vẫn yêu cầu `idempotencyKey`; gọi 2 lần cùng key → state không đổi (đã test có auth).
- [ ] `audit_logs.performed_by` = userId cho action do user gây ra; `"system"` cho job nền.

### Bắt buộc — docs & vệ sinh
- [ ] `CLAUDE.md`, `ERD_AND_PLAN.md`, `README`, `STATUS.md` đã cập nhật.
- [ ] `privateKey.pem` không nằm trong git; public key commit OK.
- [ ] Không còn code/endpoint thử nghiệm tạm (vd đoạn test ForbiddenException ở S3).
