# Continuation: Phase 8 Code Review - Recruiting Pipeline Org Awareness

## Session Context

Phase 8 implementation complete. Code review required before merge.

**Phase 8 Scope:**
- Recruiting tables org awareness (`agency_id`, `imo_id` columns)
- RLS policies for org-scoped access
- 4 RPC functions for recruiting summaries
- Service methods and React Query hooks
- Dashboard recruiting summary panels

---

## Files to Review

### Database Migrations
1. `supabase/migrations/20251222_015_recruiting_org_awareness.sql`
   - Schema changes (columns, indexes, triggers)
   - Backfill logic
   - Auto-populate trigger function

2. `supabase/migrations/20251222_016_recruiting_rls_org_policies.sql`
   - RLS policy definitions
   - Authorization hierarchy
   - IMO boundary enforcement

3. `supabase/migrations/20251222_017_recruiting_summary_rpcs.sql`
   - RPC function implementations
   - Authorization checks
   - Query efficiency
   - NULL handling

### TypeScript Types
4. `src/types/imo.types.ts` (lines 379-445)
   - New recruiting types
   - Interface consistency

5. `src/types/dashboard-metrics.schemas.ts` (lines 253-357)
   - Zod schemas for recruiting data
   - Validation functions

### Services
6. `src/services/imo/ImoService.ts` (lines 683-786)
   - `getRecruitingSummary()` method
   - `getRecruitingByAgency()` method
   - Error handling patterns

7. `src/services/agency/AgencyService.ts` (lines 808-922)
   - `getRecruitingSummary()` method
   - `getRecruitingByRecruiter()` method
   - Error handling patterns

### Hooks
8. `src/hooks/imo/useImoQueries.ts` (lines 555-617)
   - Query key definitions
   - Hook implementations
   - Stale time settings

9. `src/hooks/imo/index.ts`
   - Export completeness

### UI Components
10. `src/features/dashboard/components/OrgMetricsSection.tsx` (lines 553-764)
    - `ImoRecruitingSummaryPanel` component
    - `AgencyRecruitingSummaryPanel` component
    - Grid layout updates

---

## Review Checklist

### Security (HIGH Priority)
- [ ] RLS policies correctly enforce IMO boundaries
- [ ] Agency owners can't access other agencies' data
- [ ] Super admin bypass works correctly
- [ ] No SQL injection vulnerabilities in RPC functions
- [ ] SECURITY DEFINER functions have proper search_path

### Data Integrity (HIGH Priority)
- [ ] Backfill migration handles NULL agency_id/imo_id in user_profiles
- [ ] Trigger correctly populates org IDs on INSERT
- [ ] Foreign key constraints are appropriate
- [ ] Indexes support expected query patterns

### Authorization Logic (HIGH Priority)
- [ ] `is_imo_admin()` check is consistent
- [ ] `is_agency_owner_of()` check includes IMO boundary
- [ ] Empty object `{}` vs empty array `[]` return semantics are correct
- [ ] Authorization failures return appropriate responses (not errors)

### Code Quality (MEDIUM Priority)
- [ ] TypeScript types match database return types
- [ ] Zod schemas handle all edge cases
- [ ] Error handling is consistent with existing patterns
- [ ] No code duplication between IMO and Agency services
- [ ] React Query hooks follow established patterns

### Performance (MEDIUM Priority)
- [ ] RPC queries are efficient (no N+1)
- [ ] Indexes are used appropriately
- [ ] Stale times are reasonable
- [ ] No unnecessary re-fetches

### UI/UX (LOW Priority)
- [ ] Dashboard panels match existing design
- [ ] Loading states are consistent
- [ ] Error states are user-friendly
- [ ] Empty states are handled

---

## Known Patterns to Verify

### RLS Pattern (from Phase 7)
```sql
-- Agency owners need IMO boundary check
CREATE POLICY "Agency owners can view X in own agency"
  ON table_name FOR SELECT
  TO authenticated
  USING (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()  -- IMO boundary enforcement
  );
```

### Service Pattern (from Phase 7)
```typescript
// Empty object indicates no access (vs no data)
if (!data || Object.keys(data).length === 0) {
  return null;
}
```

### Zod Validation Pattern
```typescript
// JSONB responses use single-object parse, not array
export function parseImoRecruitingSummary(data: unknown): ImoRecruitingSummaryRow {
  return ImoRecruitingSummarySchema.parse(data);
}
```

---

## Start Command

```
Continue from plans/active/phase8-code-review-continuation.md

Context: Phase 8 implementation complete, needs code review.

Task: Perform comprehensive code review of Phase 8 changes.

Review focus areas:
1. Security - RLS policies, authorization, SQL injection
2. Data Integrity - Migrations, triggers, constraints
3. Code Quality - Types, patterns, error handling
4. Performance - Query efficiency, indexes

For each issue found, categorize as:
- HIGH: Security/data integrity issues (must fix before merge)
- MEDIUM: Code quality issues (should fix)
- LOW: Style/optimization suggestions (nice to have)

After review, provide:
1. Summary of issues found by priority
2. Specific code fixes for HIGH priority issues
3. Recommendations for MEDIUM/LOW issues
```
