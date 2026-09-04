---
name: error-handling
description: Standard API response shape, client-side error handling, and toast/feedback conventions. Read before writing an API route or a data-fetching component.
---

- Every API route returns this shape, always:
    success: { success: true, data: <payload> }
    error:   { success: false, error: { message: string, code?: string } }
- API routes wrap their logic in try/catch, log the real error server-side, and return a generic safe message to the client for unexpected errors (never leak stack traces or raw DB errors to the client).
- `lib/apiClient.ts` centralizes response handling: on `success: false` or a network failure, it throws a typed `ApiError`, and shows a toast automatically (via Sonner) unless the caller opts out — so most components don't need their own try/catch for the common case.
- Wrap the app in a top-level React error boundary (`app/(app)/error.tsx`, `app/(admin)/admin/error.tsx`) so an unhandled render error shows a friendly fallback instead of a blank white screen.
- Form validation errors surface inline on the field (via react-hook-form + zod), not as toasts — toasts are for action-level outcomes (save succeeded/failed, invite sent, period closed), not field validation.
