# Room Bills — Phasewise Build Plan

This directory contains the detailed phase-by-phase implementation plans for the **Room Expense Tracker** (Next.js full-stack, multi-room, multi-user platform).

## Phase Overview

| Phase | Name | Key Deliverables |
|-------|------|------------------|
| [Phase 1](./phase-1-project-setup.md) | Project Setup & Conventions | Scaffolding, skills, theme, env |
| [Phase 2](./phase-2-database.md) | Database & Schema | Supabase schema, RLS, triggers, seed |
| [Phase 3](./phase-3-core-infrastructure.md) | Core Infrastructure | API client, endpoints, error handling, settlement logic |
| [Phase 4](./phase-4-auth.md) | Authentication | Register, login, logout, session, auth sync |
| [Phase 5](./phase-5-rooms.md) | Rooms & Dashboard | Create/join room, room switcher, global dashboard |
| [Phase 6](./phase-6-room-features.md) | Room Features | Bills, Expenses, Products, Settlement |
| [Phase 7](./phase-7-admin.md) | Admin Panel | Platform admin: users, rooms, stats |
| [Phase 8](./phase-8-security-realtime.md) | Security & Realtime | Rate limiting, Supabase Realtime, dark mode |

---

> **Stack**: Next.js 14+ App Router · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Auth + Postgres) · React Query · Zod · Sonner · date-fns
