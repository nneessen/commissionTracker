# Multi-IMO Architecture - Next Steps

## Session Context
The multi-IMO architecture is now feature-complete. All priority tasks from the previous session have been implemented.

## Completed
- [x] Database: `imos` and `agencies` tables with RLS policies
- [x] 8 migrations applied (20251220_001 through 20251221_003)
- [x] Services: ImoService, AgencyService with repositories
- [x] Context: ImoProvider wraps App, useImo() hook available
- [x] Admin UI: IMO Management (super admin), Agency Management (IMO admin+)
- [x] Owner assignment for agencies
- [x] Delete functionality for agencies
- [x] Super admin policies for cross-tenant access
- [x] Metrics RPC functions (get_imo_metrics, get_agency_metrics)
- [x] **User IMO/Agency Assignment UI** - EditUserDialog now has "Organization" tab
  - Super admins can reassign users to any IMO/Agency
  - IMO admins can reassign users to agencies within their IMO
  - AdminControlCenter table shows IMO/Agency columns
- [x] **Sidebar IMO/Agency Display** - User info now shows IMO code with branding color + Agency code
- [x] **Feature Scoping Verified** - RLS policies correctly scope:
  - Carriers, Products, Comp Guide, Pipeline Templates by IMO
  - Global items (imo_id IS NULL) visible to all users
- [x] **Hierarchy Per-Agency Verified** - `is_upline_of()` function enforces same-agency requirement

## Architecture Summary

### Data Scoping
- **Reference data (carriers, products, comp_guide, pipeline_templates):** Scoped by IMO via RLS
- **Business data (policies, commissions):** Scoped by agent's IMO/Agency
- **Hierarchy:** Per-agency - upline/downline relationships only within same agency

### Role Hierarchy
1. `super_admin` - System-wide access to ALL IMOs/agencies/data
2. `imo_owner` - Full control of one IMO
3. `imo_admin` - Manage agencies/agents in one IMO
4. `agency_owner` - Manage their agency + downlines
5. `trainer` - Training access
6. `agent` - Regular agent

### Key Files
- Context: `src/contexts/ImoContext.tsx`
- Hooks: `src/hooks/imo/useImoQueries.ts`
- Services: `src/services/imo/`, `src/services/agency/`
- Types: `src/types/imo.types.ts`
- Admin UI: `src/features/settings/imo/`, `src/features/settings/agency/`
- User Assignment: `src/features/admin/components/EditUserDialog.tsx` (Organization tab)
- Sidebar Display: `src/components/layout/Sidebar.tsx`

## Potential Future Enhancements
1. IMO-level dashboard metrics
2. Agency-level dashboard metrics
3. IMO branding on public-facing pages
4. Cross-IMO agent transfer workflow (for super admins)
5. Agency hierarchy tree visualization
6. IMO/Agency analytics and reporting

## Database Quick Reference
```sql
-- Check user's IMO/Agency assignment
SELECT email, imo_id, agency_id FROM user_profiles WHERE email = 'user@example.com';

-- List all agencies with owners
SELECT a.name, a.code, up.email as owner_email
FROM agencies a
LEFT JOIN user_profiles up ON a.owner_id = up.id;

-- Check RLS function
SELECT is_super_admin(); -- Should return true for super admins
SELECT get_my_imo_id();  -- Returns current user's IMO ID
SELECT get_my_agency_id();  -- Returns current user's Agency ID
```
