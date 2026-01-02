# Registration Invite System - Comprehensive Bug Fix Session

**Date**: 2026-01-02
**Priority**: P0 - CRITICAL
**Status**: IN PROGRESS - 2 Major Issues Remain

---

## 🔴 CRITICAL BUGS STILL BROKEN

### Bug 1: User Created Immediately (Should Wait for Form Submission)

**Current Behavior:**
- Recruiter sends invite to `nick.neessen@gmail.com`
- User IMMEDIATELY appears in recruiting list table
- No email form submission required

**Expected Behavior:**
- Recruiter sends invite
- Invitation stored with email only (no user_profiles record yet)
- Email sent with registration link
- Recruitee clicks link → fills out registration form → submits
- ONLY THEN is user created in user_profiles table

**Why This Matters:**
- Recruiting table shows phantom recruits who never registered
- Can't distinguish between "invited but not registered" vs "registered pending approval"

**Root Cause:**
`recruitInvitationService.ts:88-113` creates placeholder user_profiles record immediately:

```typescript
// This runs when recruiter sends invite (WRONG!)
const { data: recruit, error: recruitError } = await supabase
  .from("user_profiles")
  .insert({
    email: email.toLowerCase().trim(),
    roles: ["recruit"],
    approval_status: "pending",
    // ...
  })
  .select()
  .single();
```

**Schema Constraint:**
```sql
-- supabase/migrations/20260101_001_recruit_invitations.sql:13
recruit_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE
```
`recruit_id` is NOT NULL! Can't create invitation without user_id.

**Fix Required:**
1. Make `recruit_id` nullable in recruit_invitations table
2. Store invitation with just email (no recruit_id)
3. Create user_profiles record ONLY when form submitted
4. Link invitation to user after creation

---

### Bug 2: Registration Page Stuck on "Verifying your invitation..."

**Test URL:** https://www.thestandardhq.com/register/f0a98db7-9611-41b2-89dd-f27c7c20a13f

**Current Behavior:**
- Click "Complete Registration" button in email
- Page loads
- Stuck spinning: "Verifying your invitation..."
- No console errors
- Never proceeds to registration form

**Expected Behavior:**
- Load page
- Verify token is valid
- Show registration form pre-filled with email/name
- Allow user to fill in additional details
- Submit → create user → mark invitation complete

**Likely Causes:**
1. RPC `get_public_invitation_by_token` hanging or erroring silently
2. Token validation checking for user_profiles record that doesn't exist
3. React component not handling loading state properly
4. Route not public (but /register/ was added to publicPaths)

**Files to Check:**
- `src/routes/register/$token.tsx` - Registration page route
- `src/features/recruiting/hooks/useRecruitInvitations.ts:343` - `useInvitationByToken` hook
- `supabase/migrations/20260101_001_recruit_invitations.sql:157-259` - RPC function

---

## ✅ WHAT WAS FIXED (DEPLOYED)

### Fix 1: Double Submission Race Condition ✅
- **Problem**: Button had `type="submit"` + `onClick` causing two simultaneous requests
- **Root Cause**: Button is OUTSIDE form, Enter key in fields triggered form onSubmit twice
- **Fix**: Changed to `type="button"` + added `if (isSubmitting) return;` guard
- **File**: `src/features/recruiting/components/SendInviteDialog.tsx:242-243`
- **Commit**: `84c42a7f`

### Fix 2: Rollback Failure Due to RLS ✅
- **Problem**: When invitation creation failed, couldn't delete orphaned user
- **Root Cause**: DELETE policy blocked recruiters from deleting other users
- **Fix**: Added policy allowing recruiters to delete own recruits within 5 minutes
- **Migration**: `supabase/migrations/20260102_003_allow_recruit_creation_rollback.sql`
- **Applied**: YES (production database)

---

## 📁 KEY FILES

### Frontend
- `src/features/recruiting/components/SendInviteDialog.tsx` - Invite dialog
- `src/features/recruiting/hooks/useRecruitInvitations.ts` - React Query hooks
- `src/services/recruiting/recruitInvitationService.ts` - Business logic
- `src/routes/register/$token.tsx` - Registration page (FIND THIS FILE)

### Backend
- `supabase/migrations/20260101_001_recruit_invitations.sql` - Invitation system
- `supabase/migrations/20260102_003_allow_recruit_creation_rollback.sql` - Rollback policy

### Database Tables
- `recruit_invitations` - Invitation records with tokens
- `user_profiles` - User records (created too early!)

### RPC Functions
- `create_recruit_invitation(p_recruit_id, p_email, p_message)` - Create invitation
- `get_public_invitation_by_token(p_token)` - Validate token (PUBLIC, no auth)
- `submit_recruit_registration(p_token, p_data)` - Submit form (PUBLIC, no auth)
- `mark_invitation_sent(p_invitation_id)` - Mark as sent

---

## 🗄️ DATABASE STATE

### Test Email: nick.neessen@gmail.com

**User Profiles Query:**
```sql
SELECT id, email, first_name, last_name, recruiter_id, upline_id,
       roles, approval_status, onboarding_status, created_at
FROM user_profiles
WHERE email = 'nick.neessen@gmail.com';
```

**Invitations Query:**
```sql
SELECT id, recruit_id, inviter_id, invite_token, email, status,
       sent_at, viewed_at, completed_at, expires_at, created_at
FROM recruit_invitations
WHERE email = 'nick.neessen@gmail.com'
ORDER BY created_at DESC
LIMIT 5;
```

**Current Token:** `f0a98db7-9611-41b2-89dd-f27c7c20a13f`

---

## 🔍 DEBUGGING STEPS

### For Bug 1 (Immediate User Creation)

**Step 1: Understand Current Flow**
```typescript
// recruitInvitationService.ts:24-163
async createRecruitWithInvitation(email, options) {
  // 1. Check if user exists
  // 2. Create user_profiles record ← TOO EARLY!
  // 3. Create invitation RPC
  // 4. Hook sends email
  // 5. Mark invitation as sent
}
```

**Step 2: Design New Flow**
1. Modify `recruit_invitations` table schema:
   - Make `recruit_id` nullable
   - Add constraint: `recruit_id` must be set before status = 'completed'

2. Update `createRecruitWithInvitation`:
   - Skip user creation
   - Create invitation with null recruit_id
   - Store email, first_name, last_name in invitation record

3. Update `submit_recruit_registration`:
   - Create user_profiles record
   - Link invitation to new user
   - Mark invitation complete

**Step 3: Migration**
```sql
-- Make recruit_id nullable
ALTER TABLE recruit_invitations
  ALTER COLUMN recruit_id DROP NOT NULL;

-- Add constraint
ALTER TABLE recruit_invitations
  ADD CONSTRAINT check_recruit_id_on_complete
  CHECK (
    (status != 'completed') OR
    (status = 'completed' AND recruit_id IS NOT NULL)
  );
```

### For Bug 2 (Verification Stuck)

**Step 1: Find Registration Route**
```bash
find src -name "*register*" -type f | grep -E "\.(tsx|ts)$"
```

**Step 2: Check Hook Implementation**
```typescript
// useRecruitInvitations.ts:343-358
export function useInvitationByToken(token: string | undefined) {
  return useQuery<InvitationValidationResult>({
    queryKey: ["public-invitation", token],
    queryFn: () =>
      token
        ? recruitInvitationService.validateToken(token)
        : Promise.resolve({
            valid: false,
            error: "invitation_not_found" as const,
            message: "No token provided",
          }),
    enabled: !!token,
    staleTime: 0,
    retry: false,
  });
}
```

**Step 3: Test RPC Directly**
```sql
SELECT get_public_invitation_by_token('f0a98db7-9611-41b2-89dd-f27c7c20a13f'::uuid);
```

**Step 4: Check RPC Code**
Look at `supabase/migrations/20260101_001_recruit_invitations.sql:157-259`:
- Does it handle missing recruit properly?
- Does it return error or hang?
- Is SECURITY DEFINER working?

**Step 5: Check Route**
- Is route component using hook correctly?
- Is loading state shown while query pending?
- Is error state handled?

---

## 🎯 SUCCESS CRITERIA

### Full Working Flow

1. **Recruiter sends invite**
   - ✅ Dialog submits successfully
   - ✅ No error shown
   - ✅ Dialog closes
   - ❌ User should NOT appear in recruiting table yet

2. **Email sent**
   - ✅ Email delivered to nick.neessen@gmail.com
   - ✅ Contains registration link
   - ✅ Link format: `https://www.thestandardhq.com/register/{token}`

3. **Recruitee clicks link**
   - ✅ Page loads
   - ❌ Token verified (currently stuck)
   - ❌ Registration form shown
   - ❌ Email/name pre-filled

4. **Recruitee submits form**
   - ❌ User created in user_profiles
   - ❌ Invitation marked complete
   - ❌ User appears in recruiting table
   - ❌ Confirmation shown

---

## 📝 NEXT SESSION ACTIONS

### Priority 1: Fix Verification Stuck (Bug 2)
This blocks everything else. User can't even see the form.

1. Find registration route file
2. Add console logging to track execution
3. Test RPC function directly
4. Check for CORS/auth issues
5. Fix whatever is hanging

### Priority 2: Fix Immediate User Creation (Bug 1)
Once verification works, fix the flow.

1. Create migration to make recruit_id nullable
2. Update createRecruitWithInvitation to NOT create user
3. Update submit_recruit_registration to create user
4. Test full flow end-to-end

### Priority 3: Cleanup
1. Delete test users (nick.neessen@gmail.com)
2. Verify no orphaned invitations
3. Test with fresh email
4. Document new flow

---

## 🔗 QUICK REFERENCE

**Database Connection:**
```bash
PGPASSWORD="N123j234n345!$!" psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
```

**Current Test Token:**
```
f0a98db7-9611-41b2-89dd-f27c7c20a13f
```

**Test URL:**
```
https://www.thestandardhq.com/register/f0a98db7-9611-41b2-89dd-f27c7c20a13f
```

**Commits:**
- `727ce28d` - Initial double submission fix (broke button)
- `84c42a7f` - Restored button + added guard (CURRENT)

---

## 💬 CONTINUATION PROMPT

```
I'm continuing work on the registration invite system bugs. Two critical issues remain:

BUG 1: User is added to recruiting table IMMEDIATELY when invite sent, but should only be added AFTER they submit the registration form on their end.

BUG 2: Registration page stuck on "Verifying your invitation..." when clicking the email link. No console errors. URL: https://www.thestandardhq.com/register/f0a98db7-9611-41b2-89dd-f27c7c20a13f

Previous session fixed:
- Double submission race condition (button outside form)
- Rollback failure (RLS policy preventing recruit deletion)

Read the full context in plans/active/registration-invite-system-fixes.md

Start by fixing Bug 2 (verification stuck) since it blocks testing Bug 1.
```
