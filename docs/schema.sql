-- Phase 2 Database Migration Schema

-- USERS (mirrors auth.users)
create table if not exists users (
  id uuid primary key references auth.users(id),
  name text not null,
  email text not null,
  is_platform_admin boolean not null default false,
  created_at timestamptz default now()
);

-- ROOMS
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- ROOM MEMBERS
create table if not exists room_members (
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references users(id),
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- PRODUCTS (fixed-price catalog per room)
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  name text not null,
  default_price numeric not null,
  unit_label text,
  created_at timestamptz default now()
);

-- SETTLEMENT PERIODS
create table if not exists settlement_periods (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz default now()
);

-- BILLS
create table if not exists bills (
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
create table if not exists expenses (
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
create table if not exists expense_splits (
  expense_id uuid references expenses(id) on delete cascade,
  user_id uuid references users(id),
  share numeric not null,
  primary key (expense_id, user_id)
);

-- BILL SPLITS
create table if not exists bill_splits (
  bill_id uuid references bills(id) on delete cascade,
  user_id uuid references users(id),
  share numeric not null,
  primary key (bill_id, user_id)
);

-- INDEXES
create index if not exists idx_room_members_user on room_members(user_id);
create index if not exists idx_room_members_room on room_members(room_id);
create index if not exists idx_expenses_room on expenses(room_id);
create index if not exists idx_expenses_period on expenses(period_id);
create index if not exists idx_bills_room on bills(room_id);
create index if not exists idx_bills_period on bills(period_id);
create index if not exists idx_products_room on products(room_id);
create index if not exists idx_settlement_periods_room on settlement_periods(room_id);

-- CONSTRAINTS
create unique index if not exists one_open_period_per_room
on settlement_periods (room_id)
where status = 'open';

-- RLS POLICIES
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table products enable row level security;
alter table settlement_periods enable row level security;
alter table bills enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table bill_splits enable row level security;

do $$ begin
  create policy "Members can access their rooms" on rooms for select using (
    exists (select 1 from room_members rm where rm.room_id = rooms.id and rm.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Members can view room membership" on room_members for select using (
    exists (select 1 from room_members rm where rm.room_id = room_members.room_id and rm.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Members can access room products" on products for all using (
    exists (select 1 from room_members rm where rm.room_id = products.room_id and rm.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Members can access room settlement periods" on settlement_periods for all using (
    exists (select 1 from room_members rm where rm.room_id = settlement_periods.room_id and rm.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Members can access room bills" on bills for all using (
    exists (select 1 from room_members rm where rm.room_id = bills.room_id and rm.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Members can access room expenses" on expenses for all using (
    exists (select 1 from room_members rm where rm.room_id = expenses.room_id and rm.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Members can access expense splits" on expense_splits for all using (
    exists (
      select 1 from expenses e join room_members rm on rm.room_id = e.room_id
      where e.id = expense_splits.expense_id and rm.user_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Members can access bill splits" on bill_splits for all using (
    exists (
      select 1 from bills b join room_members rm on rm.room_id = b.room_id
      where b.id = bill_splits.bill_id and rm.user_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;

-- AUTH SYNC TRIGGER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email);
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
