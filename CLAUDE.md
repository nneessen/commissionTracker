Insurance Sales KPI & Recruiting & Agency Management System
React 19.1 • TypeScript • Supabase/Postgres

MACHINE RULES (TOP-LEVEL CHECKLIST)

These rules must be followed for every task.

Types Sync Required

If any change touches schema, migrations, enums, policies, or DB logic:
Run
npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
Commit the updated file.

Quick Check Required Before Producing Final Code

Run (mentally or explicitly): type-check, unit tests, and dependency checks.

CI performs full npm run build. Code must compile with zero TypeScript errors.

No Mock Data in Production Code

Dev-only mocks allowed only behind DEV_FEATURE_MODE flag.

CI must fail if mock imports appear in src/\*\*.

Naming Conventions

Components: PascalCase

Files: kebab-case

Functions/vars: camelCase

No exceptions.

Functional UI Required

No placeholders, no fake states, no dead elements.

Every rendered UI must connect to Supabase data or derive from real inputs.

Decision Rules for Asking Questions
Ask clarifying questions only when the task is ambiguous and touches one of:

DB schema

Auth or permissions

Migrations

Contract/commission logic

Reusable component or system-wide pattern
Otherwise: proceed directly.

Continue Previous Work Automatically

If ACTIVE_SESSION_CONTINUATION exists and is <72hrs old: continue without asking.

Otherwise follow normal decision rules above.

No Over-Engineering

Implement what is required, nothing additional.

Keep abstractions minimal and local unless shared patterns already exist.

PROJECT ARCHITECTURE
/src/features/_ Domain features (policies, commissions, recruiting, email, etc.)
/src/components/_ Reusable UI primitives
/src/routes/_ TanStack Router routes & loaders
/src/services/_ Business logic & Supabase access
/src/hooks/_ TanStack Query hooks
/src/lib/_ Utilities (date, currency, calculations)
/src/types/_ TypeScript types (database, entities)
/supabase/migrations/_ SQL migrations only
/docs/_ Docs & architecture notes
/plans/_ Active plans; completed plans in /plans/completed/
/scripts/\* Utility scripts

Rules:

No .md files in project root.

database.types.ts is always source of truth.

All feature code self-contained and testable.

UI & DESIGN STANDARDS

Compact, professional, data-dense layout:

Minimal padding/margins (Tailwind 1/2/3 scale)

Small readable text

Muted palette; subtle borders and shadows

Prefer tables over cards for lists

Inline editing preferred over modals

Desktop-optimized but responsive

No unnecessary animations

High information density without clutter

DEVELOPMENT STANDARDS

1. Schema & Migrations

Only one directory: supabase/migrations/

File format: YYYYMMDD_NNN_description.sql

After migration:

Regenerate database.types.ts

Fix type errors

Run npm run build

No CHECK constraints on enums; enforce via TypeScript.

2. Supabase Data Rules

All business data stored in Supabase.

TanStack Query for cache/state.

LocalStorage only for: theme + sidebar + auth tokens.

Absolutely no business data in browser storage.

3. Testing

100% passing unit tests (Vitest).

No mocked DB responses in production code.

Test financial logic thoroughly (commissions, splits, chargebacks).

4. Reusability

Before writing new code, check existing feature directories for reusable components/services/hooks.

If duplicates exist, refactor into a shared module.

5. Edge Cases

Always consider:

Null/undefined DB values

Missing relations

Time zone boundaries

Commission contract changes mid-year

Negative balances/chargebacks

Persistency calculations over time ranges

Recruiting pipeline incomplete phases

Email sending failures and retry logic

WORKFLOW

1. Before writing code:

Resolve ambiguity only if rule #6 requires it.

Inspect relevant feature directories.

Load database.types.ts to ensure accurate typing.

Audit for reusable patterns.

2. When coding:

No placeholders.

Real data only.

Strict TypeScript.

Follow naming + design standards.

Use TanStack Query for all data operations (load, mutate, cache).

3. When finishing:

Regenerate DB types if needed.

Ensure type errors = zero.

Provide final files changed + exact code blocks.

No stubs or “TODOs”.

DEPLOYMENT & VERIFICATION (STRICT MODE)

Vercel uses strict type checking. Build failures block production.

Required before considering any task “done”:

Types regenerated if schema changed.

Run npm run build with zero errors.

Verify UI renders without runtime errors.

Ensure no imports of mock/test modules in production code.

PR & SESSION OUTPUT FORMAT

Every deliverable (code, plan, updates) must contain:

Summary

Files touched

Changes made

DB impact (if any)

Edge cases addressed

Test coverage notes

Next steps (if applicable)

AUTO-RESUME

When context nears limits, create ACTIVE_SESSION_CONTINUATION with the exact next-step instructions so the next session can continue uninterrupted.

When a new session starts, check continuation state (<72hrs). If present, resume task automatically.

FINAL PRINCIPLES

Minimalism

Consistency

Complete tasks

No half-steps

No speculative abstractions

Always functional, testable, type-safe code
- add to memory: place active session files in plans/active/... not the root dir.