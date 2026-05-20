Design a laptop-first admin UI for a Wallet + Double-Entry Ledger system.
Use React + Tailwind CSS. Compact density: text-sm, py-1.5 rows, no wasted whitespace.

## Layout shell
- Fixed left sidebar (w-56), top bar with user selector dropdown, main content flex-1 overflow-auto
- Sidebar nav items: Wallets, Ledger, Inbox, Reconciliation
- Top bar: app name left, "Operator ▼" user selector right

## Screen 1 — /wallets (default view)
Dense table with columns: External ID | Currency | Available Balance | Reserved | Status | Updated
- Right-align all numeric columns, font-variant-numeric: tabular-nums
- Status badge: green dot ACTIVE, gray dot FROZEN
- "+ Create Wallet" button top-right

## Screen 2 — /wallets/:id (show this as main content)
Two-column layout (60/40 split):
LEFT: wallet metadata card + balance snapshots table (Tx ID, Balance, Timestamp)
     + ledger entry history table below (Tx ID | Description | Direction | Amount)
RIGHT: two collapsible action panels
  - "Top-up" form: Amount input, External Ref input, Idempotency Key (uuid with refresh icon), Submit button
  - "Transfer To" form: Target Wallet ID input, Amount input, Idempotency Key, Submit button
- On insufficient balance: show inline red error under amount field (not a toast)

## Screen 3 — /ledger
Filter bar: date-from, date-to, description search
Table: ID | Description | Status | Created — clickable rows
Right drawer (slide-in): shows ledger entries for selected tx
  - Table: Account | Direction | Amount — last row shows Sum = 0.0000 in bold
  - "Reverse" button at bottom of drawer

## Screen 4 — /reconciliation/runs/:id  ← marquee screen
Side-by-side grid (grid-cols-2 gap-2):
LEFT pane header "Matches (42)" — collapsible list of matched pairs
RIGHT pane header "Exceptions (3)" — exception cards grouped by type:
  - UNMATCHED_LEDGER card: shows ledger side, "— not found" on statement side, [Link to statement] [Write off] buttons
  - AMOUNT_MISMATCH card: shows both amounts with diff highlighted in amber
Use border-l-4 colored accent per exception type. Max 16px padding per pane.

## Design tokens
- Background: slate-50, cards: white, borders: slate-200
- Primary action: indigo-600, danger: red-600, warning: amber-500
- All money values: Intl.NumberFormat with minimumFractionDigits 2, maximumFractionDigits 4
- No shadows on cards — borders only
- Focus rings on all interactive elements (accessibility)

Render all 4 screens in a single scrollable preview, separated by a subtle divider with the route label.
Use realistic placeholder data (wallet IDs, amounts, timestamps).
