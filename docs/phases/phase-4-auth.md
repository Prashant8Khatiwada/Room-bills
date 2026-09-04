# Phase 4 — Authentication

**Goal**: Full email/password auth flow — register, login, logout, session persistence — with the auth-sync trigger confirmed working and auth guarding in place at the layout level.

---

## Deliverables

- [ ] `POST /api/auth/register` — creates Supabase Auth user (trigger auto-creates `public.users` row)
- [ ] `POST /api/auth/login` — authenticates, sets session cookie
- [ ] `POST /api/auth/logout` — clears session
- [ ] `GET /api/auth/me` — returns current user + list of their rooms
- [ ] `app/(auth)/register/page.tsx` — Register screen
- [ ] `app/(auth)/login/page.tsx` — Login screen
- [ ] `app/(app)/layout.tsx` — auth guard (server-side session check → redirect to `/login` if absent)
- [ ] Auth-sync trigger verified: signing up creates a matching `public.users` row

---

## Tasks

### 4.1 Supabase Client Setup

Create two Supabase clients:

**`lib/supabase/client.ts`** — browser client (for client components):
```ts
import { createBrowserClient } from '@supabase/ssr';
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**`lib/supabase/server.ts`** — server client (for route handlers and server components):
```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
// reads session from cookies automatically
```

**`lib/supabase/admin.ts`** — service-role client (admin routes only, bypasses RLS):
```ts
// Uses SUPABASE_SERVICE_ROLE_KEY
// NEVER import this in client components or non-admin routes
```

---

### 4.2 API Route Handlers

#### `POST /api/auth/register`

Zod schema:
```ts
z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
})
```

Logic:
1. Validate input with Zod.
2. Call `supabase.auth.signUp({ email, password, options: { data: { name } } })`.
3. The auth-sync trigger automatically inserts into `public.users`.
4. Return `{ success: true, data: { message: 'Check your email to confirm your account.' } }`.
5. On error: return safe generic message — never expose Supabase's raw error.

#### `POST /api/auth/login`

Zod schema:
```ts
z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
```

Logic:
1. Validate input.
2. Call `supabase.auth.signInWithPassword`.
3. Set session cookies via `@supabase/ssr` cookie helpers.
4. Return `{ success: true, data: { user } }`.
5. On error: return a **generic** "Invalid credentials" message — never distinguish "user not found" from "wrong password" (account enumeration prevention, per security skill).

> ⚠️ Rate limiting is added in Phase 8. This endpoint is specifically called out as brute-forceable.

#### `POST /api/auth/logout`

1. Call `supabase.auth.signOut()`.
2. Clear session cookies.
3. Return `{ success: true, data: null }`.

#### `GET /api/auth/me`

1. Get session from cookie (server Supabase client).
2. If no session → `401`.
3. Fetch `public.users` row + list of rooms the user belongs to.
4. Return `{ success: true, data: { user, rooms } }`.

---

### 4.3 Auth Service Layer

`lib/services/auth.ts`:

```ts
export async function registerUser(name: string, email: string, password: string): Promise<...>
export async function loginUser(email: string, password: string): Promise<...>
export async function logoutUser(): Promise<void>
export async function getCurrentUser(supabase: SupabaseServerClient): Promise<User | null>
```

Route handlers call these — no Supabase calls inline in route files.

---

### 4.4 Auth Guard at Layout Level

`app/(app)/layout.tsx`:
```tsx
// Server component
const supabase = createServerClient();
const { data: { session } } = await supabase.auth.getSession();
if (!session) redirect('/login');
```

This is the **only place** the auth check happens — do not re-implement it in individual pages.

`app/(admin)/admin/layout.tsx` additionally checks `is_platform_admin`:
```tsx
const user = await getCurrentUser(supabase);
if (!user?.is_platform_admin) redirect('/dashboard');
```

---

### 4.5 Register Screen (`app/(auth)/register/page.tsx`)

Fields: Name, Email, Password, Confirm Password.

- Built with shadcn `Form` + `Input` + `Button`.
- Validation: react-hook-form + Zod (inline field errors, not toasts).
- On success: show toast "Check your email to confirm your account" and redirect to `/login`.
- On error: show toast with the returned error message.
- Link to login page.

---

### 4.6 Login Screen (`app/(auth)/login/page.tsx`)

Fields: Email, Password.

- Same form pattern as register.
- On success: redirect to `/dashboard`.
- On error: show toast "Invalid email or password" (generic — never leak which field was wrong).
- Link to register page.

---

### 4.7 Verify Auth-Sync Trigger

After building register:
1. Register a new user via the UI.
2. Check Supabase → `public.users` table → confirm a row was created with the correct `id`, `name`, and `email`.
3. If the trigger isn't firing: debug via Supabase Logs → check `auth.users` insert vs. trigger execution.

---

## UI Notes

- Auth pages live outside the app shell (`app/(auth)/layout.tsx` — a minimal centered layout, no nav).
- Use the themed indigo primary color for the submit button.
- Show a loading spinner on the button while the request is in flight.
- Empty state between submission and redirect: show "Redirecting…" text to avoid double-submit confusion.

---

## Definition of Done

- Register → confirm email → login → land on `/dashboard` (even if dashboard is empty for now) works end-to-end.
- Registering creates a row in `public.users` (verify in Supabase Studio).
- Visiting `/dashboard` without a session redirects to `/login`.
- Login with wrong password shows "Invalid email or password" — not "User not found".
- Logout clears the session and redirects to `/login`.

---

## Branch

`feature/auth`
