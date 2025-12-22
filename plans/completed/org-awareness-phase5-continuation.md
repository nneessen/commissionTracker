# Continuation: IMO/Agency Org Awareness - Phase 5

## Session Context

Multi-IMO/Agency architecture implementation. Phases 1-4 complete and deployed.

**Completed Phases:**
- Phase 1: Clients hierarchy visibility (`03d2ccf`)
- Phase 2: Expenses org awareness (`8a0de4c`)
- Phase 3: User Targets team visibility (`fb98084`)
- Phase 4: Workflow Org Templates (`4c5d3ab`, `6bc0247`, `4bc1e27`)

---

## Phase 5: IMO/Agency Dashboard Metrics

**Goal:** Provide IMO admins and agency owners with aggregated dashboard metrics for their organization, enabling visibility into team performance, production, and key business indicators.

### Scope

1. **Migration:** Create RPC functions for aggregated metrics
   - `get_imo_dashboard_metrics()` - IMO-wide totals (policies, commissions, agents)
   - `get_agency_dashboard_metrics()` - Agency-level totals
   - `get_imo_production_by_agency()` - Breakdown by agency for IMO admins
   - `get_agency_production_by_agent()` - Breakdown by agent for agency owners

2. **Repository:** Add metrics query methods
   - `ImoRepository.getDashboardMetrics()`
   - `AgencyRepository.getDashboardMetrics()`
   - `ImoRepository.getProductionByAgency()`
   - `AgencyRepository.getProductionByAgent()`

3. **Service:** Add metrics aggregation
   - `ImoService.getDashboardMetrics()`
   - `AgencyService.getDashboardMetrics()`

4. **Hooks:** Create dashboard metrics hooks
   - `useImoDashboardMetrics`
   - `useAgencyDashboardMetrics`
   - `useImoProductionBreakdown`
   - `useAgencyProductionBreakdown`

5. **UI:** Dashboard widgets for org metrics
   - IMO metrics card on main dashboard (IMO admin+)
   - Agency metrics card on main dashboard (agency owner+)
   - Production breakdown tables/charts

---

## Key Metrics to Include

### IMO-Level Metrics
| Metric | Description |
|--------|-------------|
| Total Active Policies | Count of active policies across all agencies |
| Total Annual Premium | Sum of annual premium across IMO |
| Total Commissions (YTD) | Sum of earned commissions year-to-date |
| Agent Count | Number of active agents in IMO |
| Agency Count | Number of agencies in IMO |
| Avg Production per Agent | Total premium / agent count |

### Agency-Level Metrics
| Metric | Description |
|--------|-------------|
| Agency Active Policies | Count of active policies in agency |
| Agency Annual Premium | Sum of annual premium in agency |
| Agency Commissions (YTD) | Sum of earned commissions year-to-date |
| Agent Count | Number of active agents in agency |
| Top Producer | Highest producing agent |
| Avg Production per Agent | Agency premium / agent count |

---

## Existing Helper Functions

| Function | Purpose |
|----------|---------|
| `is_imo_admin()` | Check if current user is IMO admin/owner |
| `is_super_admin()` | Check if current user is super admin |
| `get_my_imo_id()` | Get current user's IMO ID |
| `get_my_agency_id()` | Get current user's Agency ID |

---

## Pattern References

**Migration pattern:** `supabase/migrations/20251222_003_expenses_org_awareness.sql`
**Hook pattern:** `src/hooks/targets/useTeamTargets.ts`
**Service pattern:** `src/services/targets/userTargetsService.ts`

---

## Files to Create/Modify

### New Files
- `supabase/migrations/20251222_007_imo_agency_dashboard_metrics.sql`

### Modified Files
- `src/services/imo/ImoRepository.ts` - Add metrics methods
- `src/services/imo/ImoService.ts` - Add metrics methods
- `src/services/agency/AgencyRepository.ts` - Add metrics methods
- `src/services/agency/AgencyService.ts` - Add metrics methods
- `src/hooks/imo/useImoQueries.ts` - Add metrics hooks
- `src/types/database.types.ts` - Regenerate after migration
- Dashboard components (TBD based on existing structure)

---

## Start Command

```
Continue from plans/active/org-awareness-phase5-continuation.md - implement Phase 5: IMO/Agency Dashboard Metrics

Context: Phases 1-4 (Clients, Expenses, Targets, Workflows) are complete with:
- RLS policies for hierarchy/IMO visibility
- DB functions for downline/IMO queries
- Repository/Service/Hook layers

Phase 5 needs:
1. Migration: Create RPC functions for aggregated dashboard metrics
2. DB functions: get_imo_dashboard_metrics(), get_agency_dashboard_metrics()
3. Repository: Add metrics query methods to Imo/Agency repositories
4. Service: Add metrics methods
5. Hooks: useImoDashboardMetrics, useAgencyDashboardMetrics
6. UI: Dashboard widgets for org metrics
7. Build verification
```

---

## Build Status

✅ Current build passes with zero TypeScript errors
