---
name: security
description: Authorization, rate limiting, and admin-route protection conventions. Read before writing any API route.
---

- RLS is a safety net, not the only check. Every service function in `lib/services/` that touches a room-scoped table must itself verify the caller is a member of that room before querying — don't rely solely on the database to reject unauthorized access, since server-side code sometimes uses the service-role client (which bypasses RLS) for legitimate reasons like the auth-sync trigger or admin routes, and a future bug could reuse that client somewhere it shouldn't.
- Every `app/api/admin/**` route re-checks `is_platform_admin` at the top of the handler, even though the layout guard already checks it — defense in depth, since API routes can in principle be hit directly.
- Basic rate limiting on `/api/auth/login` and `/api/rooms/join` (a simple in-memory or edge-based limiter, e.g. N attempts per IP per minute) — these are the two brute-forceable endpoints (password guessing, invite-code guessing).
- Never return raw database error messages or stack traces to the client (see error-handling skill) — this applies doubly to auth endpoints, where a distinct "user not found" vs "wrong password" error message helps an attacker enumerate accounts.
