# Phase 7: Override Commissions Org Awareness

## Completed: 2025-12-22

## Summary

Added full org awareness to override_commissions table:
- `agency_id` column with auto-populate trigger from base_agent
- RLS policies for agency owners (SELECT, INSERT, UPDATE, DELETE)
- RLS policies for IMO admins (completed INSERT, UPDATE, DELETE)
- 4 RPC functions for override summaries
- Dashboard integration with override summary panels

## Key Decisions

1. **agency_id source**: Set from base_agent's agency (where policy was written)
2. **RLS pattern**: Same as other tables - agency owners check ownership via `is_agency_owner(agency_id)`
3. **IMO admins**: Already had SELECT via existing policy; added INSERT/UPDATE/DELETE
4. **Dashboard placement**: Added alongside existing IMO/Agency metrics panels

## RPC Functions

| Function | Purpose |
|----------|---------|
| `get_imo_override_summary()` | IMO-wide override totals |
| `get_agency_override_summary(p_agency_id)` | Agency override totals |
| `get_overrides_by_agency()` | Breakdown by agency for IMO view |
| `get_overrides_by_agent(p_agency_id)` | Breakdown by agent for agency view |

## Files Changed

- Migration: `20251222_013_override_commissions_org_awareness.sql`
- Types: `dashboard-metrics.schemas.ts`, `imo.types.ts`
- Services: `ImoService.ts`, `AgencyService.ts`
- Hooks: `useImoQueries.ts`, `index.ts`
- UI: `OrgMetricsSection.tsx`

## Next Phase

Phase 8 options available in `plans/active/org-awareness-phase8-continuation.md`
