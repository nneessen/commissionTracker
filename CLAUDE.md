# CLAUDE.md

Insurance Sales KPI & Agency Management System. React 19.1, TypeScript, Supabase/Postgres.

---

## Every Prompt Standards

**These apply to EVERY interaction - no exceptions:**

1. **Never assume** - Fetch current schema (`database.types.ts`), read relevant files before modifying
2. **Never be lazy** - Complete tasks fully, don't skip steps or cut corners
3. **Ask questions first** - Clarify requirements, suggest additions/exclusions, explain reasoning
4. **Check for reusability** - Before creating anything, verify if a reusable method/component exists
5. **Refactor duplicates** - If you find duplicate code, consolidate into one reusable method
6. **Test everything** - All tests must pass 100%. Run `npm run build` before considering done
7. **Verify visually** - Run dev server and verify UI changes work correctly
8. **Suggest edge cases** - Proactively identify and handle edge cases
9. **Maintain design consistency** - Follow the compact, professional design style (see below)
10. **No over-engineering** - Solve the problem, don't add unnecessary abstractions
11. **No fake/mock data** - Every UI element must be functional. No placeholders.
12. **Conventional naming** - PascalCase components, kebab-case files, camelCase functions

---

## Design Philosophy

**Compact, professional, data-dense UI:**

- Minimal padding/margins - maximize information density
- Small, readable text sizes - don't waste vertical space
- Muted color palette - professional, not flashy
- Subtle borders and shadows - clean separation without visual noise
- Tables over cards when displaying lists - more data per screen
- Inline actions - avoid modal overuse, prefer inline editing
- Consistent spacing scale - use Tailwind's smaller values (1, 2, 3, not 6, 8, 10)
- No unnecessary animations or transitions
- Mobile-responsive but desktop-optimized (primary use case)

---

## Auto-Resume Sessions

At conversation start, check for `ACTIVE_SESSION_CONTINUATION` memory. If exists and <72hrs old, offer to continue previous work. Created automatically when context fills up.

---

## Project Overview

**Active Features:**
- **Policies** - Source of truth for all metrics (KPIs, persistency, AP calculations)
- **Commissions** - Contract-level calculations, splits, advances, chargebacks
- **Recruiting Pipeline** - Multi-phase candidate tracking with status workflows
- **Email System** - WYSIWYG composer, templates, attachments, Slack notifications
- **Expenses** - Categories, reporting, business expense tracking
- **Analytics/Reports** - Time-filtered dashboards (MTD, YTD, custom ranges)
- **Hierarchy** - Team structure, uplines, contract levels
- **Targets** - Goal setting and pace metrics
- **Settings/Admin** - User preferences, system configuration

**Planned:**
- **Chat/Slack Integration** - Full Slack functionality within the app (requires planning)

**Target User:** Single insurance agent / small team. Not enterprise.

---

## Stack

- **Frontend:** React 19.1, TypeScript, TanStack (Router/Query/Form), shadcn, Tailwind v4, Vite
- **Backend:** Supabase (Postgres, Auth, Edge Functions)
- **Testing:** Vitest
- **CI/CD:** GitHub Actions, Supabase migrations

---

## Architecture

```
/src/features/*        → Domain features (policies, commissions, recruiting, email, etc.)
/src/components/*      → Reusable UI primitives
/src/routes/*          → TanStack Router routes & loaders
/src/services/*        → Business logic & Supabase access
/src/hooks/*           → TanStack Query hooks
/src/lib/*             → Utilities (date, currency, calculations)
/src/types/*           → TypeScript types (source of truth for validation)
/supabase/migrations/* → SQL migrations (ONLY migration directory)
/docs/*                → Architecture docs, guides
/plans/*               → Active plans; move completed to plans/completed/
/scripts/*             → Utility scripts, testing scripts
```

---

## Critical Rules

**Vercel Deployment (STRICT MODE):**
- **ALWAYS run `npm run build` before committing** - Vercel uses strict TypeScript checking
- Build failures on Vercel = deployment fails = app stays broken in production
- After ANY database schema change (migrations, enum changes, new tables):
  1. Run: `npx supabase gen types typescript --project-id pcyaqwodnyrpkaiojnpz > src/types/database.types.ts`
  2. Fix any new type errors in the codebase
  3. Run `npm run build` to verify all types align
- Keep types synchronized: `database.types.ts` is generated, other files must match it
- Never push code with TypeScript errors - the deployment WILL fail

**Data Storage:**
- ALL data in Supabase. TanStack Query for state management.
- Local storage ONLY for: session tokens, UI preferences (theme, sidebar)
- NO localStorage/sessionStorage for business data

**Migrations:**
- Single directory: `supabase/migrations/`
- Format: `YYYYMMDD_NNN_descriptive_name.sql`
- Test locally before production
- No enum CHECK constraints - use TypeScript types for validation

**Code Quality:**
- TypeScript strict mode
- No mock data in production code
- Each feature self-contained with routes, hooks, services, tests

---

## Golden Rules

1. Fetch current DB schema before every task
2. Update plans as you work; move completed to `plans/completed/`
3. No .md files in project root - use `/docs/` or `/plans/`
4. Don't ask to continue incomplete work - just continue until done
5. At 10% context remaining, write a continuation prompt
6. No placeholder UI - everything must be functional
7. Always run app after changes to verify no loading errors
