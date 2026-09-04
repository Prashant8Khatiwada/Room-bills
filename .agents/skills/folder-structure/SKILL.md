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
