# COMPREHENSIVE PROMPT: Complete Recruit Onboarding Enhancement

## Context
The recruit role system and graduation workflow are COMPLETE and working. Now we need to enhance the recruit onboarding form and dashboard to collect all necessary data and provide recruits with visibility into their progress.

## Prerequisites - READ THESE FIRST
1. **Check Memory**: Read `recruit_role_and_graduation_completed.md` for full context of what's already done
2. **Review Guidelines**: Follow ALL rules in CLAUDE.md (global + project)
3. **Check User Profiles Schema**: Read `supabase/migrations/20251128170833_add_extended_user_profile_fields.sql` for complete field list
4. **Existing AddRecruit**: Located at `src/features/recruiting/components/AddRecruitDialog.tsx` (currently only has 9 fields)
5. **Existing Recruit Dashboard**: Located at `src/features/recruiting/pages/MyRecruitingPipeline.tsx` (created but NOT wired up to navigation)

## Current State (DO NOT DUPLICATE)
✅ **Already Completed - DO NOT RECREATE:**
- Recruit role exists in database (ID: 41e09855-d136-43c8-ac83-dcf701319f39)
- GraduateToAgentDialog.tsx (fully functional)
- AdminControlCenter.tsx role-based filtering (working correctly)
- Graduate button with permission checks (Admin/Trainer/Contracting Manager only)
- User activity logging table and RPC functions
- Avatars storage bucket with RLS policies
- MyRecruitingPipeline.tsx component (basic structure exists)

## Task 1: Enhance AddRecruitDialog (CRITICAL)

### Current AddRecruitDialog Fields (ONLY THESE 9):
```typescript
{
  first_name, last_name, email, phone,
  instagram_username, instagram_url,
  linkedin_username, linkedin_url,
  referral_source
}
```

### Missing Required Fields (ADD THESE):
**Personal/Contact:**
- date_of_birth (DATE) - Required for compliance
- street_address (TEXT)
- city (TEXT)
- state (VARCHAR(2)) - Mailing address state
- zip (VARCHAR(10))

**Professional/Licensing:**
- resident_state (VARCHAR(2)) - Primary state for licensing
- license_number (TEXT) - If already licensed
- npn (TEXT) - National Producer Number (if has one)
- license_expiration (DATE) - If already licensed

**Assignment:**
- upline_id (UUID) - Assign upline/trainer
- current_onboarding_phase (TEXT) - Default to 'initial_contact'

**Additional Social:**
- facebook_handle (TEXT)
- personal_website (TEXT)

### Form Organization (Use Tabs):
1. **Basic Info Tab**: name, email, phone, DOB
2. **Address Tab**: street, city, state, zip
3. **Professional Tab**: resident_state, license_number, npn, license_expiration
4. **Assignment Tab**: upline_id (dropdown of agents/trainers), recruiter_id (auto-set to current user)
5. **Social/Marketing Tab**: instagram, linkedin, facebook, website
6. **Referral Tab**: referral_source, notes

### Form Validation:
- First name, last name, email, phone, resident_state: REQUIRED
- DOB: REQUIRED (must be 18+)
- Address fields: OPTIONAL initially (can complete later)
- License info: OPTIONAL (may not have yet)
- Upline: OPTIONAL (can assign later)

### Default Values on Submit:
```typescript
{
  roles: ['recruit'], // ALWAYS set recruit role
  onboarding_status: 'interview_1', // Default starting phase
  current_onboarding_phase: 'initial_contact',
  approval_status: 'pending',
  recruiter_id: currentUser.id, // Auto-set
  onboarding_started_at: new Date().toISOString(),
}
```

### Edge Cases to Handle:
1. **Duplicate Email Check**: Query user_profiles first, show error if email exists
2. **Age Validation**: Must be 18+ (calculate from DOB)
3. **State Dropdown**: Use standard US state codes (AL, AK, AZ, etc.)
4. **Upline Dropdown**: Only show users with role 'agent', 'admin', 'trainer', or 'upline_manager'
5. **Phone Formatting**: Support (555) 555-5555 format
6. **License Fields**: Disabled if resident_state not selected
7. **Instagram/LinkedIn Username**: Auto-construct URL if only username provided

## Task 2: Complete MyRecruitingPipeline.tsx

### Current Features (Already Implemented):
- Profile display with avatar
- Progress bar and timeline
- Phase status visualization
- Profile photo upload
- Upline contact card

### Enhancements Needed:
1. **Document Upload Section**:
   - Required documents checklist based on phase
   - Upload button for each document type
   - Document status: pending, received, approved, rejected
   - Integration with `user_documents` table and `user-documents` storage bucket

2. **Phase Requirements Checklist**:
   - Fetch from `onboarding_phases` table
   - Show completion percentage per phase
   - Mark items as complete
   - Disable editing (view-only for recruit, editable by admin/trainer)

3. **Next Steps Section**:
   - Based on current phase, show:
     - What recruit needs to do next
     - Required documents
     - Deadlines (if any)
     - Who to contact for help

4. **Communication Section**:
   - Recent messages from upline/trainer
   - Quick contact button (sends notification or email)

5. **Social Media Profile Completion**:
   - If Instagram/LinkedIn usernames exist, show profile cards
   - If missing, show "Add your social profiles" prompt
   - Fetch social photos as fallback for profile picture

### Edge Cases:
1. **No Upline Assigned**: Show message "No upline assigned yet. An admin will assign you soon."
2. **Photo Upload Failures**: Show error message, validate file size/type before upload
3. **Empty Activity Log**: Show "No activity yet"
4. **Completed Onboarding**: Show congratulations message with gradient to agent role

## Task 3: Wire Up Recruit Dashboard to Navigation

### Current State:
- Route exists: `src/routes/recruiting.pipeline.tsx`
- Route component: `MyRecruitingPipeline`
- Navigation updated but needs verification

### Verification Needed:
1. Check `src/components/navigation/AppNavigation.tsx` for recruit navigation
2. Ensure recruits ONLY see:
   - "My Pipeline" (their recruiting progress)
   - NO access to policies, commissions, clients, etc.
3. Ensure route is protected by role check

### Navigation Rules:
```typescript
// For users with 'recruit' role ONLY:
if (userHasAnyRole(['recruit'])) {
  return [{
    title: 'My Progress',
    items: [{
      title: 'My Pipeline',
      href: '/recruiting/pipeline',
      icon: Users,
      description: 'Track your onboarding progress'
    }]
  }];
}
```

## Task 4: Create Notifications Table (If Not Exists)

The GraduateToAgentDialog tries to insert into `notifications` table but it may not exist yet.

### Check First:
```sql
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'notifications'
);
```

### If Missing, Create:
```sql
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
```

## Task 5: Testing & Validation

### Test Flow 1: Create Recruit
1. Admin/Trainer opens AddRecruitDialog
2. Fill all required fields
3. Submit and verify:
   - User created with `roles = ['recruit']`
   - Appears in Recruiting Pipeline tab (NOT Users & Access)
   - `onboarding_status = 'interview_1'`
   - `current_onboarding_phase = 'initial_contact'`

### Test Flow 2: Recruit Dashboard
1. Log in as recruit
2. Verify ONLY sees "My Pipeline" in navigation
3. Can view their progress
4. Can upload profile photo
5. Can see upline contact (if assigned)
6. CANNOT access policies, commissions, etc.

### Test Flow 3: Graduate Recruit
1. Admin/Trainer logs in
2. Navigate to Recruiting Pipeline
3. Move recruit through phases to 'bootcamp'
4. Click Graduate button
5. Set contract level (e.g., 80%)
6. Add notes
7. Click "Graduate to Agent"
8. Verify:
   - User now has `roles = ['agent']`
   - Moved from Recruiting Pipeline to Users & Access tab
   - Upline received notification
   - Activity log entry created
   - User can now access agent dashboard

### Test Flow 4: Permission Checks
1. Regular agent (non-admin/trainer) logs in
2. Navigate to Recruiting Pipeline
3. Verify Graduate button DOES NOT SHOW
4. Only Edit button visible

## Critical Reminders

### DO NOT:
- ❌ Create duplicate GraduateToAgentDialog (already exists)
- ❌ Modify AdminControlCenter filtering logic (already correct)
- ❌ Create new recruit role migration (already applied)
- ❌ Add localStorage for any application data
- ❌ Create new files without checking if they exist first
- ❌ Use mock/placeholder data

### DO:
- ✅ Read existing code before making changes
- ✅ Use TanStack Form for form validation
- ✅ Use Supabase for ALL data persistence
- ✅ Use role-based access control (RBAC)
- ✅ Invalidate queries after mutations
- ✅ Show loading states during async operations
- ✅ Handle errors gracefully with user-friendly messages
- ✅ Test with real data from database
- ✅ Use TypeScript strict mode
- ✅ Follow existing naming conventions

### Database Safety:
- All migrations must be idempotent (safe to run multiple times)
- Use `IF NOT EXISTS` for CREATE statements
- Use `ON CONFLICT DO NOTHING` for INSERT statements
- Test migrations locally before applying to production
- Use transactions (BEGIN/COMMIT) for multi-step migrations

### Files to Modify (In Order):
1. `src/features/recruiting/components/AddRecruitDialog.tsx` - Enhance form
2. `src/features/recruiting/pages/MyRecruitingPipeline.tsx` - Complete dashboard
3. `src/components/navigation/AppNavigation.tsx` - Verify recruit navigation
4. `supabase/migrations/YYYYMMDD_NNN_create_notifications_table.sql` - If needed
5. Test everything end-to-end

### Success Criteria:
- [ ] AddRecruitDialog collects all required fields
- [ ] Recruits appear only in Recruiting Pipeline tab
- [ ] Recruits can access ONLY their dashboard
- [ ] Recruit dashboard shows progress, documents, next steps
- [ ] Graduate button works correctly with permissions
- [ ] Upline receives notification on graduation
- [ ] Graduated users move to Users & Access tab
- [ ] All TypeScript compilation passes
- [ ] No console errors in browser

## Final Notes

This is a comprehensive recruit onboarding system. Take your time, read existing code, and follow the project's conventions. The foundation is solid - now we need to complete the user-facing features.

**Start by reading:** `recruit_role_and_graduation_completed.md` memory file to understand what's already done.

**Then proceed with:** Task 1 (Enhance AddRecruitDialog), followed by Tasks 2-5 in order.

Good luck! 🎯
