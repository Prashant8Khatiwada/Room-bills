---
name: frontend-architecture
description: State management, room context, auth guarding, and optimistic UI conventions. Read before building any data-fetching component.
---

- Use **React Query** (`@tanstack/react-query`) for all server state — every `apiClient` call in a component goes through `useQuery`/`useMutation`, never raw `useEffect` + `fetch`/`apiClient` calls.
- Cache invalidation: after any mutation (create/update/delete expense, bill, product, settlement close), invalidate the relevant query keys (`['expenses', roomId, periodId]`, `['settlement', roomId]`, etc.) rather than manually patching cache state.
- A global `CurrentRoomProvider` (React context) holds the active `roomId` once a user picks/switches rooms, so nested components read it via a `useCurrentRoom()` hook instead of every component needing `roomId` passed down as a prop or re-read from the URL.
- Auth guarding happens at the layout level, not per-page: `app/(app)/layout.tsx` checks the session server-side (via Supabase server client) and redirects to `/login` if absent; `app/(admin)/admin/layout.tsx` additionally checks `is_platform_admin` and redirects to the dashboard if false. Don't re-implement this check in individual pages.
- Optimistic updates for Add Expense and Delete Expense (instant UI feedback, roll back via React Query's `onError` if the request fails) — these are the two highest-frequency actions in the app, so they're worth the extra code; other mutations (bills, products, settlement close) can just show a loading state, no need to optimistically update those.
