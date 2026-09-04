---
name: theming
description: How color and design tokens are defined and applied globally. Read before styling any component.
---

- All colors are CSS variables defined once in `app/globals.css` (see the palette in the main build spec) and exposed to Tailwind via `tailwind.config.ts` `theme.extend.colors`.
- Never hardcode a hex value or a raw Tailwind color class (e.g. `bg-indigo-600`) inside a component. Always use the semantic token (`bg-primary`, `text-danger`, `bg-muted`).
- Light and dark mode both read from the same token names — only the CSS variable values differ under `.dark`.
- If a new semantic need comes up (e.g. a new status color), add a new token to `globals.css` + `tailwind.config.ts` first, then use it — don't reach for a raw color as a shortcut.
