# Phase 6 — Room Features

**Goal**: Build the full in-room experience — Bills (with electricity calculator), Add Expense (with fixed/random tagging, optimistic UI, idempotency), Products catalog, and Settlement (view + close period).

Build and test each feature **in order**: Bills → Expenses → Products → Settlement. Do not skip ahead.

---

## Deliverables

- [ ] Bills: list + create (rent, electricity auto-calc, waste, wifi)
- [ ] Expenses: list + create (fixed/random tagging, optimistic UI, idempotency key, autocomplete)
- [ ] Expenses: delete (creator or room owner only)
- [ ] Products: owner-only catalog view + delete
- [ ] Settlement: current period balance view + simplified debts
- [ ] Settlement: close period (owner only, via RPC)

---

## Build Order Within This Phase

1. `lib/services/bills.ts` + API routes
2. Bills UI
3. `lib/services/expenses.ts` + API routes
4. Expenses UI (Add Expense form is the most complex screen)
5. `lib/services/products.ts` + API routes + Products UI
6. Settlement summary view (read-only first)
7. Close Period action

---

## 6.1 Bills

### Service (`lib/services/bills.ts`)

```ts
export async function listBills(roomId: string, userId: string, opts: PaginationOpts): Promise<Bill[]>
export async function createBill(roomId: string, userId: string, data: CreateBillInput): Promise<Bill>
```

**Electricity auto-calculation** (server-side, never client):
```
amount = (current_unit - prev_unit) × rate_per_unit
```
The client sends `prev_unit`, `current_unit`, `rate_per_unit`. The server computes and stores `amount`. Never trust an `amount` sent directly by the client for electricity bills.

**`period_id` resolution**: always look up the currently-open period for this room. Never accept `period_id` from the client.

**Split creation**: after inserting the bill, insert `bill_splits` rows — equal split among current room members, rounding remainder to the payer (`paid_by`).

**Idempotency**: check `idempotency_key` before inserting. If a row with that key already exists for this room, return the existing row (HTTP 200, not 409) — this handles retry-on-flaky-network transparently.

### Zod Validation (per bill type)

```ts
// Electricity
z.object({
  type: z.literal('electricity'),
  month: z.string().date(),
  prev_unit: z.number().nonnegative(),
  current_unit: z.number(),
  rate_per_unit: z.number().positive(),
  paid_by: z.string().uuid(),
}).refine(d => d.current_unit >= d.prev_unit, 'Current unit must be ≥ previous unit')

// Other bill types (rent, waste, wifi)
z.object({
  type: z.enum(['rent', 'waste', 'wifi']),
  month: z.string().date(),
  amount: moneyAmount,    // reuse from lib/validations.ts
  paid_by: z.string().uuid(),
})
```

### Bills UI (`app/(app)/rooms/[roomId]/bills/page.tsx`)

- Tab: **Bills**
- List: table of bills for the current period, grouped by type. Columns: Type, Month, Amount, Paid by.
- **Add Bill** button → opens a Dialog with a `Select` for bill type, then conditional fields:
  - **Electricity**: Prev unit, Current unit, Rate/unit → auto-preview the calculated amount below the fields.
  - **Others**: just Amount.
  - All: Month picker (date), Paid by (member Select).
- Loading: `Skeleton` rows.
- Empty state: "No bills added yet for this period."

---

## 6.2 Expenses

### Service (`lib/services/expenses.ts`)

```ts
export async function listExpenses(roomId: string, userId: string, opts: PaginationOpts & FilterOpts): Promise<Expense[]>
export async function createExpense(roomId: string, userId: string, data: CreateExpenseInput): Promise<Expense>
export async function deleteExpense(roomId: string, expenseId: string, userId: string): Promise<void>
```

**Fixed vs. Random tagging** (Section 8 of spec):
1. User types item name. Check against `products` table (case-insensitive, starts-with in UI, exact match on save).
2. If match found → pre-fill price, set `is_fixed = true`, `product_id = <matched>`.
3. If no match:
   - **Fixed**: save to `products` table first, then insert expense with `is_fixed = true`.
   - **Random**: insert expense only, `is_fixed = false`, `product_id = null`.

**Split logic**:
- Default: equal split among all current room members.
- Manual override: user can uncheck members → re-split equally among remaining checked members.
- Rounding rule: remainder to `paid_by`.
- At least one member must remain checked (enforce in UI and server-side).
- Server validates: `sum(expense_splits.share) == total_amount`.

**Delete authorization**: only the expense creator OR a room owner may delete.

**Idempotency**: same as bills — check `idempotency_key`, return existing row on duplicate.

### Zod Validation

```ts
z.object({
  item_name: z.string().min(1).max(200),
  is_fixed: z.boolean(),
  product_id: z.string().uuid().optional().nullable(),
  quantity: z.number().positive(),
  unit_price: moneyAmount,
  total_amount: moneyAmount,
  paid_by: z.string().uuid(),
  expense_date: z.string().date(),
  splits: z.array(z.object({
    user_id: z.string().uuid(),
    share: moneyAmount,
  })).min(1),
})
// Server-side cross-field check: sum(splits.share) === total_amount
```

### Expenses UI (`app/(app)/rooms/[roomId]/expenses/page.tsx`)

- Tab: **Expenses**
- List: expenses for the current period sorted by date desc. Columns: Date, Item, Amount, Paid by, Split. Delete button (visible to creator/owner).
- **Optimistic UI** on Add and Delete (highest-frequency actions):
  - Add: insert a temporary row with a local ID immediately, remove on error.
  - Delete: remove the row immediately, restore on error.
  - Use React Query `useMutation` with `onMutate`/`onError`/`onSettled`.

### Add Expense Form (Complex — read carefully)

Fields in order:
1. **Item name** — text input with autocomplete from room's `products` (case-insensitive, "starts with" filtering). When a product is matched: auto-fill Unit Price, show "Fixed item" badge.
2. **Fixed / Random toggle** — appears only when the item name doesn't match any existing product. Defaults to **Random**.
3. **Quantity** — number input (default 1).
4. **Unit price** — number input (auto-filled if product matched, editable otherwise).
5. **Total** — read-only computed field: `quantity × unit_price`.
6. **Paid by** — member Select (defaults to current user).
7. **Expense date** — date picker (defaults to today).
8. **Split** — checkboxes for each room member, equal amounts shown next to each name. Unchecking a member redistributes their share. Amount shown updates live as members are checked/unchecked.

**Idempotency key**: generate a UUID when the form is opened/reset; send as the `Idempotency-Key` request header.

---

## 6.3 Products

### Service (`lib/services/products.ts`)

```ts
export async function listProducts(roomId: string, userId: string): Promise<Product[]>
export async function createProduct(roomId: string, userId: string, data: CreateProductInput): Promise<Product>
// Note: products are created implicitly by the expense service when is_fixed=true
// This endpoint is for the owner's catalog management view
```

### Products UI (`app/(app)/rooms/[roomId]/products/page.tsx`)

- **Owner-only tab** (hidden from members — check role in `CurrentRoomProvider`).
- List: all fixed products for the room. Columns: Name, Default Price, Unit Label, Created.
- No inline create from this screen (products are created via Add Expense). Show a note explaining this.
- Delete button per product (with `AlertDialog` confirmation).

---

## 6.4 Settlement

### Service additions (`lib/services/settlement.ts`)

```ts
export async function getCurrentSettlement(roomId: string, userId: string): Promise<SettlementSummary>
export async function closeSettlementPeriod(roomId: string, userId: string): Promise<void>
```

**`getCurrentSettlement` logic**:
1. Get the open period for this room.
2. Fetch all `expenses` + `expense_splits` for this period.
3. Fetch all `bills` + `bill_splits` for this period.
4. For each member: `net_balance = total_paid - total_owed_across_all_splits`.
5. Run the deterministic debt-simplification function from Phase 3.
6. Return: `{ period, member_balances, transactions: [{ from, to, amount }] }`.

**`closeSettlementPeriod` logic**:
1. Assert caller is room owner.
2. Call Supabase RPC `close_settlement_period(room_id)` (the Postgres function from Phase 2).
3. Invalidate relevant React Query cache keys client-side after success.

### Settlement UI (`app/(app)/rooms/[roomId]/settlement/page.tsx`)

- Tab: **Settlement**
- **Period header**: "Period: Jun 1 – Jun 30, 2024 (Open)" with a badge.

**Balance cards** — one per member:
```
┌──────────────────────────────────┐
│  👤 Alice                        │
│  Paid: NPR 3,500                 │
│  Owes: NPR 2,400                 │
│  Net: +NPR 1,100 (is owed)       │  ← green
└──────────────────────────────────┘
```
Color: green (`text-success`) if net positive (owed money), red (`text-danger`) if net negative (owes money).

**Simplified debts section**:
```
  Bob  →  Alice   NPR 1,100
  Carol →  Alice  NPR 400
```

**Close Period button** (owner only):
- Uses shadcn `AlertDialog`: "Are you sure? This will close the current period and open a new one. This cannot be undone."
- On confirm: calls `POST /api/rooms/:roomId/settlement/close`.
- On success: toast "Period closed. New period started.", invalidate all settlement + expense + bill queries.

---

## Shared Behaviors Across All Room Features

| Behavior | Where |
|----------|-------|
| Loading: `Skeleton` component | All list/table views |
| Empty state: friendly message + icon | All list/table views |
| Destructive actions via `AlertDialog` | Delete expense, Delete product, Close period |
| Toasts for action outcomes | All mutations via `apiClient` auto-toast |
| Inline field errors | All form inputs via react-hook-form + zod |
| Pagination (`?limit=20&cursor=`) | Expenses, Bills lists |
| Period filter (`?periodId=`) | Expenses, Bills lists (default: open period) |

---

## Definition of Done

- Add a bill (all 4 types), verify it appears in the list and the correct split rows are in `bill_splits`.
- Add an electricity bill with `current_unit < prev_unit` → rejected with a validation error.
- Add a fixed expense (new item): verify a `products` row is created.
- Add a random expense: verify no `products` row is created.
- Add an existing fixed product expense: verify it autocompletes and uses the saved price.
- Delete an expense as the creator: optimistic removal works; restores on simulated failure.
- Attempt to delete another user's expense (non-owner) → `403`.
- Settlement page shows correct balances for a 3-person room with mixed payments.
- Close period: new open period created, old period marked closed, existing expenses/bills still visible under the closed period.
- Products tab is invisible to members (only visible to room owner).

---

## Branch

`feature/room-features`
