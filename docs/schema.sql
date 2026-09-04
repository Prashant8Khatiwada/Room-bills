-- Phase 2 Database Migration Schema (Idempotent / Clean Migration)

-- Clean reset of existing tables and functions
drop table if exists bill_splits cascade;
drop table if exists expense_splits cascade;
drop table if exists expenses cascade;
drop table if exists bills cascade;
drop table if exists settlement_periods cascade;
drop table if exists products cascade;
drop table if exists room_members cascade;
drop table if exists rooms cascade;
drop table if exists users cascade;
drop function if exists is_room_member cascade;

-- USERS (mirrors auth.users)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
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
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

-- ROOM MEMBERS
create table room_members (
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
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
  paid_by uuid references users(id) on delete set null,
  idempotency_key text,
  created_at timestamptz default now(),
  unique (room_id, idempotency_key)
);

-- EXPENSES
create table expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  period_id uuid references settlement_periods(id),
  product_id uuid references products(id) on delete set null,
  item_name text not null,
  is_fixed boolean not null default false,
  quantity numeric not null default 1,
  unit_price numeric not null,
  total_amount numeric not null,
  paid_by uuid references users(id) on delete set null,
  expense_date date not null default current_date,
  idempotency_key text,
  created_at timestamptz default now(),
  unique (room_id, idempotency_key)
);

-- EXPENSE SPLITS
create table expense_splits (
  expense_id uuid references expenses(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  share numeric not null,
  primary key (expense_id, user_id)
);

-- BILL SPLITS
create table bill_splits (
  bill_id uuid references bills(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  share numeric not null,
  primary key (bill_id, user_id)
);

-- INDEXES
create index idx_room_members_user on room_members(user_id);
create index idx_room_members_room on room_members(room_id);
create index idx_expenses_room on expenses(room_id);
create index idx_expenses_period on expenses(period_id);
create index idx_bills_room on bills(room_id);
create index idx_bills_period on bills(period_id);
create index idx_products_room on products(room_id);
create index idx_settlement_periods_room on settlement_periods(room_id);

-- CONSTRAINTS
create unique index one_open_period_per_room
on settlement_periods (room_id)
where status = 'open';

-- RLS POLICIES
alter table users enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table products enable row level security;
alter table settlement_periods enable row level security;
alter table bills enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table bill_splits enable row level security;

-- USERS POLICIES
create policy "Users can view all users" on users for select using (true);
create policy "Users can update own profile" on users for update using (auth.uid() = id);

-- ROOMS POLICIES
create policy "Authenticated users can view rooms" on rooms for select using (auth.uid() is not null);
create policy "Authenticated users can create rooms" on rooms for insert with check (auth.uid() is not null);
create policy "Authenticated users can update rooms" on rooms for update using (auth.uid() is not null);
create policy "Authenticated users can delete rooms" on rooms for delete using (auth.uid() is not null);

-- ROOM MEMBERS POLICIES
create policy "Authenticated users can view room members" on room_members for select using (auth.uid() is not null);
create policy "Authenticated users can insert room members" on room_members for insert with check (auth.uid() is not null);
create policy "Authenticated users can update room members" on room_members for update using (auth.uid() is not null);
create policy "Authenticated users can delete room members" on room_members for delete using (auth.uid() is not null);

-- PRODUCTS POLICIES
create policy "Authenticated users can access products" on products for all using (auth.uid() is not null);

-- SETTLEMENT PERIODS POLICIES
create policy "Authenticated users can access settlement periods" on settlement_periods for all using (auth.uid() is not null);

-- BILLS POLICIES
create policy "Authenticated users can access bills" on bills for all using (auth.uid() is not null);

-- EXPENSES POLICIES
create policy "Authenticated users can access expenses" on expenses for all using (auth.uid() is not null);

-- EXPENSE SPLITS POLICIES
create policy "Authenticated users can access expense splits" on expense_splits for all using (auth.uid() is not null);

-- BILL SPLITS POLICIES
create policy "Authenticated users can access bill splits" on bill_splits for all using (auth.uid() is not null);

-- AUTH SYNC TRIGGER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email)
  on conflict (id) do update set name = excluded.name, email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- SETTLEMENT PERIOD CLOSE RPC
create or replace function close_settlement_period(p_room_id uuid)
returns void as $$
declare
  v_period_id uuid;
begin
  update settlement_periods
  set status = 'closed', end_date = current_date
  where room_id = p_room_id and status = 'open'
  returning id into v_period_id;

  if v_period_id is null then
    raise exception 'No open period found for room %', p_room_id;
  end if;

  insert into settlement_periods (room_id, start_date, end_date, status)
  values (p_room_id, current_date + 1, (date_trunc('month', current_date + 1) + interval '1 month - 1 day')::date, 'open');
end;
$$ language plpgsql;
