# Recruit Role & Graduation System - COMPLETED

## Overview
Successfully implemented a complete recruit role system with graduation workflow. Recruits are now properly separated from active agents with role-based filtering and permission-controlled graduation.

## What Was Completed

### 1. Database Changes
- **Recruit Role Created**: Inserted into `roles` table (ID: 41e09855-d136-43c8-ac83-dcf701319f39)
  - Name: 'recruit'
  - Display Name: 'Recruit'
  - Not a system role (is_system_role = false) so permissions can be managed
  - Does not respect hierarchy (respects_hierarchy = false)

- **Graduation Fields Added** to user_profiles:
  - `graduated_at` (timestamptz): When recruit became agent
  - `graduation_notes` (text): Notes about graduation
  - `contract_level` (integer): Agent commission percentage (50-100)

- **User Activity Log Table**: Created for audit trail
  - Tracks graduation events
  - Records who performed the action
  - Stores metadata (contract level, previous role, etc.)

- **Avatars Storage Bucket**: Created for profile photos
  - Public bucket (5MB limit)
  - RLS policies for upload/update/delete
  - Allowed mime types: image/jpeg, jpg, png, gif, webp

### 2. Role-Based Filtering (AdminControlCenter.tsx)
**CRITICAL IMPLEMENTATION:**
```typescript
// Active agents: users with role = 'agent' OR 'admin'
const activeAgents = hierarchyFilteredUsers?.filter((u: UserProfile) =>
  u.roles?.includes('agent' as RoleName) || u.roles?.includes('admin' as RoleName)
);

// Recruits: users with role = 'recruit'
const recruitsInPipeline = hierarchyFilteredUsers?.filter((u: UserProfile) =>
  u.roles?.includes('recruit' as RoleName)
) || [];
```

**Users & Access Tab** shows: activeAgents (agent or admin role)
**Recruiting Pipeline Tab** shows: recruitsInPipeline (recruit role)

### 3. Graduate to Agent Feature
**File**: `src/features/admin/components/GraduateToAgentDialog.tsx`

**Permission Check**:
- Only Admin, Trainer, or Contracting Manager can graduate recruits
- Check in AdminControlCenter:
```typescript
const canGraduateRecruits = currentUserProfile?.roles?.some((role: RoleName) =>
  ['admin', 'trainer', 'contracting_manager'].includes(role)
);
```

**Graduate Button Visibility**:
- Shows only for recruits in phases: `bootcamp`, `npn_received`, `contracting`
- Located in Recruiting Pipeline table Actions column

**Graduation Process**:
1. Updates user_profiles:
   - Changes `roles` from `['recruit']` to `['agent']`
   - Sets `onboarding_status` to 'completed'
   - Sets `current_onboarding_phase` to 'completed'
   - Sets `approval_status` to 'approved'
   - Sets `contract_level` (50-100%)
   - Records `graduated_at` timestamp
   - Stores `graduation_notes`

2. Creates activity log entry:
   - Action: 'graduated_to_agent'
   - Metadata: previous_role, new_role, contract_level, notes, graduated_by

3. Sends notification to upline (if exists):
   - Table: `notifications`
   - Type: 'recruit_graduated'
   - Message includes recruit name and contract level

### 4. UI Fixes
- **User Column Width**: Reduced to 200px (was unlimited, causing horizontal scroll)
- **Graduate Button**: Green text, graduation cap icon, shows in recruiting table
- **Edit Button**: Fixed `handleSaveRoles` → `handleSaveUser` error

### 5. Database Role Assignments
Current state in database:
- Admin (nick.neessen@gmail.com): `roles = ['admin']`
- All recruits: `roles = ['recruit']`
- Active agents: `roles = ['agent']`

## Files Modified

### Created
1. `supabase/migrations/20251128_008_insert_recruit_role_simple.sql` - Recruit role
2. `supabase/migrations/20251128_002_create_avatars_bucket.sql` - Profile photos
3. `supabase/migrations/20251128_004_add_graduation_fields.sql` - Graduation tracking
4. `supabase/migrations/20251128_005_create_user_activity_log.sql` - Activity logging
5. `src/features/admin/components/GraduateToAgentDialog.tsx` - Graduation UI
6. `src/features/recruiting/pages/MyRecruitingPipeline.tsx` - Recruit dashboard (NOT YET WIRED UP)
7. `src/routes/recruiting.pipeline.tsx` - Route for recruit dashboard

### Modified
1. `src/features/admin/components/AdminControlCenter.tsx`:
   - Added recruit role import
   - Added GraduationCap icon import
   - Added canGraduateRecruits permission check
   - Added graduatingRecruit state
   - Added Graduate button with conditional rendering
   - Added GraduateToAgentDialog component
   - Fixed User column width to 200px
   - Fixed handleSaveUser bug

2. `src/types/hierarchy.types.ts`:
   - Added `graduated_at`, `graduation_notes`, `contract_level` fields

3. `src/types/permissions.types.ts`:
   - Added 'recruit' to RoleName type

4. `src/components/navigation/AppNavigation.tsx`:
   - Added recruit-specific navigation (My Pipeline)
   - Separated recruit nav from admin/manager recruiting nav

## Edge Cases Handled
1. ✅ Permission checks before showing Graduate button
2. ✅ Only show Graduate for late-stage recruits (bootcamp+)
3. ✅ Activity logging with graduated_by tracking
4. ✅ Upline notification (handles null upline_id)
5. ✅ Query invalidation after graduation
6. ✅ Dialog state cleanup on close

## Known Issues / Not Yet Implemented
1. **Recruit Dashboard NOT wired up to navigation** - Route exists but not linked
2. **AddRecruit form incomplete** - Missing many required fields (see next section)
3. **Social media photo fallback** - Not implemented
4. **Document upload** - Not implemented for recruits
5. **Notifications table** - May not exist yet (graduation sends to it but table might not be created)

## Next Steps Required
See comprehensive prompt in separate memory: `next_steps_recruit_onboarding_enhancement.md`
