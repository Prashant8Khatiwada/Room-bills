---
name: ui-components
description: Component rules — shadcn only, no raw HTML interactive elements. Read before building any UI.
---

- Use shadcn/ui components for every interactive element: `Button`, `Input`, `Select`, `Checkbox`, `Dialog`, `AlertDialog`, `Tabs`, `Card`, `Form` (with react-hook-form + zod), `Sonner` for toasts.
- Never use raw `<button>`, `<input>`, `<select>`, `<form>` tags directly — always the shadcn equivalent, even for the simplest case.
- Confirmation for destructive actions (delete expense, remove member, close settlement period) always goes through shadcn `AlertDialog`, never a native `confirm()`.
- Every list/table view needs a loading skeleton (shadcn `Skeleton`) and an empty state — don't ship a blank screen while data loads or when there's nothing yet.
