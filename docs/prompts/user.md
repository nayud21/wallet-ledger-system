Design a laptop-first consumer wallet app UI. Clean, trustworthy fintech aesthetic.
React + Tailwind CSS. Max-w-3xl centered layout (no sidebar — this is user-facing, not admin).

## Design tokens
- Background: slate-50, cards: white with slate-200 border (no shadows)
- Primary: indigo-600, success/received: emerald-600, danger/sent: rose-600
- Text: slate-900 body, slate-500 secondary
- Money: font-variant-numeric tabular-nums, Intl.NumberFormat minimumFractionDigits 2

## Screen 1 — /login
Centered card (max-w-sm, mx-auto, mt-20):
- App logo / name top
- Email input, Password input (with show/hide toggle button inside field)
- "Sign in" primary button (full width)
- Inline error banner below button (red, not toast): "Invalid email or password"
- Link to Register below card

## Screen 2 — /register
Same centered card layout:
- Username, Email, Password, Confirm Password inputs
- Password strength indicator bar (4 segments: weak / fair / good / strong)
- "Create account" button
- Link back to Login

## Screen 3 — /dashboard (main user screen)
Top bar: "Hi, john_doe" left side, "Logout" text button right side. No sidebar.

Wallet cards row (grid-cols-2 gap-3, each card has border):
  Card: currency label top-left, balance large (text-2xl font-semibold), "Available" sub-label
  Two compact buttons below balance: [↑ Top Up] [→ Send]

Recent Transactions section below cards:
  Section header "Recent Transactions" with "View all →" link right
  List (not table): each row has
    - Left: direction icon circle (↓ emerald for received, ↑ rose for sent)
    - Middle: description (text-sm font-medium) + date (text-xs text-slate-500)
    - Right: amount in bold (+ green for received, - rose for sent)
  Show 5 rows then "Load more" text button

## Screen 4 — Send Money (3-step wizard, same centered layout)

Step indicator: 3 dots at top (● ○ ○), (● ● ○), (● ● ●)

Step 1 "Recipient":
  Label "Wallet ID", text input with placeholder "Enter wallet ID..."
  [Continue →] button

Step 2 "Amount":
  From wallet selector (dropdown showing user's wallets with balances)
  Amount input with currency label right-aligned inside field
  Available balance shown below input in slate-500
  Inline rose error if over balance: "Insufficient balance (available: $X)"
  [← Back] [Continue →] buttons

Step 3 "Confirm":
  Summary card with border:
    From: wallet external ID — $XXX.XX available
    To: [wallet ID]
    Amount: $XX.00 USD
    Fee: $0.00
    ──────────────
    Total deducted: $XX.00
  [← Back] [Confirm & Send] primary button (indigo)
  Small text below: "This action cannot be undone"

## Screen 5 — /history (transaction history)
Top filter bar: [All ▼] [Sent ▼] [Received ▼]  |  [From date] [To date]

Transaction list (full width, no table):
  Each row (py-3 border-b):
    Left circle icon (↓ emerald / ↑ rose)
    Description + wallet ID snippet (text-xs text-slate-500)
    Date right-aligned text-xs
    Amount right-aligned font-medium (color by direction)
  "Load more" button at bottom (outline style)

Render all 5 screens in a single scrollable preview.
Separate each screen with a slate-200 divider and route label in text-xs text-slate-400.
Use realistic data: names, wallet IDs, USD/VND amounts, dates from May 2026.
