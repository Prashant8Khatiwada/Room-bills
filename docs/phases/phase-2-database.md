# Phase 2 — Database & Schema

**Goal**: A clean, fully migrated Supabase Postgres database with all tables, indexes, constraints, RLS policies, auth-sync trigger, and a working seed script.

---

## Deliverables

- [ ] All tables created (users, rooms, room_members, products, settlement_periods, bills, expenses, expense_splits, bill_splits)
- [ ] Idempotency key columns added to `expenses` and `bills`
- [ ] All indexes applied (Section 7a)
- [ ] One-open-period-per-room unique index applied (Section 7b)
- [ ] RLS enabled and policies applied for all tables (Section 7c)
- [ ] Auth-sync trigger created (Section 7f)
- [ ] `close_settlement_period(room_id)` RPC function created (Section 7e)
- [ ] Seed script (`scripts/seed.ts`) created and verified (Section 12)

---

## Tasks

### 2.1 Create Tables

Run the following migration against your Supabase project (via SQL Editor or a migration file):

```sql
-- USERS (mirrors auth.users)
create table users (
  id uuid primary key references auth.users(id),
  name text not null,
  email text not null,
  is_platform_admin boolean not null default false,
  created_at timestamptz default now()
);

-- ROOMS
create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- ROOM MEMBERS
create table room_members (
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references users(id),
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- PRODUCTS (fixed-price catalog per room)
create table products (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  name text not null,
  default_price numeric not null,
  unit_label text,
  created_at timestamptz default now()
);

-- SETTLEMENT PERIODS
create table settlement_periods (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz default now()
);

-- BILLS
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
  idempotency_key text,
  created_at timestamptz default now(),
  unique (room_id, idempotency_key)
);

-- EXPENSES
create table expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  period_id uuid references settlement_periods(id),
  product_id uuid references products(id),
  item_name text not null,
  is_fixed boolean not null default false,
  quantity numeric not null default 1,
  unit_price numeric not null,
  total_amount numeric not null,
  paid_by uuid references users(id) not null,
  expense_date date not null default current_date,
  idempotency_key text,
  created_at timestamptz default now(),
  unique (room_id, idempotency_key)
);

-- EXPENSE SPLITS
create table expense_splits (
  expense_id uuid references expenses(id) on delete cascade,
  user_id uuid references users(id),
  share numeric not null,
  primary key (expense_id, user_id)
);

-- BILL SPLITS
create table bill_splits (
  bill_id uuid references bills(id) on delete cascade,
  user_id uuid references users(id),
  share numeric not null,
  primary key (bill_id, user_id)
);
```

---

### 2.2 Apply Indexes (Section 7a)

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

---

### 2.3 One-Open-Period-Per-Room Constraint (Section 7b)

```sql
create unique index one_open_period_per_room
on settlement_periods (room_id)
where status = 'open';
```

---

### 2.4 RLS Policies (Section 7c)

```sql
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table products enable row level security;
alter table settlement_periods enable row level security;
alter table bills enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table bill_splits enable row level security;

-- Rooms
create policy "Members can access their rooms"
on rooms for select using (
  exists (select 1 from room_members rm where rm.room_id = rooms.id and rm.user_id = auth.uid())
);

-- Room Members
create policy "Members can view room membership"
on room_members for select using (
  exists (select 1 from room_members rm where rm.room_id = room_members.room_id and rm.user_id = auth.uid())
);

-- Products
create policy "Members can access room products"
on products for all using (
  exists (select 1 from room_members rm where rm.room_id = products.room_id and rm.user_id = auth.uid())
);

-- Settlement Periods
create policy "Members can access room settlement periods"
on settlement_periods for all using (
  exists (select 1 from room_members rm where rm.room_id = settlement_periods.room_id and rm.user_id = auth.uid())
);

-- Bills
create policy "Members can access room bills"
on bills for all using (
  exists (select 1 from room_members rm where rm.room_id = bills.room_id and rm.user_id = auth.uid())
);

-- Expenses
create policy "Members can access room expenses"
on expenses for all using (
  exists (select 1 from room_members rm where rm.room_id = expenses.room_id and rm.user_id = auth.uid())
);

-- Expense Splits
create policy "Members can access expense splits"
on expense_splits for all using (
  exists (
    select 1 from expenses e join room_members rm on rm.room_id = e.room_id
    where e.id = expense_splits.expense_id and rm.user_id = auth.uid()
  )
);

-- Bill Splits
create policy "Members can access bill splits"
on bill_splits for all using (
  exists (
    select 1 from bills b join room_members rm on rm.room_id = b.room_id
    where b.id = bill_splits.bill_id and rm.user_id = auth.uid()
  )
);
```

> ⚠️ Admin API routes use the **service-role key** (bypasses RLS). Every admin route handler must **also** check `is_platform_admin` in code — never rely on RLS alone for admin gating.

---

### 2.5 Auth-Sync Trigger (Section 7f)

Automatically creates a row in `public.users` when a user registers via Supabase Auth:

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

---

### 2.6 Settlement Period Close RPC (Section 7e)

Close current period and open the next — atomically:

```sql
create or replace function close_settlement_period(p_room_id uuid)
returns void as $$
declare
  v_period_id uuid;
begin
  -- Find and close the open period
  update settlement_periods
  set status = 'closed', end_date = current_date
  where room_id = p_room_id and status = 'open'
  returning id into v_period_id;

  if v_period_id is null then
    raise exception 'No open period found for room %', p_room_id;
  end if;

  -- Open the next period
  insert into settlement_periods (room_id, start_date, end_date, status)
  values (p_room_id, current_date + 1, (date_trunc('month', current_date + 1) + interval '1 month - 1 day')::date, 'open');
end;
$$ language plpgsql;
```

---

### 2.7 Seed Script (`scripts/seed.ts`)

Create `scripts/seed.ts` runnable via `npm run seed`. It should:

1. Sign up 3 test users via Supabase Auth (so the trigger fires and creates `users` rows).
2. Create 2 rooms — User A is owner of Room 1, User B is owner of Room 2; User C joins both.
3. Add a handful of products (fixed items) to each room.
4. Add 3–4 weeks of sample bills (rent, electricity, wifi) and expenses per room.
5. Print a summary of created records on success.

Add to `package.json`:

```json
"scripts": {
  "seed": "tsx scripts/seed.ts"
}
```

---

## Invite Code Design (Section 7d)

- 8-character, uppercase alphanumeric, excluding `0`, `O`, `1`, `I`.
- Generated server-side on room creation (not in the DB).
- Unique constraint on `rooms.invite_code`.
- No expiry in v1. Room owner can regenerate from room settings (updates the column, invalidating the old code).

---

## Domain Logic to Enforce at the Service Layer

| Rule | Where |
|------|-------|
| `period_id` is always resolved server-side (never passed by client) | `lib/services/bills.ts`, `lib/services/expenses.ts` |
| Split rounding: remainder goes to the payer | `lib/services/expenses.ts`, `lib/services/bills.ts` |
| At least one member must remain in a split | `lib/services/expenses.ts` |
| Removed members' historical splits are never mutated | `lib/services/rooms.ts` |

---

## Definition of Done

- All tables exist in Supabase with correct columns, types, and constraints.
- `npm run seed` completes without errors and shows created records.
- Manually registering a user in Supabase Auth creates a matching row in `public.users`.
- Attempting to insert a second open period for the same room fails with a unique constraint error.

---

## Branch

`chore/database-schema`
