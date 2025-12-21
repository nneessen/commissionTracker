# Multi-IMO/Multi-Agency Architecture

## Overview
The system now supports multiple IMOs (Independent Marketing Organizations) with strict data isolation. Each IMO can have multiple agencies, and each agency has its own hierarchy tree.

## Key Design Decisions
- **Agent → IMO**: ONE-TO-ONE. Each agent belongs to exactly one IMO.
- **Agent → Agency**: ONE-TO-ONE. Each agent belongs to exactly one agency.
- **Hierarchy**: PER-AGENCY. Each agency has its own upline/downline tree.
- **Reference data**: PER-IMO. Products, carriers, comp_guide are scoped to IMO.
- **Pipelines**: PER-IMO. Each IMO has its own recruiting pipeline templates.

## Database Tables
- `imos` - Top-level tenant table with branding/settings
- `agencies` - Agencies within an IMO, with owner_id FK

## New Columns Added
- `user_profiles.imo_id` - FK to imos table
- `user_profiles.agency_id` - FK to agencies table
- `imo_id` added to: carriers, products, comp_guide, pipeline_templates
- `imo_id` added (denormalized) to: policies, commissions, override_commissions

## Key RLS Functions
- `get_my_imo_id()` - Returns current user's IMO ID
- `get_my_agency_id()` - Returns current user's agency ID
- `is_imo_admin()` - Check if user has imo_owner/imo_admin/super_admin role
- `is_upline_of()` - Updated to check same agency (hierarchy is per-agency)

## Role Hierarchy
1. `super_admin` - System-wide access to ALL IMOs/agencies/data
2. `imo_owner` - Full control of one IMO
3. `imo_admin` - Manage agencies/agents in one IMO
4. `agency_owner` - Manage their agency + downlines
5. `trainer` - Training access
6. `agent` - Regular agent

## Super Admin Access (20251221_001_super_admin_policies.sql)
Super admins have explicit RLS policies granting full access to:
- All IMOs and agencies (across tenants)
- All user_profiles (view and update)
- All carriers, products, comp_guide, pipeline_templates
- All policies, commissions, override_commissions
- All storage buckets (imo-assets, agency-assets)

Key function: `is_super_admin()` - returns true if user has `is_super_admin = true`

## Migration Notes
- FFG (Founders Financial Group) is the first IMO with ID `ffffffff-ffff-ffff-ffff-ffffffffffff`
- FFG Main Agency has ID `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
- All existing data was migrated to FFG during initial migration

## Files Created
- `supabase/migrations/20251220_001_multi_imo_architecture.sql`
- `supabase/migrations/20251220_002_imo_rls_functions.sql`
- `supabase/migrations/20251220_003_imo_rls_policies.sql`
- `supabase/migrations/20251220_004_migrate_ffg_data.sql`
- `supabase/migrations/20251220_005_imo_storage_buckets.sql`
- `supabase/migrations/20251221_001_super_admin_policies.sql`
- `src/types/imo.types.ts`
- `src/services/imo/ImoRepository.ts`
- `src/services/imo/ImoService.ts`
- `src/services/agency/AgencyRepository.ts`
- `src/services/agency/AgencyService.ts`
- `src/contexts/ImoContext.tsx`
- `src/hooks/imo/useImo.ts`
- `src/hooks/imo/useImoQueries.ts`
