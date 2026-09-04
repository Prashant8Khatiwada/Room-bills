# Build Spec v2: Room Expense Tracker (Next.js full-stack) — hand this entire file to Claude Code

This supersedes the earlier single-room spec. Key change: this is now a **multi-room, multi-user platform** with proper auth, not a single hardcoded household. Read this whole file before writing code. Section 0 tells you what order to work in.

---

## 0. How to use this document
1. First, create the skill files described in **Section 4** under `.claude/skills/`. These encode conventions you must follow for the rest of the build (folder structure, API format, theming, component rules, error handling, git workflow) — read them back before writing any code, and re-check them periodically as you work.
2. Then follow **Section 15 (Build Order)**.

---

## 1. Product Overview & Flows

**Auth flow**: Standard register → email/password login → land on a global dashboard (not room-specific yet).

**Room flow**: On the global dashboard, a user can:
- **Create a room** (becomes that room's Owner) — gets a unique invite code/link.
- **Join a room** by entering an invite code.
- A user can belong to **multiple rooms** and switch between them (room switcher in the nav).

**Inside a room** (everything from the earlier spec, now scoped to `room_id`):
- Monthly bills: rent, electricity (prev/current unit × rate = auto-calculated), waste, wifi.
- Add Expense flow: user names an item and tags it as either:
  - **Fixed** → saved to that room's product catalog with a default price, so it autocompletes next time.
  - **Random/variable** (e.g. vegetables) → **not saved anywhere** — it's a one-off line on that single expense only.
- Settlement: equal split among room members by default (editable per expense), debt-simplified into "who pays whom" at period close.

**Admin panel** (platform-level, separate from room ownership): scope wasn't decided yet — see Section 10 for the MVP scope I'm proposing and flagging for your confirmation.

## 2. Assumptions I made — please confirm or correct
You said to validate gaps, so here's what I filled in and why. Flag anything you want changed:
- **Room size isn't hardcoded to 3 anymore.** Since rooms are now user-created and joined via invite, I removed the "exactly 3 users" constraint — a room just has an Owner + Members, any headcount. Equal split still divides by however many members are in the room. Tell me if you actually want to cap rooms at 3.
- **Invite mechanism**: simple shareable invite code/link (like Discord/Notion), not email invites — avoids needing a transactional email service. Easy to upgrade later.
- **Room roles**: `owner` (the creator — can manage products, close settlement periods, remove members) and `member` (can add expenses/bills, can't manage room settings). This is separate from the platform Admin in Section 10.
- **Platform Admin scope (MVP)**: since you said this is undecided, I've scoped it to the minimum useful thing — see Section 10. Confirm or expand.
- **One expense = one item**, not a cart/multi-item entry — matches "keep it simple."
- **Currency**: NPR, no multi-currency support.
- **No email verification / password reset flow specified** — I've included basic Supabase email/password auth with verification, since Supabase gives you this for free and skipping it is a worse experience than including it.

## 3. Tech Stack
- **Next.js 14+ App Router, TypeScript, full-stack** (API routes handle all backend logic — no separate backend service).
- **Tailwind CSS + shadcn/ui** — see Section 4d, shadcn is mandatory for all UI, no raw HTML form/button/input elements.
- **Supabase**: Auth (email/password) + Postgres database.
- **Zod** for request validation in API routes.
- **Sonner** (via shadcn) for toasts.
- **date-fns** for dates.

## 4. Claude Code Skills — create these under `.claude/skills/`
Create one folder per skill, each with a `SKILL.md`. These are standing conventions for this codebase — follow them on every file you touch, not just once at setup.

### 4a. `.claude/skills/folder-structure/SKILL.md`
```
---
name: folder-structure
description: Conventions for where code lives in this Next.js app. Read before creating any new file.
---
- `app/` — routes only (pages, layouts, route handlers). No business logic in route files beyond calling a function from `lib/`.
- `app/(auth)/` — login, register (unauthenticated routes).
- `app/(app)/` — everything behind auth: dashboard, room switcher, and a nested `app/(app)/rooms/[roomId]/` segment for all room-scoped pages (bills, add-expense, products, settlement).
- `app/(admin)/admin/` — platform admin routes, gated by `is_platform_admin`.
- `app/api/` — route handlers, mirrored 1:1 with the endpoint map in `lib/apiEndpoints.ts`. Each route handler validates input with Zod, calls a function in `lib/services/`, and returns the standard response shape (see error-handling skill).
- `lib/services/` — one file per domain (`auth.ts`, `rooms.ts`, `products.ts`, `bills.ts`, `expenses.ts`, `settlement.ts`, `admin.ts`). All Supabase queries and business logic live here, never inline in a route handler or a component.
- `lib/apiEndpoints.ts` — single source of truth for every API path (see api-endpoints skill).
- `lib/apiClient.ts` — the one fetch wrapper every client component uses to call the API.
- `lib/realtime.ts` — the one place Supabase Realtime subscriptions are set up (see realtime skill). Components never call `supabase.channel()` directly.
- `components/ui/` — shadcn primitives only, untouched except via `npx shadcn add`.
- `components/<domain>/` — one folder per domain (`rooms/`, `expenses/`, `bills/`, `products/`, `settlement/`, `admin/`), matching the `lib/services/` domains.
- Never create a new top-level folder without checking this file first.
```

### 4b. `.claude/skills/api-endpoints/SKILL.md`
```
---
name: api-endpoints
description: How every API endpoint is named, defined, and called. Read before adding any new endpoint or calling one from a component.
---
Every API path is defined ONCE in `lib/apiEndpoints.ts` as a nested object, controller-style, mirroring how a Next.js API route handler would be named if it were a class. Never hardcode a path string anywhere else in the codebase.

Example shape (extend this pattern for new domains, don't invent a different shape):

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

Every client-side data call goes through `lib/apiClient.ts`, e.g. `apiClient.get(api.room.list)` or `apiClient.post(api.expense.create(roomId), body)`. Never call `fetch` directly from a component.
```

### 4c. `.claude/skills/theming/SKILL.md`
```
---
name: theming
description: How color and design tokens are defined and applied globally. Read before styling any component.
---
- All colors are CSS variables defined once in `app/globals.css` (see the palette in the main build spec) and exposed to Tailwind via `tailwind.config.ts` `theme.extend.colors`.
- Never hardcode a hex value or a raw Tailwind color class (e.g. `bg-indigo-600`) inside a component. Always use the semantic token (`bg-primary`, `text-danger`, `bg-muted`).
- Light and dark mode both read from the same token names — only the CSS variable values differ under `.dark`.
- If a new semantic need comes up (e.g. a new status color), add a new token to `globals.css` + `tailwind.config.ts` first, then use it — don't reach for a raw color as a shortcut.
```

### 4d. `.claude/skills/ui-components/SKILL.md`
```
---
name: ui-components
description: Component rules — shadcn only, no raw HTML interactive elements. Read before building any UI.
---
- Use shadcn/ui components for every interactive element: `Button`, `Input`, `Select`, `Checkbox`, `Dialog`, `AlertDialog`, `Tabs`, `Card`, `Form` (with react-hook-form + zod), `Sonner` for toasts.
- Never use raw `<button>`, `<input>`, `<select>`, `<form>` tags directly — always the shadcn equivalent, even for the simplest case.
- Confirmation for destructive actions (delete expense, remove member, close settlement period) always goes through shadcn `AlertDialog`, never a native `confirm()`.
- Every list/table view needs a loading skeleton (shadcn `Skeleton`) and an empty state — don't ship a blank screen while data loads or when there's nothing yet.
```

### 4e. `.claude/skills/error-handling/SKILL.md`
```
---
name: error-handling
description: Standard API response shape, client-side error handling, and toast/feedback conventions. Read before writing an API route or a data-fetching component.
---
- Every API route returns this shape, always:
    success: { success: true, data: <payload> }
    error:   { success: false, error: { message: string, code?: string } }
- API routes wrap their logic in try/catch, log the real error server-side, and return a generic safe message to the client for unexpected errors (never leak stack traces or raw DB errors to the client).
- `lib/apiClient.ts` centralizes response handling: on `success: false` or a network failure, it throws a typed `ApiError`, and shows a toast automatically (via Sonner) unless the caller opts out — so most components don't need their own try/catch for the common case.
- Wrap the app in a top-level React error boundary (`app/(app)/error.tsx`, `app/(admin)/admin/error.tsx`) so an unhandled render error shows a friendly fallback instead of a blank white screen.
- Form validation errors surface inline on the field (via react-hook-form + zod), not as toasts — toasts are for action-level outcomes (save succeeded/failed, invite sent, period closed), not field validation.
```

### 4f. `.claude/skills/git-workflow/SKILL.md`
```
---
name: git-workflow
description: Branching, commit, and PR/merge conventions for this repo. Read before starting any change and before opening a PR.
---
- `main` is always deployable. Never commit directly to `main`.
- Branch naming: `feature/<short-description>`, `fix/<short-description>`, `chore/<short-description>` (e.g. `feature/room-invite-flow`).
- One logical change per branch/PR — don't bundle unrelated fixes into a feature branch.
- Commit messages: short imperative summary line (e.g. "Add room invite endpoint"), no need for a strict format beyond that.
- Before opening a PR: run the linter/build locally, make sure it's green.
- PR description should state what changed and why in 2-3 sentences — no template needed given this is a small solo/small-team project.
- Merge strategy: squash-merge into `main` so history stays one commit per feature/fix.
- Delete the branch after merging.
```

### 4g. `.claude/skills/frontend-architecture/SKILL.md`
```
---
name: frontend-architecture
description: State management, room context, auth guarding, and optimistic UI conventions. Read before building any data-fetching component.
---
- Use **React Query** (`@tanstack/react-query`) for all server state — every `apiClient` call in a component goes through `useQuery`/`useMutation`, never raw `useEffect` + `fetch`/`apiClient` calls.
- Cache invalidation: after any mutation (create/update/delete expense, bill, product, settlement close), invalidate the relevant query keys (`['expenses', roomId, periodId]`, `['settlement', roomId]`, etc.) rather than manually patching cache state.
- A global `CurrentRoomProvider` (React context) holds the active `roomId` once a user picks/switches rooms, so nested components read it via a `useCurrentRoom()` hook instead of every component needing `roomId` passed down as a prop or re-read from the URL.
- Auth guarding happens at the layout level, not per-page: `app/(app)/layout.tsx` checks the session server-side (via Supabase server client) and redirects to `/login` if absent; `app/(admin)/admin/layout.tsx` additionally checks `is_platform_admin` and redirects to the dashboard if false. Don't re-implement this check in individual pages.
- Optimistic updates for Add Expense and Delete Expense (instant UI feedback, roll back via React Query's `onError` if the request fails) — these are the two highest-frequency actions in the app, so they're worth the extra code; other mutations (bills, products, settlement close) can just show a loading state, no need to optimistically update those.
```

### 4h. `.claude/skills/security/SKILL.md`
```
---
name: security
description: Authorization, rate limiting, and admin-route protection conventions. Read before writing any API route.
---
- RLS is a safety net, not the only check. Every service function in `lib/services/` that touches a room-scoped table must itself verify the caller is a member of that room before querying — don't rely solely on the database to reject unauthorized access, since server-side code sometimes uses the service-role client (which bypasses RLS) for legitimate reasons like the auth-sync trigger or admin routes, and a future bug could reuse that client somewhere it shouldn't.
- Every `app/api/admin/**` route re-checks `is_platform_admin` at the top of the handler, even though the layout guard already checks it — defense in depth, since API routes can in principle be hit directly.
- Basic rate limiting on `/api/auth/login` and `/api/rooms/join` (a simple in-memory or edge-based limiter, e.g. N attempts per IP per minute) — these are the two brute-forceable endpoints (password guessing, invite-code guessing).
- Never return raw database error messages or stack traces to the client (see error-handling skill) — this applies doubly to auth endpoints, where a distinct "user not found" vs "wrong password" error message helps an attacker enumerate accounts.
```

### 4i. `.claude/skills/realtime/SKILL.md`
```
---
name: realtime
description: How Supabase Realtime subscriptions are set up and consumed. Read before adding any realtime behavior or touching lib/realtime.ts.
---
- All Supabase Realtime subscription logic lives in `lib/realtime.ts` — components never call `supabase.channel()` directly.
- Realtime is scoped ONLY to room-scoped data: `expenses` and `bills`. Settlement updates are derived by refetching (Section 13), not subscribed to directly. Never wire realtime into the global dashboard or auth state — those don't need it and it adds needless connection overhead.
- Subscribe via `postgres_changes` on `expenses`/`bills`, always filtered by `room_id` — never an unfiltered table-wide subscription.
- On any insert/update/delete event, call `queryClient.invalidateQueries` for the affected keys (`['expenses', roomId]`, `['bills', roomId]`, `['settlement', roomId]`) — never mutate component state directly from the realtime payload, and never try to patch the React Query cache by hand from the event data. Always invalidate and let a refetch bring in the real state; this also naturally handles duplicate/out-of-order events without extra logic.
- Debounce invalidation by ~100-300ms if a burst of events could arrive close together (e.g. someone bulk-adding expenses), so the UI doesn't refetch on every single row.
- Subscriptions use the authenticated Supabase client, so RLS still applies to what a subscriber can actually receive.
- Always unsubscribe/clean up the channel on component unmount (return a cleanup function from the `useEffect` that sets up the subscription) — a leaked subscription per room visit will pile up open WebSocket connections over a session.
- No custom WebSocket server, no polling — Supabase Realtime is the only mechanism.
```

## 5. Color Theme (revised — light, balanced)
The earlier dark-teal theme was too heavy. Use this instead: a clean light theme, one balanced primary, muted semantic colors — nothing oversaturated.

```css
:root {
  /* Brand */
  --primary: 243 75% 59%;         /* indigo-600 #4F46E5 — balanced, neutral-professional, not warm or cold */
  --primary-foreground: 0 0% 100%;
  --accent: 189 71% 42%;          /* cyan-600 #0891B2 — secondary actions, calm complement to indigo */
  --accent-foreground: 0 0% 100%;

  /* Semantic balance colors — muted, not neon */
  --success: 152 60% 36%;         /* emerald-600 #059669 — "you are owed" */
  --success-foreground: 0 0% 100%;
  --danger: 350 65% 51%;          /* rose-600 #E11D48 — "you owe" */
  --danger-foreground: 0 0% 100%;
  --warning: 38 85% 50%;          /* amber-500 — pending/open period badges */

  /* Neutrals — soft, not stark white/black */
  --background: 220 20% 98%;      /* near-white, slightly cool */
  --foreground: 222 30% 16%;      /* soft dark slate, not pure black */
  --card: 0 0% 100%;
  --card-foreground: 222 30% 16%;
  --muted: 220 16% 94%;
  --muted-foreground: 220 10% 46%;
  --border: 220 14% 90%;
  --radius: 0.75rem;
}

.dark {
  --background: 222 28% 12%;
  --foreground: 220 20% 96%;
  --card: 222 24% 16%;
  --card-foreground: 220 20% 96%;
  --muted: 222 20% 20%;
  --muted-foreground: 220 12% 65%;
  --border: 222 18% 24%;
  --primary: 243 80% 68%;         /* lighter indigo for dark bg contrast */
  --accent: 189 71% 52%;
}
```
Wire into `tailwind.config.ts` under `theme.extend.colors` exactly as in the theming skill (Section 4c) — semantic token names only, everywhere.

## 6. Folder Structure
Follow `.claude/skills/folder-structure/SKILL.md` exactly (Section 4a) — don't duplicate it here, that file is the source of truth once created.

## 7. Database Schema (Supabase / Postgres)

```sql
create table users (
  id uuid primary key references auth.users(id),
  name text not null,
  email text not null,
  is_platform_admin boolean not null default false,
  created_at timestamptz default now()
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table room_members (
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references users(id),
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  name text not null,
  default_price numeric not null,   -- fixed-price items only; variable items are never saved here
  unit_label text,
  created_at timestamptz default now()
);

create table settlement_periods (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz default now()
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  period_id uuid references settlement_periods(id),
  type text not null check (type in ('rent','electricity','waste','wifi')),
  month date not null,
  prev_unit numeric,
  current_unit numeric,
  rate_per_unit numeric,
  amount numeric not null,
  paid_by uuid references users(id),
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  period_id uuid references settlement_periods(id),
  product_id uuid references products(id),   -- null for one-off/variable items
  item_name text not null,                    -- always set, whether or not product_id is set
  is_fixed boolean not null default false,    -- whether this was tagged fixed at entry time
  quantity numeric not null default 1,
  unit_price numeric not null,
  total_amount numeric not null,
  paid_by uuid references users(id) not null,
  expense_date date not null default current_date,
  created_at timestamptz default now()
);

create table expense_splits (
  expense_id uuid references expenses(id) on delete cascade,
  user_id uuid references users(id),
  share numeric not null,
  primary key (expense_id, user_id)
);

create table bill_splits (
  bill_id uuid references bills(id) on delete cascade,
  user_id uuid references users(id),
  share numeric not null,
  primary key (bill_id, user_id)
);
```
### 7a. Indexes
```sql
create index idx_room_members_user on room_members(user_id);
create index idx_room_members_room on room_members(room_id);
create index idx_expenses_room on expenses(room_id);
create index idx_expenses_period on expenses(period_id);
create index idx_bills_room on bills(room_id);
create index idx_bills_period on bills(period_id);
create index idx_products_room on products(room_id);
create index idx_settlement_periods_room on settlement_periods(room_id);
```

### 7b. One-open-period-per-room constraint
Prevents two open settlement periods existing for the same room at once (guards against double-open bugs and race conditions on close/reopen):
```sql
create unique index one_open_period_per_room
on settlement_periods (room_id)
where status = 'open';
```

### 7c. RLS Policies
Enable RLS on every table, then add membership-based policies. Pattern: a row is readable/writable if the caller is a member of the room it belongs to (joined directly for `rooms`/`room_members`, via `room_id` for everything else).
```sql
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table products enable row level security;
alter table settlement_periods enable row level security;
alter table bills enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table bill_splits enable row level security;

create policy "Members can access their rooms"
on rooms for select using (
  exists (select 1 from room_members rm where rm.room_id = rooms.id and rm.user_id = auth.uid())
);

create policy "Members can view room membership"
on room_members for select using (
  exists (select 1 from room_members rm where rm.room_id = room_members.room_id and rm.user_id = auth.uid())
);

create policy "Members can access room products"
on products for all using (
  exists (select 1 from room_members rm where rm.room_id = products.room_id and rm.user_id = auth.uid())
);

create policy "Members can access room settlement periods"
on settlement_periods for all using (
  exists (select 1 from room_members rm where rm.room_id = settlement_periods.room_id and rm.user_id = auth.uid())
);

create policy "Members can access room bills"
on bills for all using (
  exists (select 1 from room_members rm where rm.room_id = bills.room_id and rm.user_id = auth.uid())
);

create policy "Members can access room expenses"
on expenses for all using (
  exists (select 1 from room_members rm where rm.room_id = expenses.room_id and rm.user_id = auth.uid())
);

create policy "Members can access expense splits"
on expense_splits for all using (
  exists (
    select 1 from expenses e join room_members rm on rm.room_id = e.room_id
    where e.id = expense_splits.expense_id and rm.user_id = auth.uid()
  )
);

create policy "Members can access bill splits"
on bill_splits for all using (
  exists (
    select 1 from bills b join room_members rm on rm.room_id = b.room_id
    where b.id = bill_splits.bill_id and rm.user_id = auth.uid()
  )
);
```
Platform admin routes use the Supabase **service role key** server-side, which bypasses RLS entirely — but every admin route handler must still explicitly check `is_platform_admin` in code before doing anything (RLS bypass means the DB won't stop a bug here, so the app layer must). Never trust RLS alone even on non-admin routes either — the service layer in `lib/services/` should still verify room membership itself before querying, so a future refactor that accidentally uses the service-role client somewhere doesn't silently expose cross-room data.

### 7d. Invite code design
- 8-character, uppercase alphanumeric (excluding ambiguous characters `0/O/1/I`), generated server-side on room creation, unique (enforced by the `invite_code` unique constraint already in the schema).
- No expiry for now (matches "keep it simple") — owner can regenerate the code from room settings, which invalidates the old one.

### 7e. Settlement period lifecycle
- On room creation: auto-create the first `settlement_periods` row, `status = 'open'`, `start_date = today`, `end_date = null` (open-ended until closed) — or default `end_date` to one month out if you want a visible target date; either is fine, pick end-of-month-out for a clearer dashboard.
- On close: set current period `status = 'closed'`, `end_date = today` if not already set, and in the **same transaction** create the next period (`status = 'open'`, `start_date = today + 1`). Do this as a single Postgres function/RPC (`close_settlement_period(room_id)`) rather than two separate API calls, so a failure can't leave a room with zero open periods.
- Every bill/expense insert must resolve `period_id` server-side from "whatever period is currently open for this room" — never let the client pass `period_id` directly, to avoid stale-period bugs.

### 7f. Auth sync (Supabase Auth ↔ `users` table)
Supabase Auth's `auth.users` is separate from this app's `users` table. Add a Postgres trigger so every signup automatically creates the matching row — don't rely on application code to remember to do this:
```sql
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

## 8. Expense entry logic (fixed vs random tagging)
When a user adds an expense:
1. They type an item name. If it matches an existing product in that room, autocomplete price + mark `is_fixed = true`, `product_id` set.
2. If it doesn't match, they choose **Fixed** or **Random** via a toggle:
   - **Fixed** → on save, also insert a new row into `products` for that room (so it autocompletes next time). `is_fixed = true`.
   - **Random** → nothing is saved to `products`. `is_fixed = false`, `product_id = null`, just the `item_name` + price live on that one `expenses` row.

## 8a. Domain logic edge cases (define these explicitly, don't leave them to whatever the AI infers while coding)

**Split rounding**: amounts are stored in whole paisa-equivalent (round to 2 decimal places, NPR). When a split doesn't divide evenly (e.g. 100 / 3), give the remainder paisa to the person who paid, so splits always sum exactly to the total — never let rounding cause a settlement to be off by a few paisa.

**Manual split overrides**: when a user unchecks a member from an expense's split, re-divide the amount equally among the remaining checked members (same rounding rule above). At least one member must remain checked.

**Debt simplification determinism**: the greedy largest-creditor/largest-debtor algorithm must produce a stable, repeatable result for the same input — sort balances by amount then by user id as a tiebreaker before running the greedy match, so re-running settlement for the same closed period always shows the same transactions. Treat any balance with `abs(value) < 0.01` as zero (floating point safety) before running the algorithm.

**Member removal mid-period**: removing a member from a room does NOT retroactively change any past expense/bill split — historical rows keep their original `expense_splits`/`bill_splits` rows untouched, preserving what was actually owed at the time. The removed member simply won't appear as an option in future expense/bill entries for that room. If they had an outstanding balance in the currently-open period, show it in the settlement summary as a one-time "settle before leaving" balance rather than silently dropping it.

**Product matching**: case-insensitive, exact-name match within the room (e.g. "Milk" matches "milk"). No fuzzy matching for v1 — it adds complexity for uncertain benefit at this scale. Autocomplete suggestions in the Add Expense form filter on "starts with" as the user types.

## 9. API Surface
Mirrors `lib/apiEndpoints.ts` (Section 4b) 1:1. All room-scoped routes check the caller is a member of `:roomId` before doing anything.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | create account |
| POST | `/api/auth/login` | login |
| POST | `/api/auth/logout` | logout |
| GET | `/api/auth/me` | current user + their rooms |
| POST | `/api/rooms` | create room, caller becomes owner |
| POST | `/api/rooms/join` | join via invite code |
| GET | `/api/rooms` | list caller's rooms |
| GET | `/api/rooms/:roomId` | room detail |
| GET | `/api/rooms/:roomId/members` | list members |
| GET/POST | `/api/rooms/:roomId/products` | list / create fixed products |
| GET/POST | `/api/rooms/:roomId/bills` | list / create a bill (electricity auto-computed server-side) |
| GET/POST | `/api/rooms/:roomId/expenses` | list / create expense (handles fixed/random logic from Section 8) |
| DELETE | `/api/rooms/:roomId/expenses/:id` | delete (creator or room owner only) |
| GET | `/api/rooms/:roomId/settlement` | current period balances + simplified debts |
| POST | `/api/rooms/:roomId/settlement/close` | owner closes period, opens next one |
| GET | `/api/admin/users` | platform admin: list/manage users |
| GET | `/api/admin/rooms` | platform admin: list/manage rooms |

`lib/services/settlement.ts` keeps the same pure debt-simplification function as before, now just parameterized by room membership size instead of a hardcoded 3.

### 9a. Pagination, filtering, sorting
All list endpoints (`expenses`, `bills`, `products`, `admin/users`, `admin/rooms`) accept:
- `?limit=20&cursor=<id>` — cursor-based pagination (default `limit=20`, max `100`).
- `expenses`/`bills` additionally accept `?periodId=` (defaults to the currently-open period if omitted) and `?sort=date_desc|date_asc|amount_desc|amount_asc`.
- `admin/users`/`admin/rooms` additionally accept `?search=` (matches email/name or room name).

### 9b. Idempotency for write endpoints
`POST /api/rooms/:roomId/expenses` and `POST /api/rooms/:roomId/bills` accept an optional `Idempotency-Key` header (client generates a UUID per form submission). The service layer checks for an existing row with that key before inserting, so a flaky network retry or a double-tap on the submit button can't create a duplicate expense. Store the key as a column on `expenses`/`bills` (add `idempotency_key text` to both tables, unique per `room_id`).

### 9c. Validation rules (Zod schemas per endpoint)
- `expense.create`: `quantity > 0`, `unit_price > 0`, `item_name` non-empty, `paid_by` must be a member of the room, sum of `expense_splits.share` must equal `total_amount` (validated server-side, not trusted from client).
- `bill.create` (electricity): `current_unit >= prev_unit`, `rate_per_unit > 0` all required together; other bill types just require `amount > 0`.
- `room.join`: invite code must match the 8-character format from Section 7d before even querying the DB (cheap early rejection).
- Reuse one shared `moneyAmount` Zod schema (positive, max 2 decimal places) across every endpoint that takes a currency value, instead of redefining it per route.

## 10. Admin Panel — proposed MVP scope (confirm or adjust)
Since this wasn't decided, here's the smallest useful version:
- **Users**: view all registered users, disable/re-enable an account.
- **Rooms**: view all rooms with member count and activity, force-delete a room (e.g. abandoned/test rooms).
- **Basic stats**: total users, total rooms, total expenses logged — a single numbers-only overview, no charts needed at this scale.
- Users and Rooms lists both use the pagination + search from Section 9a (`?search=` on email/name or room name) — a flat unpaginated table will break once there are more than a couple dozen rows.
Not included unless you want it: impersonation/support login, content moderation, billing/subscription management — flag if any of these are actually needed.

## 11. Non-goals
No multi-currency, no receipt uploads, no push notifications, no email-based invites (code/link only for now), no per-field granular permissions beyond owner/member, no fuzzy product matching (Section 8a).

## 12. Observability & Dev Experience

**Logging**: minimal is fine for v1 — every API route logs errors server-side with enough context to debug (route name, room id, user id, the underlying error), plus explicit log lines for the events that matter most if something goes wrong later: settlement period closed, room created, room deleted (admin). Plain `console.error`/`console.log` is enough — no external logging service needed at this scale.

**Seed script**: add `scripts/seed.ts` (run via `npm run seed`) that creates 2-3 test users, a couple of rooms with those users as members, a handful of products, and a few weeks of sample bills/expenses — so local development and demoing don't require manually clicking through the whole flow every time.

**Required environment variables** — document these in a `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 13. Realtime Updates (Supabase Realtime)
To support multi-user synchronization inside a room, implement realtime updates using Supabase Realtime (Postgres changes over WebSocket). Full conventions live in `.claude/skills/realtime/SKILL.md` (Section 4i) — summary:

**Scope**: realtime is enabled ONLY for room-scoped data — `expenses` and `bills`. Settlement is kept in sync by invalidating its query (derived refetch), not subscribed to directly. The global dashboard and auth state never use realtime.

**Implementation**:
- Centralized in `lib/realtime.ts` — no component calls `supabase.channel()` directly.
- Subscribe to `postgres_changes` on `expenses` and `bills`, filtered by `room_id`.
- Never mutate UI state directly from a realtime payload. On any insert/update/delete event, call `queryClient.invalidateQueries` for `['expenses', roomId]`, `['bills', roomId]`, and `['settlement', roomId]` and let React Query refetch — this also means duplicate or out-of-order events are handled for free, since a refetch always lands on the true current state rather than trying to patch a payload into the cache.
- Debounce invalidation by ~100-300ms if updates could arrive in a burst.
- Subscriptions use the authenticated Supabase client (RLS still applies to what gets delivered) and are always scoped by `room_id`.
- Clean up subscriptions on unmount — no leaked channels.

**Constraints**: no custom WebSocket server, no polling fallback — Supabase Realtime is the only mechanism for v1.

## 14. Nice-to-haves (not required for v1, but cheap enough to consider once the core flow works)
Room rename, one-tap invite-link copy button, expense editing (not just delete-and-redo), a prominent "You owe / You are owed" summary card on the dashboard.

## 15. Build Order
1. Create the `.claude/skills/` files from Section 4.
2. Scaffold Next.js + Tailwind + shadcn/ui + Supabase, apply the theme (Section 5) globally before any screens are built.
3. Run the schema migration (Section 7, including 7a-7f: indexes, the one-open-period constraint, RLS policies, and the auth-sync trigger) against a new Supabase project.
4. Add `.env.example` (Section 12) and `scripts/seed.ts`, confirm the seed script runs cleanly against the fresh schema.
5. Build `lib/apiEndpoints.ts`, `lib/apiClient.ts`, and the error-handling plumbing (Section 4e) before any feature code.
6. Build `lib/services/settlement.ts` with the debt-simplification function, applying the determinism/rounding rules from Section 8a — write a few manual test cases covering an uneven split and a mid-period member removal.
7. Build auth: register/login/logout, `app/(auth)/`, confirm the auth-sync trigger actually populates `users` on signup.
8. Build the `CurrentRoomProvider` (Section 4g) and the global dashboard: create room / join room / room switcher.
9. Build room-scoped screens in order: Bills (incl. electricity calculator) → Add Expense (incl. fixed/random tagging, optimistic UI, idempotency key) → Products (owner-only view of saved fixed items) → Settlement summary → close period (via the single RPC from Section 7e).
10. Build the platform admin panel (Section 10) with pagination/search, gated by `is_platform_admin` at both the layout and route-handler level (Section 4h).
11. Add basic rate limiting to login and join-room (Section 4h).
12. Wire up `lib/realtime.ts` (Section 13) for expenses and bills once their base CRUD screens work — realtime should be layered onto working queries, not built alongside them.
13. Wire dark mode toggle last.