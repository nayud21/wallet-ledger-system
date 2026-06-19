# Project Status — Wallet Ledger System

> Last updated: 2026-06-19

## Tổng quan phase

| Phase | Nội dung | Trạng thái |
|---|---|---|
| **A** | Core ledger: top-up / transfer / reversal | ✅ Hoàn thành |
| **B** | Webhook inbox + audit log + idempotency hardening | ✅ Hoàn thành |
| **C** | Reconciliation engine & jobs | ✅ Hoàn thành |
| **E** | JWT auth + user-facing app | ✅ Hoàn thành (branch `feat/phase-e-auth`) |

> Auth đã dùng **JWT (SmallRye, RSA self-issued)** với 2 role `USER`/`ADMIN`. BOLA enforce ở service layer
> (`WalletService.assertOwnership`), `@RolesAllowed` trên mọi resource, webhook giữ `@PermitAll`.
> Header `X-User-Id` cũ đã bị loại bỏ hoàn toàn. Chi tiết: [`docs/plans/PHASE_E_auth_backend.md`](plans/PHASE_E_auth_backend.md).
> Bootstrap admin (dev): `admin@walletledger.local` / `Admin@12345`.

---

## Môi trường chạy

| Service | URL | Ghi chú |
|---|---|---|
| Backend (Quarkus dev) | `http://localhost:8888` | `cd backend && ./mvnw quarkus:dev` |
| Frontend (Vite) | `http://localhost:5173` | `cd frontend && npm run dev` |
| Swagger UI | `http://localhost:8888/q/swagger-ui` | |
| PostgreSQL | `localhost:5435` | `docker-compose up -d` |
| DB credentials | user/db: `walletledger` | password: `walletledger` |

Vite proxy `/api` → `http://localhost:8888` (cấu hình trong `vite.config.ts`).

---

## Phase A — HOÀN THÀNH ✅

### Backend — APIs implemented

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/api/v1/users` | Tạo user (bắt buộc trước khi tạo wallet) |
| `GET` | `/api/v1/wallets?userId=` | List tất cả wallet, filter theo userId |
| `POST` | `/api/v1/wallets` | Tạo wallet (tự tạo `LedgerAccount` kèm theo) |
| `GET` | `/api/v1/wallets/{id}` | Lấy chi tiết 1 wallet |
| `POST` | `/api/v1/wallets/top-up` | Nạp tiền (double-entry) |
| `POST` | `/api/v1/wallets/transfer` | Chuyển tiền giữa 2 wallet (double-entry) |
| `GET` | `/api/v1/wallets/{id}/entries` | Lấy ledger entries của wallet |
| `GET` | `/api/v1/ledger/transactions?page=&size=` | List ledger transactions (phân trang) |
| `POST` | `/api/v1/ledger/reversal` | Tạo reversal transaction (mirror entries) |

**Luồng double-entry:**
- Top-up: `DEBIT SETTLEMENT_ASSET` + `CREDIT wallet LIABILITY`
- Transfer: `DEBIT source LIABILITY` + `CREDIT target LIABILITY`
- Reversal: mirror ngược lại entries của transaction gốc

**Các rule đã enforce:**
- Idempotency: mỗi mutating endpoint nhận `idempotencyKey`, có UNIQUE constraint, duplicate call trả về kết quả gốc
- Concurrency: `SELECT ... FOR UPDATE` trên wallet, lock 2 wallet theo thứ tự UUID tăng dần (chống deadlock)
- Money: `BigDecimal` trong Java, `NUMERIC(19,4)` trong DB
- OWASP: `@Valid` validation tại REST boundary, basic BOLA check qua `X-User-Id` header

### Backend — Cấu trúc file quan trọng

```
backend/src/main/java/com/walletledger/
├── api/
│   ├── WalletResource.java       — 6 endpoints wallet
│   ├── LedgerResource.java       — 2 endpoints ledger
│   ├── UserResource.java
│   └── error/GlobalExceptionMapper.java  — RFC-7807 problem+json
├── domain/                        — JPA entities (Panache)
│   ├── Wallet.java
│   ├── LedgerAccount.java
│   ├── LedgerTransaction.java
│   ├── LedgerEntry.java
│   └── WalletBalanceSnapshot.java
├── dto/                           — Java records cho request/response
│   ├── PageResponse.java          — generic pagination wrapper
│   ├── LedgerEntryResponse.java
│   ├── LedgerTransactionResponse.java
│   └── ...
├── service/
│   ├── WalletService.java         — top-up, transfer logic
│   └── LedgerService.java         — reversal logic
└── repository/                    — Panache repositories
```

**Migrations:**
- `V1__init_schema.sql` — toàn bộ schema
- `V2__add_wallet_ledger_account.sql` — thêm `ledger_account_id` vào wallets + seed `SETTLEMENT_ASSET`
- `V3__char_to_varchar.sql` — fix currency column type
- `V4__add_request_hash.sql` — thêm `request_hash` cho idempotency conflict detection

### Backend — Tests

| File | Bao phủ |
|---|---|
| `WalletTopUpTest.java` | Top-up, idempotency, concurrent access |
| `WalletTransferTest.java` | Transfer, insufficient balance, concurrent |
| `LedgerReversalTest.java` | Reversal, double-reversal guard |
| `WalletServiceTest.java` | Unit tests service layer |
| `LedgerServiceTest.java` | Unit tests ledger service |

Chạy: `cd backend && ./mvnw test`

### Frontend — Cấu trúc component

```
frontend/src/
├── api/
│   ├── client.ts         — base fetch + error parsing (RFC-7807)
│   ├── wallets.ts        — fetchWallets, fetchWallet, fetchWalletEntries, topUpWallet, transferWallet, createWallet
│   └── ledger.ts         — fetchTransactions, postReversal
├── hooks/
│   ├── useWallets.ts     — useWallets, useWallet, useWalletEntries, useCreateWallet, useTopUp, useTransfer
│   └── useLedger.ts      — useTransactions, useReversal
├── types/api.ts           — tất cả TypeScript interfaces cho request/response
├── components/
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx   — w-56, gradient logo, 4 nav items + config section
│   │   └── TopBar.tsx    — breadcrumb bar
│   ├── ui/
│   │   ├── Badge.tsx     — tone: slate|green|red|amber|indigo, dot prop
│   │   ├── Button.tsx    — variant: primary|secondary|danger
│   │   ├── Modal.tsx
│   │   ├── Pagination.tsx
│   │   ├── CollapsiblePanel.tsx
│   │   └── Drawer.tsx    — 440px slide-in từ phải
│   ├── kpi/
│   │   └── KpiStrip.tsx  — 4-tile KPI grid (placeholder data)
│   ├── wallets/
│   │   ├── WalletTable.tsx   — danh sách wallet có select
│   │   ├── WalletDetail.tsx  — balance tiles + ledger entries
│   │   ├── TopUpForm.tsx     — form nạp tiền với idempotency key
│   │   └── TransferForm.tsx  — form chuyển tiền
│   ├── ledger/
│   │   ├── TransactionTable.tsx  — bảng ledger transactions + nút reverse
│   │   └── EntryList.tsx         — danh sách entries theo wallet
│   └── icons.tsx              — SVG icon components
└── pages/
    ├── WalletsPage.tsx    — trang chính wallets (list + detail + create)
    └── LedgerPage.tsx     — bảng transactions + modal reversal
```

### Frontend — Lưu ý quan trọng

- `useState<string>(crypto.randomUUID())` — phải explicit type `<string>` để TypeScript không bị lỗi template literal
- Sau top-up thành công, **`walletEntries` query KHÔNG tự invalidate** — cần thêm `qc.invalidateQueries({ queryKey: ['walletEntries', req.walletId] })` vào `useTopUp` nếu cần tự refresh
- `useWallet(id)` và `useWallets(userId)` dùng chung prefix `['wallets', ...]` — không xung đột vì value khác nhau

---

## Data hiện có trong DB (dev/test data)

> **Lưu ý:** Một số wallet có `available_balance > 0` nhưng `ledger_entries` trống — balance đó được set trực tiếp qua SQL test data cũ, không qua API. Đây là data inconsistency, không phải bug.

Để tạo data clean:
1. Tạo user: `POST /api/v1/users`
2. Tạo wallet với `userId` vừa tạo: `POST /api/v1/wallets`
3. Top-up qua UI hoặc API để sinh ra ledger entries

---

## Phase B — HOÀN THÀNH ✅

### 1. Webhook Inbox

Package [`payment/`](../backend/src/main/java/com/walletledger/payment/):
- `PaymentEvent` + `PaymentEventRepository` — lưu raw payload (`jsonb`) vào `payment_events`
- `POST /api/v1/payment/webhook` — trả `200 OK` ngay, persist raw payload
- `GET /api/v1/payment/events` — list events (phân trang)
- `PaymentEventProcessor` — `@Scheduled` worker xử lý events `PENDING → PROCESSED | FAILED` idempotent

### 2. Audit logging

Package [`audit/`](../backend/src/main/java/com/walletledger/audit/): `AuditLog` + `AuditLogRepository` + `AuditLogService`. Ghi 1 row cho mỗi state-changing action (CREATE / TOP_UP / TRANSFER / FREEZE / REVERSAL...). `performed_by` mặc định `"system"` — sẽ lấy từ JWT principal ở Phase E.

### 3. Idempotency hardening

Bảng `idempotency_keys` riêng (migrations V5–V8): tách dedup bookkeeping khỏi `ledger_transactions`, thêm `request_hash` (conflict detection) và `entity_id` reference. `ledger_transactions.idempotency_key` giữ lại làm trace reference (non-unique).

### 4. KPI Strip + Freeze/Unfreeze + status filter

- `GET /api/v1/wallets/stats` đã có (`WalletResource.stats()`).
- `POST /api/v1/wallets/{id}/freeze` + `/unfreeze` đã có.
- `GET /api/v1/wallets?status=` filter đã wired.

---

## Phase C — Reconciliation — HOÀN THÀNH ✅

Package [`reconciliation/`](../backend/src/main/java/com/walletledger/reconciliation/) (commit `14b1dd5`):
- `ExternalStatement` + upload endpoint `POST /api/v1/statements/upload`
- `ReconciliationService` + `ReconciliationRunner` (scheduled) — match `ledger_entries` theo `(amount, date, reference)`
- `reconciliation_matches` + `reconciliation_exceptions` tables + repositories
- `StatementResource`: `/reconcile`, `/runs`, `/runs/{id}/matches`, `/runs/{id}/exceptions`
- Migration `V9__add_reconciliation_indexes.sql`

---

## Phase E — JWT Auth + User-facing — CHƯA BẮT ĐẦU ⏳

Plan chi tiết: [`docs/plans/PHASE_E_user_facing.md`](plans/PHASE_E_user_facing.md). Tóm tắt: thêm cột auth vào `users` (migration **V10**), JWT self-issued (SmallRye JWT), `@RolesAllowed` + BOLA enforcement trong service layer, frontend login/register + ProtectedRoute. Hiện chưa có file nào liên quan JWT trong codebase.

---

## Các vấn đề đã biết / Technical debt

| Vấn đề | Mức độ | Ghi chú |
|---|---|---|
| `walletEntries` không invalidate sau top-up | Thấp | Cần thêm `invalidateQueries` vào `useTopUp` |
| `X-User-Id` BOLA check dễ bypass | Trung bình | Sẽ thay bằng JWT trong Phase E |
| Không có rate limiting | Trung bình | Cần thêm khi ra production |
| `users` table tồn tại nhưng không có màn hình quản lý | Thấp | Tạo user phải qua API trực tiếp |
| KpiStrip dùng hardcoded placeholder data | Thấp | Chờ `GET /api/v1/wallets/stats` |
| Lock ordering chỉ handle đúng 2 wallets | **Trung bình** | `transfer()` sort 2 UUID để tránh deadlock, nhưng nếu có operation lock N wallets (split payment, multi-source, fee collection, batch settlement) thì cần sort toàn bộ danh sách IDs rồi lock lần lượt. Pattern hiện tại không sai, chỉ cần mở rộng khi implement các operation đó. |
| Không có assertion sum-to-zero cho double-entry | **Cao** | Service layer tự tạo entries đúng, nhưng không có guard nào verify tổng DEBIT - CREDIT = 0 trước khi commit. Cần: (1) `postTransaction()` helper assert net=0 per currency trước khi persist, (2) DB-level `DEFERRABLE INITIALLY DEFERRED` trigger trên `ledger_entries` làm safety net. Nếu có bug tạo sai số entries, hiện tại DB không bắt được. |
