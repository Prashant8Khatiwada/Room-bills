# Phase 7 — Admin Panel

**Goal**: Build the platform admin panel — accessible only to users with `is_platform_admin = true` — with user management, room management, and a basic stats overview.

---

## Deliverables

- [ ] `GET /api/admin/users` — list all users (paginated + search)
- [ ] `PATCH /api/admin/users/:id` — disable/re-enable a user account
- [ ] `GET /api/admin/rooms` — list all rooms (paginated + search)
- [ ] `DELETE /api/admin/rooms/:id` — force-delete a room
- [ ] `GET /api/admin/stats` — total users, total rooms, total expenses
- [ ] `app/(admin)/admin/layout.tsx` — admin layout with `is_platform_admin` guard
- [ ] `app/(admin)/admin/page.tsx` — stats overview
- [ ] `app/(admin)/admin/users/page.tsx` — user management
- [ ] `app/(admin)/admin/rooms/page.tsx` — room management

---

## Security Rules (non-negotiable)

Every single admin route handler must:
1. Get the session from the server Supabase client.
2. Fetch the `users` row and check `is_platform_admin === true`.
3. Return `403` immediately if not. **This check is in every handler**, not just the layout.

The layout guard is defense-in-breadth (better UX, redirects non-admins). The per-handler check is defense-in-depth (API routes can be hit directly, bypassing the layout).

Admin routes use the **service-role Supabase client** (`lib/supabase/admin.ts`) to bypass RLS — this is the only place that client is used.

---

## Tasks

### 7.1 Admin Service Layer (`lib/services/admin.ts`)

```ts
export async function listAdminUsers(opts: PaginationOpts & { search?: string }): Promise<AdminUser[]>
export async function setUserDisabled(userId: string, disabled: boolean): Promise<void>
export async function listAdminRooms(opts: PaginationOpts & { search?: string }): Promise<AdminRoom[]>
export async function forceDeleteRoom(roomId: string): Promise<void>
export async function getPlatformStats(): Promise<{ totalUsers: number, totalRooms: number, totalExpenses: number }>
```

> All these functions use the service-role client internally — they must never be called from non-admin routes.

---

### 7.2 API Route Handlers

#### `GET /api/admin/users`

Query params: `?limit=20&cursor=<id>&search=<text>`
- Search matches on `email` or `name` (case-insensitive `ILIKE`).
- Returns paginated list of users with `id`, `name`, `email`, `is_platform_admin`, `disabled` (if Supabase provides it), `created_at`.

#### `PATCH /api/admin/users/:id`

Body: `{ disabled: boolean }`
- Calls Supabase Admin Auth API to disable/re-enable the user (not just a DB flag — actual auth session block).
- Cannot disable your own account (check `userId !== sessionUserId`).
- Cannot disable another platform admin.

#### `GET /api/admin/rooms`

Query params: `?limit=20&cursor=<id>&search=<text>`
- Search matches on room `name`.
- Returns paginated list: `id`, `name`, `invite_code`, `member_count`, `created_at`, `created_by` (name + email).

#### `DELETE /api/admin/rooms/:id`

- Force-deletes the room and all its related data (cascade handled by DB foreign keys).
- Logs: `console.log('Admin force-deleted room', { roomId, adminUserId })`.

#### `GET /api/admin/stats`

Returns:
```ts
{
  totalUsers: number,     // count of public.users
  totalRooms: number,     // count of rooms
  totalExpenses: number,  // count of expenses across all rooms
}
```

---

### 7.3 Admin Layout (`app/(admin)/admin/layout.tsx`)

Server component:
```tsx
const session = await getServerSession();
if (!session) redirect('/login');

const user = await getAdminUser(session.user.id); // uses service-role client
if (!user.is_platform_admin) redirect('/dashboard');
```

Renders a simple admin shell with:
- Top nav: "Admin Panel" title, current admin user's name, "Back to App" link.
- Side nav: Overview | Users | Rooms.

---

### 7.4 Stats Overview (`app/(admin)/admin/page.tsx`)

Three metric cards side by side:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Total Users    │  │  Total Rooms    │  │ Total Expenses  │
│     1,234       │  │      87         │  │    45,231       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

- Numbers only — no charts needed at this scale.
- Data fetched via `useQuery(['admin', 'stats'])`.
- Loading: `Skeleton` on each card.

---

### 7.5 Users Management (`app/(admin)/admin/users/page.tsx`)

Table columns: Name | Email | Platform Admin? | Status | Actions

- **Search bar** at top (filters by name or email, debounced ~300ms).
- **Pagination**: cursor-based, "Load more" button at bottom.
- **Actions per row**:
  - Disable/Enable toggle button (with `AlertDialog` confirmation).
  - Disabled users shown with a visual indicator (muted row, badge).
- Cannot disable yourself or another admin (button disabled + tooltip).

---

### 7.6 Rooms Management (`app/(admin)/admin/rooms/page.tsx`)

Table columns: Room Name | Members | Created By | Created At | Invite Code | Actions

- **Search bar** (filters by room name).
- **Pagination**: cursor-based.
- **Actions per row**:
  - **Force Delete** (with `AlertDialog`: "This will permanently delete the room and all its data. This cannot be undone.").

---

### 7.7 Logging

Log the following events server-side when they occur in admin routes:

```ts
console.log('[ADMIN] Room force-deleted', { roomId, adminUserId });
console.log('[ADMIN] User disabled', { targetUserId, adminUserId });
console.log('[ADMIN] User re-enabled', { targetUserId, adminUserId });
```

---

## Definition of Done

- Visiting `/admin` as a non-admin user redirects to `/dashboard`.
- Directly calling `DELETE /api/admin/rooms/:id` without `is_platform_admin = true` returns `403`.
- Stats card shows correct counts matching the database.
- Search in Users table filters results correctly.
- Disabling a user prevents them from logging in (verify with Supabase Auth dashboard).
- Force-deleting a room removes it and all related rows (verify in Supabase Studio).
- Admin cannot disable their own account.

---

## Branch

`feature/admin-panel`
