# Multiple Pipeline Support Implementation

## Summary
Successfully implemented multiple pipeline support for the recruiting system with differentiation based on agent licensing status.

## Key Features Implemented

### 1. Database Schema Updates
- Added `agent_status` enum type with values: 'unlicensed', 'licensed', 'not_applicable'
- Added `pipeline_template_id` column to user_profiles table
- Added `licensing_info` jsonb column for storing license details
- Created "Licensed Agent Fast-Track" pipeline template (3 phases)
- Updated existing pipeline to "Standard Recruiting Pipeline" (7 phases)

### 2. Pipeline Assignment Logic
- **Unlicensed recruits**: Assigned to "Standard Recruiting Pipeline" (7 phases)
- **Licensed agents**: Assigned to "Licensed Agent Fast-Track" (3 phases)
- **Admin/non-agent users**: No pipeline (agent_status = 'not_applicable')

### 3. Recruiting Dashboard Filtering
- Only shows users with `agent_status IN ('unlicensed', 'licensed')`
- Admin users and non-agent roles are excluded from recruiting views
- Stats and search functions updated to use the same filtering

### 4. AddRecruitDialog Enhancements
- Added licensing status checkboxes
- "Already a licensed insurance agent?" checkbox
- License number and NPN fields (shown when licensed is checked)
- Automatic role and pipeline assignment based on selections

## Technical Details

### Service Layer Updates (recruitingService.ts)
```typescript
// Filter for recruiting pipeline users only
.in('agent_status', ['unlicensed', 'licensed'])
```

### Database Migration
- Location: `/supabase/migrations/20251205_001_multiple_pipeline_support.sql`
- Applied successfully using the working migration script

### Type Definitions
- Added `AgentStatus` type
- Added `LicensingInfo` interface
- Updated `CreateRecruitInput` with new fields

## Testing Results
✅ Unlicensed recruits correctly assigned to Standard Pipeline
✅ Licensed agents correctly assigned to Fast-Track Pipeline
✅ Admin users have no pipeline and don't appear in recruiting dashboard
✅ No more 400 errors in console

## Important Notes
- The migration script at `scripts/migrations/apply-migration.sh` is the only working method for applying migrations
- Always cast enum values when updating: `'licensed'::agent_status`
- PostgREST doesn't support `.neq()` or `.not()` with null values properly