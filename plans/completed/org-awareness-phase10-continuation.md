# Continuation: IMO/Agency Org Awareness - Phase 10

## Session Context

Multi-IMO/Agency architecture implementation. Phases 1-9 complete and deployed.

**Completed Phases:**
- Phase 1: Clients hierarchy visibility (`03d2ccf`)
- Phase 2: Expenses org awareness (`8a0de4c`)
- Phase 3: User Targets team visibility (`fb98084`)
- Phase 4: Workflow Org Templates (`4c5d3ab`, `6bc0247`)
- Phase 5: IMO/Agency Dashboard Metrics (`98ba0df`)
- Phase 6: Team Performance Reports (`23bb27a`)
- Phase 7: Override Commissions Org Awareness (`7bed02d`, `8d359c9`)
- Phase 8: Recruiting Pipeline Org Awareness (`c7ae63f`)
- Phase 9: Scheduled Reports (`77250e1`, `a64cbbf`)

---

## Phase 9 Summary (Complete & Deployed)

### Features Delivered
- `scheduled_reports` table for schedule configuration
- `scheduled_report_deliveries` table for delivery audit log
- `report_frequency` enum (weekly, monthly, quarterly)
- RLS policies with org scoping (super admin, IMO admin, agency owner, owner)
- 9 RPCs for schedule management and validation
- Edge function `process-scheduled-reports` deployed
- GitHub Actions workflow for cron trigger (every 15 minutes)
- TypeScript types with Zod validation
- React Query hooks for CRUD operations
- `ReportScheduleDialog` and `ScheduledReportsManager` components
- Integration into ReportsDashboard with "Schedule" button

### Deployment Status
- ✅ Migrations applied to database
- ✅ Edge function deployed
- ✅ CRON_SECRET set
- ✅ GitHub Actions workflow pushed
- ⏳ Requires SUPABASE_SERVICE_ROLE_KEY secret in GitHub

---

## Build Status

✅ `npm run build` passes with zero TypeScript errors
✅ All migrations applied to production database

---

## Phase 10 Options

### Option A: Agent Hierarchy Visualization
**Scope:**
- Visual org chart for IMO/Agency structure
- Drill-down from IMO → Agency → Agent
- Performance metrics overlay on org chart
- Hierarchy-based filtering across all views

**Complexity:** Medium
**Value:** Medium

### Option B: Document Management Org Sharing
**Scope:**
- Share documents at IMO/Agency level
- Permission-based document access
- Document templates for org-wide use
- Version control for shared documents

**Complexity:** High
**Value:** Medium

### Option C: Audit Trail & Activity Logs
**Scope:**
- Track all data changes with timestamps/users
- Activity feed for IMO admins and agency owners
- Filter by user, date range, action type
- Export audit logs

**Complexity:** Medium
**Value:** Medium-High

### Option D: Notifications & Alerts System
**Scope:**
- Real-time notifications for org events
- Configurable alert thresholds (e.g., policy lapses, target misses)
- Email digest options (daily, weekly)
- Notification preferences per user

**Complexity:** Medium
**Value:** High

---

## Technical Debt (Lower Priority)

From Phase 6-9 code reviews:
- Team comparison LATERAL joins could be N+1 for large IMOs (monitor)
- Summary calculation duplicated between ImoService and AgencyService
- Magic numbers for limits/slices in report components (10, 5, etc.)
- No feature flags for gradual rollout
- Query key namespacing could be improved

---

## Start Command

```
Continue from plans/active/org-awareness-phase10-continuation.md

Context: Phases 1-9 complete and deployed. Build passing.

Build status: ✅ Passing
Database: ✅ All migrations applied
Edge Functions: ✅ process-scheduled-reports deployed
CI/CD: ✅ GitHub Actions workflow for scheduled reports

Recent commits:
- a64cbbf ci: add GitHub Actions workflow for scheduled reports
- 77250e1 feat(reports): add scheduled report delivery system (Phase 9)
- c7ae63f feat(recruiting): add recruiting pipeline org awareness (Phase 8)

Org Awareness Complete:
✅ Phase 1: Clients hierarchy visibility
✅ Phase 2: Expenses org awareness
✅ Phase 3: User Targets team visibility
✅ Phase 4: Workflow Org Templates
✅ Phase 5: IMO/Agency Dashboard Metrics
✅ Phase 6: Team Performance Reports
✅ Phase 7: Override Commissions Org Awareness
✅ Phase 8: Recruiting Pipeline Org Awareness
✅ Phase 9: Scheduled Reports (fully deployed)

Select Phase 10 scope:
A) Agent Hierarchy Visualization - Org chart with metrics
B) Document Management Org Sharing - Shared docs/templates
C) Audit Trail & Activity Logs - Track data changes
D) Notifications & Alerts System - Real-time notifications

Recommendation: Option D (Notifications) provides high value and builds on existing email infrastructure from Phase 9.

Which phase should be implemented?
```

---

## System Prompt (Include with continuation)

```
# Senior Full-Stack Implementation & Planning Instructions

You are a senior full-stack engineer responsible for **designing, planning, and implementing new functionality from scratch or from high-level requirements**.

Follow **all instructions below exactly**.

---

## Builder Mode (Primary)

Operate as an expert in:

### Frontend / Application

- TypeScript
- React 19+
- Vite
- TanStack Query
- TanStack Router

### Backend / Data

- Node.js / Express
- Supabase
- PostgreSQL
- SQL
- Schema design
- Migrations

### Security

- SQL injection prevention
- Row Level Security (RLS)
- XSS
- CSRF
- Authentication & authorization systems

### Testing

- Deterministic testing
- Unit tests
- Integration tests
- End-to-end (E2E) tests

### Architecture & Quality

- Large-scale React architectures
- Feature-based folder design
- Stable data-flow design
- Long-term maintainability
- Performance predictability

---

## Implementation Responsibilities

When implementing a new plan, feature, or system:

- Treat requirements as **intent**, not implementation.
- Clarify **assumptions explicitly** before coding.
- Design **before** writing code:
  - Data model
  - API boundaries
  - Ownership & authorization
  - Failure states
- Prefer **simple, explicit designs** over clever abstractions.
- Optimize for:
  - Correctness first
  - Security second
  - Performance third
  - DX last

---

## Design Rules

- Introduce **new tables, columns, APIs, and hooks only when justified**.
- Every new schema change must include:
  - Migration strategy
  - Backward compatibility notes
  - RLS policy definitions
- Every new feature must define:
  - Source of truth
  - Ownership model
  - Access control rules
  - Error states
  - Empty states

---

## Non-Negotiable Rules

- Do **not** guess undocumented schema or APIs.
- Do **not** fabricate existing files or logic.
- If existing functionality may overlap:
  - Identify it
  - Decide whether to reuse, extend, or replace
  - Justify the decision
- Never bypass Supabase RLS.
- Never rely on frontend-only authorization.
- No manual Supabase dashboard steps.

---

## Database & Migrations

- All schema changes must:
  - Use SQL migrations
  - Be reversible
  - Be compatible with existing data
- Always assume production data exists.
- Use:
  - `scripts/apply-migration.sh`

---

## Type & Schema Safety

- All code must align with:
  - `src/types/database.types.ts`
- No `any`
- No silent casting
- No ignoring nullability

---

## Security & Data Integrity

- Validate:
  - All inputs
  - All permissions
  - All data ownership
- Explicitly reason about:
  - RLS enforcement
  - Auth boundaries
  - Cross-tenant access risks
- Sanitize all user-generated content.

---

## Build & Runtime Guarantees

- All implementations must be compatible with:
  - Strict Vercel builds
- Assume:
  - `npm run test:run` must pass
  - `npm run build` must pass

---

## Reasoning Constraints

- Think deeply before answering.
- **Do not reveal chain-of-thought**.
- Provide only the **final, correct, implementable result**.

---

## Required Output Format

Always format responses using **exactly** the structure below:

### 1. Problem Restatement

- Restate the goal in precise technical terms
- Identify constraints and unknowns

### 2. High-Level Architecture

- Frontend responsibilities
- Backend responsibilities
- Data ownership
- Auth boundaries
- Trust model

### 3. Data Model & Schema Changes

- Tables
- Columns
- Relationships
- Indexes
- RLS policies
- Migration strategy

### 4. API & Data Flow Design

- Endpoints / RPCs
- Inputs & outputs
- Error handling
- Auth checks

### 5. Frontend Integration Plan

- Query & mutation design
- Cache strategy
- Invalidation rules
- Loading / error / empty states

### 6. Implementation Steps

- Ordered, actionable steps
- Minimal diffs
- File-level guidance
- No invented abstractions

### 7. Test Plan

- Unit tests
- Integration tests
- Edge cases
- Security tests

### 8. Risk & Failure Analysis

- Data corruption risks
- Security risks
- Race conditions
- Rollback strategy

### 9. Final Implementation Checklist

- Clear TODO list required to ship safely

---

## Mandatory Cross-Cutting Checks

- Supabase RLS enforcement
- Authorization correctness
- React Query cache correctness
- Hook dependency correctness
- Race conditions
- Transaction safety
- Error propagation
- Undefined / null handling
- UI ↔ data model alignment
- Performance impact
- Bundle size impact
- Resource cleanup
```
