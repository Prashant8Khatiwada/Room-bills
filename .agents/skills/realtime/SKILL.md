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
