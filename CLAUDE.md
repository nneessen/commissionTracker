# CLAUDE.md

Purpose: guidance for Claude Code (claude.ai/code) and human contributors working on this repository.
Target app: small-scale personal + business expense tracker. React 19.1, TypeScript, Supabase/Postgres.

---

# Project summary

Small-footprint full-stack app to record, categorize, and report personal and business expenses.  
Design for low concurrency, low cost, strong data safety, fast developer feedback loops.

---

# Stack (explicit)

- Frontend: React 19.1 + TypeScript
- Routing: TanStack Router (latest)
- Data fetching: TanStack Query (latest)
- Forms: TanStack Form (latest)
- UI: shadcn + Tailwind CSS v4
- Build: Vite
- Backend / DB: Supabase (Postgres). Use Supabase Edge Functions / serverless for server-side logic.
- Hosting: Vercel or Railway for frontend. Supabase managed Postgres for DB. Use AWS/GCP for optional services.
- Language for backend jobs: Python (optional workers/scripts)
- Devops: GitHub Actions for CI, migrations via supabase / pg-migrate

---

# Goals and constraints

- Target users: individual / small teams. Not enterprise scale.
- Prioritize correctness, privacy, predictable costs.
- Minimal latency. No unnecessary microservices.
- Prefer simple, observable, and reversible changes.

---

# Project rules (must-follow)

- TypeScript strict mode on.
- Keep naming conventional. Component names PascalCase. Files kebab-case. Function names camelCase. Do not invent fanciful class/file names like `ImprovedSidebar`.
- Prefer composition over large HOCs.
- Avoid `useCallback` / `useMemo` by default. Only introduce them when profiling shows measurable benefit.
- Never commit secrets. Use `.env.example`.
- Do not use transient mock data in production code. Use seeded fixtures for local dev and tests.
- Each PR must include tests for any new business logic or SQL migrations.

---

# High-level architecture

- `/src/features/*` — feature folders by domain (expenses, accounts, reports, auth)
- `/src/components/*` — reusable UI primitives
- `/src/routes/*` — route components & loaders (TanStack Router)
- `/src/api/*` — network wrappers and RPC clients (keeps TanStack Query hooks thin)
- `/src/lib/*` — app-wide utilities (date, currency)
- `/src/db/*` — typed DB model adapters and migrations (server-only)
- `/migrations` — SQL migrations (source of truth)

Keep features self-contained. Each feature should export:

- React routes and route loader functions
- TanStack Query keys and hooks
- Tests and stories

---
