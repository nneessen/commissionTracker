# Recruit Auth User Creation Bug - FIXED

## Issue Summary
When an agent adds a recruit via the "Add Recruit" button on the Recruiting page, the system was creating a `user_profiles` record but NOT creating a corresponding `auth.users` record. This caused:
1. Password reset emails to fail ("User not found")
2. Recruits cannot log in when they graduate to agent status
3. Data integrity issues between `user_profiles` and `auth.users`

## Root Cause
The `recruitingService.createRecruit()` method at `src/services/recruiting/recruitingService.ts` was directly inserting into the `user_profiles` table without calling the `create-auth-user` Edge Function. Comments in the code stated:
```typescript
// Create profile-only record (NO auth user at this stage)
// Auth user will be created when recruit is advanced to phase 2+
```
However, this "phase 2+" logic was never implemented - it relied on manually clicking "Resend Invite" in `RecruitDetailPanel`.

## Solution Implemented
Modified `recruitingService.createRecruit()` to follow the same pattern as `userService.create()`:

1. **Call `create-auth-user` Edge Function first** - This creates the `auth.users` record and triggers creation of `user_profiles` via database trigger
2. **Update the profile with recruit-specific data** - Pipeline template, agent status, onboarding status, etc.
3. **Welcome email is automatically sent** - The Edge Function sends a password reset email so recruits can set up their login

## Files Changed

### `src/services/recruiting/recruitingService.ts`
- Rewrote `createRecruit()` method to:
  - Call `create-auth-user` Edge Function via `fetch()`
  - Handle duplicate email cases
  - Update the created profile with recruit-specific fields
  - Properly error handle and log failures

### `src/features/recruiting/hooks/useRecruitMutations.ts`
- Updated toast message to indicate welcome email is sent:
  - Old: "Successfully added {name} as a prospect."
  - New: "Successfully added {name}. Welcome email sent to {email}"

## Testing Checklist
After deploying this fix:
- [ ] Test: Agent adds recruit → verify auth.users record created (check Supabase Auth dashboard)
- [ ] Test: Recruit receives welcome email with password setup link
- [ ] Test: Recruit can log in after setting password
- [ ] Test: Duplicate email detection works (should show error)
- [ ] Test: Error handling when edge function fails

## Migration for Existing Recruits
Existing recruits without `auth.users` records will need to be handled manually:
1. Use the "Resend Invite" button in `RecruitDetailPanel` to create auth user on-demand
2. Or run a migration script to create auth users for orphaned profiles

### SQL Query to Find Orphaned Profiles
```sql
SELECT
  p.id,
  p.email,
  p.first_name || ' ' || p.last_name as name,
  p.roles,
  p.created_at,
  p.onboarding_status
FROM user_profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL
  AND p.is_deleted = false
ORDER BY p.created_at DESC;
```

## Status: FIXED ✅
- Implementation complete
- TypeScript build passes
- Ready for manual testing
