# Phase 3 — Core Infrastructure

**Goal**: Build the shared plumbing that every feature depends on — API endpoint registry, fetch client, error handling, and the settlement debt-simplification engine — before any feature code is written.

---

## Deliverables

- [ ] `lib/apiEndpoints.ts` — single source of truth for all API paths
- [ ] `lib/apiClient.ts` — typed fetch wrapper with automatic toast on error
- [ ] Standard API response shape enforced
- [ ] `app/(app)/error.tsx` and `app/(admin)/admin/error.tsx` — React error boundaries
- [ ] `lib/services/settlement.ts` — pure debt-simplification function with determinism and rounding rules
- [ ] Manual test cases for settlement logic passing

---

## Tasks

### 3.1 `lib/apiEndpoints.ts`

Single source of truth for every API path. No path strings may appear anywhere else in the codebase.

```ts
export const api = {
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
  },
  room: {
    create: '/api/rooms',
    join: '/api/rooms/join',
    list: '/api/rooms',
    detail: (roomId: string) => `/api/rooms/${roomId}`,
    members: (roomId: string) => `/api/rooms/${roomId}/members`,
  },
  product: {
    list: (roomId: string) => `/api/rooms/${roomId}/products`,
    create: (roomId: string) => `/api/rooms/${roomId}/products`,
  },
  bill: {
    list: (roomId: string) => `/api/rooms/${roomId}/bills`,
    create: (roomId: string) => `/api/rooms/${roomId}/bills`,
  },
  expense: {
    list: (roomId: string) => `/api/rooms/${roomId}/expenses`,
    create: (roomId: string) => `/api/rooms/${roomId}/expenses`,
    delete: (roomId: string, id: string) => `/api/rooms/${roomId}/expenses/${id}`,
  },
  settlement: {
    current: (roomId: string) => `/api/rooms/${roomId}/settlement`,
    close: (roomId: string) => `/api/rooms/${roomId}/settlement/close`,
  },
  admin: {
    users: '/api/admin/users',
    rooms: '/api/admin/rooms',
  },
} as const;
```

---

### 3.2 Standard API Response Shape

Every API route handler must return one of these two shapes — no exceptions:

```ts
// Success
{ success: true, data: <payload> }

// Error
{ success: false, error: { message: string, code?: string } }
```

Define a helper in `lib/apiHelpers.ts`:

```ts
export function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

export function err(message: string, status = 400, code?: string) {
  return NextResponse.json({ success: false, error: { message, code } }, { status });
}
```

All route handlers wrap their logic in `try/catch`, log the real error server-side, and return a safe message to the client. Never leak stack traces or raw DB errors.

---

### 3.3 `lib/apiClient.ts`

Typed fetch wrapper used by every client component. Features:
- Prepends base URL automatically.
- Parses `{ success, data, error }` response shape.
- On `success: false` or network failure: throws a typed `ApiError` and fires a Sonner toast automatically (opt-outable).
- Supports `GET`, `POST`, `DELETE`, `PATCH`.

```ts
export class ApiError extends Error {
  constructor(public message: string, public code?: string) {
    super(message);
  }
}

export const apiClient = {
  get: <T>(url: string, opts?: { silent?: boolean }) => request<T>('GET', url, undefined, opts),
  post: <T>(url: string, body?: unknown, opts?: { silent?: boolean }) => request<T>('POST', url, body, opts),
  delete: <T>(url: string, opts?: { silent?: boolean }) => request<T>('DELETE', url, undefined, opts),
  patch: <T>(url: string, body?: unknown, opts?: { silent?: boolean }) => request<T>('PATCH', url, body, opts),
};
```

Components **never** call `fetch` directly — always `apiClient`.

---

### 3.4 React Error Boundaries

Create two top-level error boundary files so an unhandled render error shows a friendly fallback instead of a blank white screen:

- `app/(app)/error.tsx`
- `app/(admin)/admin/error.tsx`

Both should display a user-friendly error card with a "Try again" button (calls Next.js `reset()`).

---

### 3.5 `lib/services/settlement.ts` — Debt Simplification Engine

This is the most logic-heavy service. Build and test it independently before any UI work.

#### Algorithm

1. Compute each member's **net balance**: `total_paid - total_owed`.
2. **Floating-point safety**: treat any balance with `abs(value) < 0.01` as zero.
3. **Sort for determinism**: sort creditors (positive balance) and debtors (negative balance) by amount descending, then by `user_id` ascending as tiebreaker.
4. Run the **greedy largest-creditor/largest-debtor** matching loop until all balances are zeroed.
5. Result: a list of `{ from: userId, to: userId, amount: number }` transactions.

#### Rounding Rule

- All amounts stored and returned in NPR rounded to 2 decimal places.
- When splitting an amount that doesn't divide evenly, give the remainder paisa to the payer.
- Splits must sum **exactly** to `total_amount` — no paisa drift.

#### Manual Test Cases to Write

| Case | Description |
|------|-------------|
| Even split, 2 members | 100 NPR / 2 = 50 each. No remainder. |
| Uneven split, 3 members | 100 NPR / 3 → payer gets extra paisa (34, 33, 33). Confirm sum = 100. |
| Multi-expense settlement | A, B, C with 3 expenses across them → simplified to ≤2 transactions. |
| Mid-period member removal | Removed member's outstanding balance shows up in summary, no historical split mutation. |
| Tie-breaking | Same balance amount, two users → deterministically ordered by user_id. |

---

### 3.6 Shared Zod Schemas

Create `lib/validations.ts` with reusable schemas:

```ts
export const moneyAmount = z
  .number()
  .positive()
  .multipleOf(0.01, 'Max 2 decimal places');

export const inviteCodeSchema = z
  .string()
  .length(8)
  .regex(/^[A-HJ-NP-Z2-9]{8}$/, 'Invalid invite code format');
```

Import and compose these in every route's Zod schema — never redefine money validation per-route.

---

## Definition of Done

- `lib/apiEndpoints.ts` exports the full `api` object — no raw strings elsewhere.
- `lib/apiClient.ts` correctly handles success, error, and network failure cases; shows a toast on error by default.
- Settlement test cases pass for uneven splits and multi-person scenarios.
- Error boundaries render without crashing when a test error is thrown in a child component.

---

## Branch

`feature/core-infrastructure`
