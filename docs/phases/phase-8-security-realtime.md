# Phase 8 — Security, Realtime & Dark Mode

**Goal**: Layer on the final hardening, multi-user synchronization, and dark mode toggle. This phase is intentionally last because it wraps working features rather than building new ones.

---

## Deliverables

- [ ] Rate limiting on `/api/auth/login` and `/api/rooms/join`
- [ ] `lib/realtime.ts` — centralized Supabase Realtime subscriptions for `expenses` and `bills`
- [ ] Realtime wired into the Expenses and Bills pages (via React Query invalidation)
- [ ] Dark mode toggle (system preference + manual override)
- [ ] Final security audit checklist completed

---

## Tasks

### 8.1 Rate Limiting

Apply **before** other logic in two specific route handlers:

| Endpoint | Limit | Reason |
|----------|-------|--------|
| `POST /api/auth/login` | 5 attempts / IP / minute | Password brute force |
| `POST /api/rooms/join` | 10 attempts / IP / minute | Invite code guessing |

**Implementation** — simple in-memory limiter using an LRU map (or use the `lru-cache` package):

```ts
// lib/rateLimit.ts
import { LRUCache } from 'lru-cache';

const rateLimitMap = new LRUCache<string, number[]>({ max: 500 });

export function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter(t => now - t < windowMs);
  if (recent.length >= limit) return false; // blocked
  rateLimitMap.set(ip, [...recent, now]);
  return true; // allowed
}
```

Usage in route handler:
```ts
const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
if (!rateLimit(ip, 5, 60_000)) {
  return err('Too many attempts. Please try again later.', 429);
}
```

> **Note**: In-memory limiter doesn't share state across multiple Next.js instances (e.g., in production on Vercel). For single-instance or low-traffic v1 this is acceptable — upgrade to Redis-based limiting (e.g., Upstash) if/when needed.

---

### 8.2 Supabase Realtime (`lib/realtime.ts`)

**Central rule**: no component ever calls `supabase.channel()` directly. All realtime subscription logic lives here.

```ts
// lib/realtime.ts

import { supabase } from './supabase/client';
import { QueryClient } from '@tanstack/react-query';

export function subscribeToRoom(roomId: string, queryClient: QueryClient) {
  let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

  function debounceInvalidate() {
    if (invalidateTimer) clearTimeout(invalidateTimer);
    invalidateTimer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['expenses', roomId] });
      queryClient.invalidateQueries({ queryKey: ['bills', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
    }, 150); // 100-300ms debounce
  }

  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'expenses', filter: `room_id=eq.${roomId}` },
      debounceInvalidate
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bills', filter: `room_id=eq.${roomId}` },
      debounceInvalidate
    )
    .subscribe();

  // Return cleanup function
  return () => {
    if (invalidateTimer) clearTimeout(invalidateTimer);
    supabase.removeChannel(channel);
  };
}
```

**Wire into the room layout** (`app/(app)/rooms/[roomId]/layout.tsx`):

```tsx
'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToRoom } from '@/lib/realtime';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';

export function RoomRealtimeWatcher() {
  const { roomId } = useCurrentRoom();
  const queryClient = useQueryClient();

  useEffect(() => {
    const cleanup = subscribeToRoom(roomId, queryClient);
    return cleanup; // unsubscribes on unmount — no leaked channels
  }, [roomId, queryClient]);

  return null; // renders nothing, side-effect only
}
```

Mount `<RoomRealtimeWatcher />` inside the room layout, **after** confirming that expenses and bills base queries work correctly.

---

### 8.3 Realtime Scope & Constraints

| Subscribed | Not subscribed | Why |
|-----------|---------------|-----|
| `expenses` (filtered by `room_id`) | global dashboard | Only room-scoped data needs sync |
| `bills` (filtered by `room_id`) | auth state | Too low-frequency to need realtime |
| *(derived)* `settlement` | settlement directly | Refreshed via query invalidation, not a separate subscription |

**RLS applies to realtime**: the authenticated Supabase client means a user only receives events for rooms they're a member of (the RLS filter on `room_members` is enforced by the Supabase Realtime server before delivery).

**Duplicate event safety**: since the handler always calls `invalidateQueries` (never mutates cache directly), duplicate or out-of-order events cause at most one extra refetch — always landing on true current state.

---

### 8.4 Dark Mode Toggle

**Implementation**:
- Use `next-themes` library: `npm install next-themes`.
- Wrap `app/layout.tsx` with `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`.
- Tailwind already supports `.dark` class on `<html>` (this is how shadcn/ui dark mode works by default).
- Add a toggle button in the top nav (sun/moon icon, shadcn `Button` variant="ghost").
- Preference persisted in `localStorage` via `next-themes`.

**Theme tokens**: the `:root` and `.dark` CSS variables are already defined in Phase 1. Dark mode requires no additional color work — just make sure every component uses semantic tokens (not raw color classes), which the theming skill enforces.

---

### 8.5 Final Security Audit Checklist

Run through this checklist before considering the app production-ready:

#### API Routes
- [ ] Every room-scoped route calls `assertRoomMember(roomId, userId)` before touching data.
- [ ] Every admin route re-checks `is_platform_admin` in the handler body (not just the layout).
- [ ] No route handler ever returns a raw Supabase error or stack trace.
- [ ] No route handler ever accepts `period_id` from the client — always resolved server-side.

#### Auth
- [ ] Login error message is generic — doesn't distinguish "user not found" from "wrong password".
- [ ] Rate limiter is active on `/api/auth/login` and `/api/rooms/join`.
- [ ] Session check in `app/(app)/layout.tsx` redirects on missing session.
- [ ] `app/(admin)/admin/layout.tsx` redirects non-admins.

#### Data Integrity
- [ ] `sum(expense_splits.share)` validated server-side to equal `total_amount`.
- [ ] Electricity `current_unit >= prev_unit` validated server-side.
- [ ] Idempotency key prevents duplicate bill/expense on double-submit.
- [ ] One-open-period-per-room DB constraint is in place.

#### Frontend
- [ ] No raw `<button>`, `<input>`, `<select>`, `<form>` tags — all shadcn components.
- [ ] All destructive actions use `AlertDialog`, not native `confirm()`.
- [ ] No hardcoded hex values or raw Tailwind color classes in components.
- [ ] All API calls go through `apiClient`, never direct `fetch`.

---

## Definition of Done

- Logging in 6 times in a minute from the same IP → 6th attempt returns `429 Too many attempts`.
- Open the same room in two browser windows — adding an expense in one updates the list in the other within ~1 second.
- Close browser tab while subscribed to a room → no leaked WebSocket channels (verify in browser DevTools network tab).
- Toggle dark mode → persists across page refresh.
- All items in the security audit checklist are checked off.

---

## Branch

`feature/security-realtime-darkmode`
