# Phase 1 — Project Setup & Conventions

**Goal**: Get a fully scaffolded, themed, convention-enforced skeleton where every developer (or AI agent) can start contributing immediately with zero ambiguity.

---

## Deliverables

- [ ] Next.js 14+ App Router project scaffolded with TypeScript
- [ ] Tailwind CSS + shadcn/ui configured
- [ ] Color theme applied globally (`app/globals.css` + `tailwind.config.ts`)
- [ ] All `.claude/skills/` convention files created
- [ ] `.env.example` committed
- [ ] Folder structure validated against the skill file

---

## Tasks

### 1.1 Scaffold the Project

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=no \
  --import-alias "@/*"
```

Install additional dependencies:

```bash
npm install @supabase/supabase-js @supabase/ssr \
  @tanstack/react-query \
  react-hook-form @hookform/resolvers \
  zod \
  sonner \
  date-fns

npx shadcn@latest init
npx shadcn@latest add button input select checkbox dialog alert-dialog tabs card form skeleton sonner
```

---

### 1.2 Create `.claude/skills/` Convention Files

Create the following files exactly as defined in **Section 4** of `productOverview.md`:

| File | Purpose |
|------|---------|
| `.claude/skills/folder-structure/SKILL.md` | Where every file lives |
| `.claude/skills/api-endpoints/SKILL.md` | API path naming conventions |
| `.claude/skills/theming/SKILL.md` | Color tokens, no raw hex values |
| `.claude/skills/ui-components/SKILL.md` | shadcn-only interactive elements |
| `.claude/skills/error-handling/SKILL.md` | Standard API response shape |
| `.claude/skills/git-workflow/SKILL.md` | Branching & commit conventions |
| `.claude/skills/frontend-architecture/SKILL.md` | React Query, CurrentRoomProvider, auth guard |
| `.claude/skills/security/SKILL.md` | RLS, rate limiting, admin defense-in-depth |
| `.claude/skills/realtime/SKILL.md` | Supabase Realtime conventions |

> ⚠️ These files are the **source of truth** for all conventions — re-read them before writing any feature code.

---

### 1.3 Apply Global Color Theme

Paste the CSS variable palette from **Section 5** of the spec into `app/globals.css` (both `:root` and `.dark` blocks).

Wire into `tailwind.config.ts` under `theme.extend.colors`:

```ts
colors: {
  primary: 'hsl(var(--primary) / <alpha-value>)',
  'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
  accent: 'hsl(var(--accent) / <alpha-value>)',
  'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',
  success: 'hsl(var(--success) / <alpha-value>)',
  'success-foreground': 'hsl(var(--success-foreground) / <alpha-value>)',
  danger: 'hsl(var(--danger) / <alpha-value>)',
  'danger-foreground': 'hsl(var(--danger-foreground) / <alpha-value>)',
  warning: 'hsl(var(--warning) / <alpha-value>)',
  background: 'hsl(var(--background) / <alpha-value>)',
  foreground: 'hsl(var(--foreground) / <alpha-value>)',
  card: 'hsl(var(--card) / <alpha-value>)',
  'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
  muted: 'hsl(var(--muted) / <alpha-value>)',
  'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
  border: 'hsl(var(--border) / <alpha-value>)',
}
```

> **Rule**: Never use raw Tailwind color classes (e.g. `bg-indigo-600`) or hex values in components. Always use semantic tokens.

---

### 1.4 Set Up Environment

Create `.env.example` at the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Copy to `.env.local` and fill with your Supabase project credentials. Never commit `.env.local`.

---

### 1.5 Validate Folder Structure

Ensure the following top-level directories exist (create empty `index.ts` placeholders where needed):

```
app/
  (auth)/          ← login, register
  (app)/           ← authenticated routes
    rooms/
      [roomId]/    ← room-scoped pages
  (admin)/
    admin/
  api/             ← route handlers
lib/
  services/        ← one file per domain
  apiEndpoints.ts
  apiClient.ts
  realtime.ts
components/
  ui/              ← shadcn primitives only
  rooms/
  expenses/
  bills/
  products/
  settlement/
  admin/
scripts/           ← seed.ts, etc.
```

---

## Definition of Done

- `npm run dev` starts without errors.
- Visiting `localhost:3000` renders the themed app shell with the correct indigo/cyan palette.
- All `.claude/skills/` files exist and are readable.
- `.env.example` is committed and `.env.local` is gitignored.
- Folder structure matches the spec.

---

## Branch

`chore/project-setup`
