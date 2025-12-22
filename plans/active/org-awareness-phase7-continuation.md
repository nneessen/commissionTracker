# Continuation: IMO/Agency Org Awareness - Phase 7

## Session Context

Multi-IMO/Agency architecture implementation. Phases 1-6 complete with bug fixes.

**Completed Phases:**
- Phase 1: Clients hierarchy visibility (`03d2ccf`)
- Phase 2: Expenses org awareness (`8a0de4c`)
- Phase 3: User Targets team visibility (`fb98084`)
- Phase 4: Workflow Org Templates (`4c5d3ab`, `6bc0247`)
- Phase 5: IMO/Agency Dashboard Metrics (`98ba0df`)
- Phase 6: Team Performance Reports (with bug fixes)

---

## Phase 6 Bug Fixes Applied

| Bug | Fix | Migration |
|-----|-----|-----------|
| Running totals incorrect | Fixed policy counting logic, use variables instead of CROSS JOIN | `20251222_010` |
| Query key cache thrashing | Added `serializeDateRange()` to convert Date objects to strings | N/A |
| Partial query failures | Added `ReportErrorBoundary`, `QueryErrorAlert`, `ReportQueryError` components | N/A |
| Date range abuse | Added 24-month limit validation at service + SQL layers | `20251222_011` |

---

## Current Migrations

```
20251222_009_team_performance_reports.sql      # Original (superseded)
20251222_010_fix_team_performance_running_totals.sql  # Running totals fix
20251222_011_add_date_range_validation.sql     # Date validation + consolidated functions
```

---

## Build Status

✅ Build passes with zero TypeScript errors

---

## Options for Phase 7

### Option A: Override Commissions Org Awareness
**Scope:**
- Add `imo_id` to override_commissions table (if not present)
- RLS policies for IMO/Agency boundaries
- IMO admins can view all overrides in their org
- Agency owners can view overrides for their agents
- Dashboard widget for override commission totals

**Complexity:** Medium

### Option B: Recruiting Pipeline Org Awareness
**Scope:**
- IMO admins see all recruits across agencies
- Agency owners see their downline recruits
- Recruiting funnel metrics by agency
- Add recruiting stats to team comparison report

**Complexity:** Medium

### Option C: Document Management Org Sharing
**Scope:**
- Share documents at IMO/Agency level
- Permission-based document access (IMO-wide, agency-only, personal)
- Document templates for org-wide use
- Version control for shared documents

**Complexity:** High

### Option D: Report Export Enhancement
**Scope:**
- CSV export for team performance reports
- PDF generation with charts
- Scheduled report delivery via email
- Report templates (weekly, monthly, quarterly)

**Complexity:** Medium-High

### Option E: Agent Hierarchy Visualization
**Scope:**
- Visual org chart for IMO/Agency structure
- Drill-down from IMO → Agency → Agent
- Performance metrics overlay on org chart
- Hierarchy-based filtering across all views

**Complexity:** Medium

---

## Technical Debt Notes

From Phase 6 code review (lower priority):
- N+1 pattern in team comparison LATERAL joins (monitor performance)
- Top performers exposes agent emails to IMO admins (verify this is intended)
- Summary calculation duplicated between ImoService and AgencyService (refactor candidate)
- No feature flag for gradual rollout (consider for future phases)

---

## Start Command

```
Continue from plans/active/org-awareness-phase7-continuation.md

Context: Phases 1-6 complete with all bug fixes applied. Build passing.

Phase 6 delivered:
- IMO Performance Report (monthly trends, agency comparison, top performers)
- Agency Performance Report (monthly trends, agent breakdown)
- Error boundaries for graceful failure handling
- Date range validation (max 24 months)
- Query key serialization to prevent cache thrashing

Select next phase:
A) Override Commissions Org Awareness
B) Recruiting Pipeline Org Awareness
C) Document Management Org Sharing
D) Report Export Enhancement (CSV/PDF)
E) Agent Hierarchy Visualization

Which phase should be implemented?
```
