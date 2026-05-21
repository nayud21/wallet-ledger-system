# Auth — Future Implementation Notes

## Current State (Mock Login)

Login hiện tại là **mock**: user nhập UUID, frontend gọi `GET /api/v1/users/{id}` để xác nhận tồn tại, rồi lưu `{ id, username, email }` vào `localStorage`. Không có password, không có token, không có session expiry.

**Nằm ở:**
- `frontend/src/context/AuthContext.tsx` — lưu user vào state + localStorage
- `frontend/src/pages/LoginPage.tsx` — form nhập userId
- `frontend/src/components/layout/TopBar.tsx` — hiển thị username + logout

---

## Những gì cần làm khi triển khai Auth thật

### 1. Backend — JWT / Session

**Lựa chọn A: JWT (stateless)**
- Thêm endpoint `POST /api/v1/auth/login` — nhận `{ username, password }`, trả `{ accessToken, refreshToken, expiresIn }`.
- Dùng `quarkus-smallrye-jwt` hoặc `quarkus-oidc`.
- Access token ngắn hạn (15 phút), refresh token dài hạn (7 ngày) lưu ở `HttpOnly` cookie.
- Bảo vệ tất cả endpoint với `@RolesAllowed` hoặc `@Authenticated`.

**Lựa chọn B: OIDC / OAuth2 (delegate)**
- Dùng Keycloak, Auth0, hoặc Google.
- `quarkus-oidc` tích hợp sẵn, ít code hơn, phù hợp production.

### 2. Password Storage
- Hash bằng **bcrypt** (work factor ≥ 12) hoặc **Argon2id**.
- Thêm cột `password_hash VARCHAR(256)` vào bảng `users` qua migration mới.
- Không lưu plaintext, không log password.

### 3. Frontend — Token Management
- Thay `localStorage` bằng `HttpOnly` cookie cho refresh token (không bị XSS đọc).
- Access token lưu trong memory (React state), không trong localStorage (XSS risk).
- Thêm Axios/fetch interceptor để tự refresh token khi 401.
- `AuthContext` cần thêm: `accessToken`, `refreshToken()`, `isLoading`.

### 4. API Client — Authorization Header
```ts
// client.ts
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`,
  ...options?.headers,
}
```

### 5. BOLA — Scoped Endpoints
- Sau khi có auth thật, `GET /api/v1/wallets` phải filter theo user từ JWT claim, không từ query param `?userId=`.
- Backend đọc `@Context SecurityContext` hoặc `@Claim("sub")` thay vì tin vào header/param từ client.
- Xóa `X-User-Id` header workaround hiện tại.

### 6. Rate Limiting — Login Endpoint
- Chống brute force: max 5 attempts / IP / 15 phút.
- Có thể dùng `quarkus-rate-limiter` hoặc Nginx/gateway-level.

### 7. Migration checklist khi chuyển sang auth thật
- [ ] Thêm `password_hash` column (Flyway migration)
- [ ] `POST /api/v1/auth/login` + `POST /api/v1/auth/refresh` + `POST /api/v1/auth/logout`
- [ ] Bảo vệ tất cả `/api/v1/**` trừ `/auth/**` và `/q/**`
- [ ] Cập nhật `AuthContext` để dùng token thay userId
- [ ] Cập nhật `apiFetch` để đính kèm Bearer token
- [ ] Xóa mock notice trong `LoginPage`
- [ ] Cập nhật `LoginPage` form: email/password thay vì UUID

### 8. Tham khảo
- [Quarkus Security JWT](https://quarkus.io/guides/security-jwt)
- [Quarkus OIDC](https://quarkus.io/guides/security-oidc-bearer-token-authentication)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
