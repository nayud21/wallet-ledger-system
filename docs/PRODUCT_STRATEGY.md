# Wallet App — Product Strategy

> Notes on how this wallet/ledger product can stand out, what must be absolutely correct, and where to deep-dive for value.

---

## 1. Correctness-Critical Areas (Must Never Be Wrong)

Money bugs are unforgivable — one incident destroys trust permanently. These areas require strict invariants, tests, and review.

### 1.1 Double-Entry Ledger Integrity
- Every `ledger_transaction` must have entries summing to **zero per currency**.
- Enforce at both **service layer** (assert before commit) and **database** (CHECK constraint).
- `ledger_entries` is **append-only** — never `UPDATE` or `DELETE`. Reversals create a new transaction with mirrored entries.
- Money is stored as `NUMERIC(19,4)` in DB and `BigDecimal` in code. Never `double`/`float`. Always pair amount with `currency`.

### 1.2 Concurrency & Race Conditions
- Wallet mutations use `SELECT ... FOR UPDATE`.
- Transfers lock wallets in **ascending ID order** to prevent deadlock.
- Every balance-touching code path requires a Testcontainers integration test exercising concurrent access (≥2 threads on the same operation).

### 1.3 Idempotency
- Every mutating endpoint accepts an `idempotencyKey` with a `UNIQUE` constraint.
- Network retries or timeouts must never produce a double charge.
- Store the original response so duplicate calls return the same result, not a new mutation.

### 1.4 Reconciliation
- Internal ledger must match external sources (bank/PSP statements) to the cent.
- Daily reconciliation job, with alerts when any discrepancy is detected (even `0.0001`).
- Complete audit trail: who, when, why.

### 1.5 Security / Authorization
- **BOLA prevention**: enforce wallet ownership on every endpoint. User A must never read or write User B's wallet.
- Webhook signature verification (HMAC). Never log webhook bodies or secrets.
- Parameterized queries only. Input validated with `@Valid` at REST boundaries.

---

## 2. Deep-Dive Opportunities (Where to Build Differentiation)

These are areas where existing wallet products (Momo, ZaloPay, etc.) are weak. They build on the double-entry architecture already in place.

### 2.1 Transparency & Explainability of Money Movement
- For each transaction, show the **full double-entry view**: who was debited, who was credited, and the offsetting accounts.
- "Trace this money" — follow a payment across multiple hops from source to destination.
- Most consumer wallets only show `-100k` with no context. Showing the underlying ledger is a clear differentiator.

### 2.2 Multi-Currency with Honest FX
- Hold balances in multiple currencies natively — no silent auto-conversion.
- Display FX rate transparency: mid-market rate and spread shown separately (Wise-style).

### 2.3 Reconciliation UX for Power Users / SMBs
- Side-by-side dashboard: internal ledger vs. external statement, with diffs highlighted.
- One-click investigation of orphan entries and unmatched lines.
- Almost no B2C wallet exposes reconciliation tooling — yet freelancers and SMBs urgently need it.

### 2.4 Programmability
- Public API + webhooks following developer-friendly conventions (Stripe-style).
- Rules engine: "when money is received from X, automatically split 70/30 to wallets A/B".
- Sub-wallets / envelopes (YNAB-style budgeting on top of real ledger accounts).

### 2.5 Audit & Data Ownership
- Full ledger export (CSV/JSON) available any time.
- Cryptographic receipts — hash-chained entries so users can verify history hasn't been tampered with.
- This is a **trust moat**: features can be copied, reputation cannot.

---

## 3. Strategic Recommendation

**Do not compete on UI polish or cashback rewards.** Momo and ZaloPay have already won that ground.

**Compete on trust, transparency, and control** for audiences who are currently underserved:
- Freelancers and SMBs needing reconciliation.
- Multi-currency users tired of hidden FX spreads.
- Developers wanting programmable money flows.

Phase A (ledger + idempotency + reconciliation) is on the right track. Once the foundation is solid, the two strongest levers are:
1. **Transparency (2.1)** — leverages the double-entry architecture competitors don't have.
2. **Reconciliation UX (2.3)** — turns a back-office concern into a user-facing superpower.

These two deep-dives are the highest-leverage bets because they exploit the architecture already being built, not bolted-on features.
