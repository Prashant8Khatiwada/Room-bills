-- UNIFIED DATABASE SCHEMA MIGRATION FOR ROOM BILLS & EXPENSES APP
-- Reflects unified 'bills' table and unified 'bill_templates' catalog table.

-- 1. Users Table (public reference table for auth users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  total_income NUMERIC(12, 2) DEFAULT 0,
  warning_limit NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'Rs.',
  settlement_frequency TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'biweekly' | 'weekly' | 'custom'
  recurring_settlement_day INT NOT NULL DEFAULT 1,
  target_budget NUMERIC(12, 2) DEFAULT 0,
  min_balance_required NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Room Members Table
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'member'
  allocated_balance NUMERIC(12, 2) DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- 3b. Personal Expenses Table (Top-Level Non-Room Expenses)
CREATE TABLE IF NOT EXISTS public.personal_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 4. Settlement Periods Table
CREATE TABLE IF NOT EXISTS public.settlement_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'closed'
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Unified Bill Templates Table (Serves Room Catalog for both Bills & Expenses)
CREATE TABLE IF NOT EXISTS public.bill_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' | 'quantity' | 'metered'
  bill_category TEXT NOT NULL DEFAULT 'rent', -- 'rent' (Bills) | 'expense' (Expenses)
  type TEXT DEFAULT 'custom',
  default_amount NUMERIC(12, 2) DEFAULT 0,
  rate_per_unit NUMERIC(12, 2),
  status TEXT NOT NULL DEFAULT 'approved', -- 'draft' | 'approved'
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Unified Bills & Expenses Table (Replaces old separate expenses table)
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.settlement_periods(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'rent', -- 'rent' (Bills) | 'expense' (Expenses)
  type TEXT NOT NULL DEFAULT 'rent', -- 'rent' | 'electricity' | 'waste' | 'wifi' | 'expense' | 'custom'
  name TEXT NOT NULL,
  month TEXT, -- YYYY-MM or Date string
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quantity NUMERIC(12, 2),
  unit_price NUMERIC(12, 2),
  prev_unit NUMERIC(12, 2),
  current_unit NUMERIC(12, 2),
  rate_per_unit NUMERIC(12, 2),
  expense_date DATE DEFAULT CURRENT_DATE,
  product_id UUID REFERENCES public.bill_templates(id) ON DELETE SET NULL,
  paid_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Bill Splits Table
CREATE TABLE IF NOT EXISTS public.bill_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  share NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bill_id, user_id)
);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLEANUP INSTRUCTION: DROP OLD DISCARDED TABLES IF THEY EXIST
DROP TABLE IF EXISTS public.expense_splits CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
