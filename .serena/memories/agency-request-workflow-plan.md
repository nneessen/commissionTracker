# Agency Request Workflow - COMPLETED

## Status: COMPLETED (2025-12-21)

## Summary
Agents who build teams can request to "become an agency" (MLM-style hierarchy). Upline approves.

## Implementation Details
- `parent_agency_id` added to `agencies` for agency hierarchy
- New `agency_requests` table for workflow
- Agent stays in upline's hierarchy (upline_id intact)
- Agent gains their own agency (owner)
- Existing downline automatically move to new agency
- Approval done via DB function `approve_agency_request()` in transaction

## Files Created
- `supabase/migrations/20251221_004_agency_requests.sql` - Migration with tables, RLS, functions
- `src/types/agency-request.types.ts` - TypeScript types
- `src/services/agency-request/AgencyRequestRepository.ts` - Data access layer
- `src/services/agency-request/AgencyRequestService.ts` - Business logic
- `src/services/agency-request/index.ts` - Exports
- `src/hooks/agency-request/useAgencyRequestQueries.ts` - React Query hooks
- `src/hooks/agency-request/index.ts` - Hook exports
- `src/features/settings/agency-request/AgencyRequestPage.tsx` - Main page
- `src/features/settings/agency-request/components/*.tsx` - UI components
- Updated `src/features/settings/SettingsDashboard.tsx` - Added Agency tab

## UI Location
Settings > Agency tab (with pending approval badge)

## Database Functions
- `approve_agency_request(p_request_id)` - Creates agency, moves downline, grants role
- `reject_agency_request(p_request_id, p_reason)` - Rejects with optional reason
- `can_request_agency()` - Checks if user is eligible
- `get_pending_agency_request_count()` - For sidebar badge
