# Phase E — Tiến độ (handoff)

> Cập nhật: 2026-06-19. Branch: **`feat/phase-e-auth`** — S0–S7 ĐÃ XONG & commit (chưa push, chưa mở PR).
> Plan: [`PHASE_E_auth_backend.md`](PHASE_E_auth_backend.md) + runbook [`PHASE_E_execution_runbook.md`](PHASE_E_execution_runbook.md).
>
> **Trạng thái: HOÀN THÀNH.** Backend `./mvnw test` 44/44; frontend `tsc --noEmit` + `vite build` sạch.
> Commits: `a648768` (backend S0–S5), `5ab73c3` (frontend S6), + commit docs S7.
> Việc còn lại tùy chọn: push branch + mở PR; smoke test e2e thủ công (boot full stack);
> verify runtime `curl -i /privateKey.pem` → 404 (đã đảm bảo về cấu trúc: key ở classpath root).

## Đã xong (code)

- **S0** ✅ branch tạo; pom.xml thêm `quarkus-smallrye-jwt`, `-jwt-build`, `quarkus-elytron-security-common`;
  RSA keypair sinh tại `backend/src/main/resources/{privateKey,publicKey}.pem`;
  `.gitignore` ignore privateKey + exception cho publicKey; config JWT trong `application.properties`. Compile OK.
- **S1** ✅ `V10__add_user_auth.sql` (password_hash nullable, role/status + CHECK, index email, seed admin
  `admin@walletledger.local` / `Admin@12345`, bcrypt $2a$ cost 12). `User.java` thêm 4 field.
- **S2** ✅ package `auth/`: `PasswordHasher` (bcrypt 12), `LoginRateLimiter` (in-memory, 10/60s/IP),
  `AuthService` (register/login, JWT issuer `wallet-ledger`, 1h, không leak lý do sai), `AuthResource`
  (`/register`, `/login` @PermitAll; `/me`). DTOs. `RateLimitedException` trong `shared/exception/`.
  `UserRepository` thêm `findByUsernameOrEmail` + `existsByUsernameOrEmail`.
- **S3** ✅ `GlobalExceptionMapper`: thêm `RateLimitedException→429` + fallback theo status của
  `WebApplicationException` (cover 401/403/409). Compile OK.
- **S4** ✅ `CurrentUser` (@RequestScoped, `id()/isAdmin()/principalName()`). `WalletService` inject CurrentUser,
  `assertOwnership()` gọi ở topUp (2 nhánh) + transfer (source); 6 audit call truyền principal.
  `@RolesAllowed` đã gắn: WalletResource (ADMIN cho list/stats/create/freeze/unfreeze; USER,ADMIN+BOLA cho
  get/entries/top-up/transfer/recent-recipients/stream; USER cho /me, /me/transactions),
  LedgerResource (class ADMIN), StatementResource (class ADMIN), PaymentResource (webhook @PermitAll, events ADMIN),
  UserResource (class ADMIN). Bỏ `X-User-Id` + `assertOwner` cũ. Thêm `GET /wallets/me`, `/wallets/me/transactions`
  (+ `LedgerEntryRepository.findByUserId`). Compile OK.
- **S5** 🟡 GẦN XONG. Đã viết: `AuthResourceTest`, `WalletAuthorizationTest`, `LoginRateLimiterTest`;
  cập nhật `WalletTopUpTest`/`WalletTransferTest` (USER token), `LedgerReversalTest` (ADMIN token) qua
  `RestAssured.requestSpecification` + `@AfterEach` reset; helper `TestAuth`; `WalletServiceTest` thêm
  `@InjectMock CurrentUser` stub `isAdmin()=true`.
  - Lần chạy gần nhất: **40/44 pass**. 4 lỗi đều là `WalletAuthorizationTest.setup` (xoá wallet trước
    snapshots → FK violation). **ĐÃ SỬA** cleanup (xoá snapshots/entries/tx trước) nhưng **CHƯA chạy lại verify**.

## VIỆC TIẾP THEO (mai)

1. **Chạy lại test** (việc đang dở): `cd backend && ./mvnw test` — kỳ vọng 44/44 xanh.
   Nếu còn đỏ, xem `target/surefire-reports`.
2. Nếu xanh → **commit S0–S5** trên branch `feat/phase-e-auth`.
3. Verify thủ công nhanh (runbook DoD): chạy app, `curl -i localhost:8888/privateKey.pem` phải **404**;
   `grep -rn "X-User-Id" backend/` phải rỗng (đã bỏ); thử register/login/me.
4. **S6 — Frontend** (E6–E9 của `PHASE_E_user_facing.md`): login/register page, `useAuth`, attach
   `Authorization: Bearer`, bỏ gửi `X-User-Id`, ProtectedRoute, dashboard/send/history. `npm run build`.
5. **S7 — docs**: cập nhật CLAUDE.md (security rule), ERD_AND_PLAN (section Auth), README (sinh keypair),
   STATUS.md (Phase E ✅).

## Lưu ý / gotcha đã gặp
- Test dùng Quarkus dev-services → cần Docker daemon (đã có).
- Private key có trên test classpath nên `TestAuth` mint được JWT thật (sign bằng cùng key).
- `WalletServiceTest` gọi service ngoài request scope → bắt buộc mock `CurrentUser` (không có JWT context).
- Seed admin password `Admin@12345` (hash $2a$ để khớp Elytron `BcryptUtil`).
