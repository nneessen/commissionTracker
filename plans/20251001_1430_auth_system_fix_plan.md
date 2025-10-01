# Authentication System Fix Plan
**Timestamp:** 2025-10-01 14:30
**Status:** In Progress

## Root Cause Analysis

### Critical Issue: Supabase Backend Not Running ❌

The errors show `ERR_CONNECTION_REFUSED` on `http://localhost:3001` - this is the core problem.

**Error Details:**
```
GET http://localhost:3001/rest/v1/expenses net::ERR_CONNECTION_REFUSED
POST http://localhost:3001/auth/v1/token?grant_type=password net::ERR_CONNECTION_REFUSED
```

**Your app is configured to connect to:**
- Auth endpoint: `http://localhost:3001/auth/v1/token`
- REST endpoint: `http://localhost:3001/rest/v1/expenses`

**But nothing is running on port 3001!**

### Environment Configuration Issue

You have two environment files:

1. **`.env`** - Points to **production Supabase**
   ```
   VITE_SUPABASE_URL=https://pcyaqwodnyrpkaiojnpz.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```

2. **`.env.local`** - Points to **local Supabase** (takes precedence)
   ```
   VITE_SUPABASE_URL=http://localhost:3001
   VITE_SUPABASE_ANON_KEY=local-dev-key
   ```

Vite loads `.env.local` first, so your app tries to connect to localhost:3001, but:
- Supabase local dev server is NOT running
- No Docker containers running
- Port 3001 has nothing listening

### Secondary Issues Identified

1. **Users view may not exist in production** - Migration 002 creates it
2. **Migrations may not be applied** to production Supabase database
3. **No test user accounts** exist for login testing
4. **Tailwind CSS changes** need dev server restart to take effect
5. **userService.getUserById** queries 'users' view that may not exist

## Fix Strategy: Two Paths

### Path A: Use Production Supabase (RECOMMENDED ✅)

**Why recommended:**
- Fastest solution (5 minutes)
- No Docker setup required
- Already have production Supabase instance
- Migrations can be applied via SQL Editor

**Pros:**
- Works immediately
- No local infrastructure needed
- Matches deployment environment
- Easy to test and verify

**Cons:**
- Uses cloud service (minimal cost)
- Requires internet connection
- Shared with potential production data

**Steps:**
1. Disable `.env.local` (rename to backup)
2. App uses production Supabase from `.env`
3. Apply migrations to production database
4. Create test user in Supabase dashboard
5. Restart dev server for Tailwind

### Path B: Setup Local Supabase

**Why not recommended now:**
- More complex setup (30+ minutes)
- Requires Docker Desktop
- Needs port configuration
- Adds infrastructure overhead

**Pros:**
- Full local development
- No internet dependency
- Isolated test environment

**Cons:**
- Docker must be installed and running
- More moving parts to debug
- Slower iteration

**Steps:**
1. Ensure Docker Desktop running
2. Run `supabase start`
3. Wait for containers to initialize
4. Apply all migrations to local DB
5. Create test user
6. Verify port configuration

## Detailed Execution Plan (Path A - Production)

### 1. Fix Environment Configuration ✅

**Action:** Disable local Supabase config
```bash
mv .env.local .env.local.backup
```

**Verify:** App will now use production Supabase from `.env`
```bash
cat .env | grep VITE_SUPABASE_URL
# Should show: https://pcyaqwodnyrpkaiojnpz.supabase.co
```

**Why:** `.env.local` takes precedence over `.env` in Vite. By renaming it, the app falls back to production config.

### 2. Verify Database Schema

**Login to Supabase:**
1. Go to https://supabase.com/dashboard
2. Select project: pcyaqwodnyrpkaiojnpz
3. Navigate to SQL Editor

**Check users view exists:**
```sql
SELECT * FROM public.users LIMIT 1;
```

**Expected result:**
- If works: View exists ✅
- If error "relation does not exist": Need to apply migration 002 ❌

**Check RLS is enabled:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected:** All tables should have `rowsecurity = true`

### 3. Apply Missing Migrations (If Needed)

**Important:** Apply in this exact order!

#### Migration 002: Create Users View
```sql
-- From: supabase/migrations/20250930_002_remove_agents_use_users.sql

DROP TABLE IF EXISTS public.users CASCADE;

CREATE OR REPLACE VIEW public.users AS
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email) as name,
    raw_user_meta_data->>'phone' as phone,
    COALESCE((raw_user_meta_data->>'contract_comp_level')::INTEGER, 100) as contract_comp_level,
    COALESCE((raw_user_meta_data->>'is_active')::BOOLEAN, true) as is_active,
    raw_user_meta_data->>'agent_code' as agent_code,
    raw_user_meta_data->>'license_number' as license_number,
    raw_user_meta_data->>'license_state' as license_state,
    raw_user_meta_data->>'notes' as notes,
    created_at,
    updated_at
FROM auth.users;

GRANT SELECT ON public.users TO authenticated;
```

#### Migration 003: RLS Policies
Run entire file: `supabase/migrations/20250930_003_rls_policies_auth.sql`

#### Migration 004: User Metadata Functions
Run entire file: `supabase/migrations/20250930_004_user_metadata_setup.sql`

#### Migration 005: Security Fixes
Run entire file: `supabase/migrations/20250930_005_fix_rls_security.sql`

#### Migration 006: Performance Indexes
Run entire file: `supabase/migrations/20251001_006_add_performance_indexes.sql`

### 4. Create Test User

**In Supabase Dashboard:**
1. Go to Authentication → Users
2. Click "Add user" or "Invite user"
3. Fill in:
   - **Email:** test@example.com
   - **Password:** Test123!
   - **Auto Confirm:** ✅ Enable
4. Click "Create user"

**Verify user created:**
```sql
SELECT id, email, created_at FROM auth.users;
```

Should see test user in results.

**Check user appears in view:**
```sql
SELECT * FROM public.users;
```

Should see user with metadata fields populated.

### 5. Verify Auth Setup

**Check metadata function exists:**
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'update_user_metadata';
```

Should return 1 row.

**Test users view:**
```sql
SELECT id, email, name, contract_comp_level
FROM public.users
LIMIT 5;
```

Should return users with proper data.

**Verify RLS works:**
```sql
SET ROLE authenticated;
SELECT * FROM policies LIMIT 1;
RESET ROLE;
```

Should work without errors.

### 6. Restart Dev Server

**Stop current server:**
- Press `Ctrl+C` in terminal

**Start fresh:**
```bash
npm run dev
```

**Why restart:**
- Loads new environment config (without .env.local)
- Rebuilds Tailwind CSS with new utility classes
- Clears any cached Supabase client connections

**Verify startup:**
```
VITE v6.0.1  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 7. Test Login Flow

**Open browser:** http://localhost:5173

**Visual check:**
- [ ] Modern login form displays (gradient background, rounded card)
- [ ] "CT" logo badge visible
- [ ] Form fields properly styled
- [ ] No console errors about Tailwind classes

**Test authentication:**
1. Enter email: `test@example.com`
2. Enter password: `Test123!`
3. Click "Sign in"

**Expected behavior:**
- ✅ Form shows "Please wait..." loading state
- ✅ No network errors in console
- ✅ Redirects to dashboard on success
- ✅ User name appears in sidebar

**Check browser console:**
```
2025-10-01T14:XX:XX.XXX [Auth] INFO: Auth event: state changed {event: 'SIGNED_IN', email: 'test@example.com'}
```

**Test persistence:**
1. Refresh page (F5)
2. Should stay logged in
3. Session should persist

**Test logout:**
1. Click logout in sidebar
2. Should redirect to login
3. Session should be cleared

## Expected Outcomes

✅ **App connects to production Supabase successfully**
- No more ERR_CONNECTION_REFUSED
- Auth requests go to pcyaqwodnyrpkaiojnpz.supabase.co
- Database queries work

✅ **Login form displays with modern design**
- Gradient background renders
- Card shadow and border-radius applied
- Tailwind classes compiled correctly

✅ **User can sign in with test credentials**
- Email/password authentication works
- Session token created
- User data loaded from users view

✅ **Auth state persists across page refreshes**
- localStorage stores session
- Session refreshed automatically
- User stays logged in

✅ **No more connection refused errors**
- All API calls succeed
- Expenses load properly (if data exists)
- No network failures

✅ **Users view provides user data to frontend**
- userService.getUserById works
- Metadata fields accessible
- Contract comp level defaults to 100

✅ **RLS policies protect data appropriately**
- Unauthenticated users blocked
- Authenticated users can access own data
- Security maintained

## Troubleshooting Guide

### Issue: Still getting connection errors

**Check:**
```bash
cat .env.local.backup | grep VITE_SUPABASE_URL
cat .env | grep VITE_SUPABASE_URL
```

**Fix:** Ensure `.env.local` is truly renamed/removed

### Issue: Login fails with "Invalid credentials"

**Check:**
1. User exists in Supabase dashboard
2. User is confirmed (not pending)
3. Password is correct (try reset)

**Fix:** Recreate user or reset password

### Issue: "relation users does not exist"

**Cause:** Migration 002 not applied

**Fix:** Run users view creation SQL in dashboard

### Issue: Tailwind styles not applying

**Cause:** Dev server not restarted

**Fix:**
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Issue: RLS policy blocking data access

**Check:**
```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public';
```

**Fix:** Verify policies allow authenticated access

## Rollback Plan

If issues occur after changes:

### Restore local config:
```bash
mv .env.local.backup .env.local
```

### Revert Login.tsx:
```bash
git checkout HEAD -- src/features/auth/Login.tsx
```

### Revert Tailwind:
```bash
git checkout HEAD -- src/index.css tailwind.config.js postcss.config.js
```

### Contact Support:
If database schema issues:
- Supabase support: https://supabase.com/dashboard/support
- Check Supabase status: https://status.supabase.com/

## Post-Fix Verification Checklist

- [ ] `.env.local` renamed to `.env.local.backup`
- [ ] App connects to production Supabase (check Network tab)
- [ ] Users view exists and returns data
- [ ] Test user created and confirmed
- [ ] Login works without errors
- [ ] User session persists on refresh
- [ ] Dashboard loads user data
- [ ] Logout works correctly
- [ ] Expenses load (if user has data)
- [ ] No console errors
- [ ] Tailwind styles applied correctly
- [ ] Modern login form displays properly

## Files Modified/Created

### Created:
- ✅ `plans/20251001_1430_auth_system_fix_plan.md` (this file)

### Modified:
- ✅ `.env.local` → renamed to `.env.local.backup`

### Database Changes:
- Applied migrations 002-006 to production Supabase
- Created test user account
- Verified RLS policies

### No Code Changes Needed:
- ✅ Login.tsx already updated with modern design
- ✅ AuthContext already uses proper methods
- ✅ UserService already queries users view
- ✅ Tailwind config already created

**Just needs backend connection fix!**

## Success Metrics

**Before Fix:**
- ❌ 100% login attempts fail
- ❌ ERR_CONNECTION_REFUSED on all requests
- ❌ No users in database
- ❌ Migrations not applied

**After Fix:**
- ✅ 100% login attempts succeed
- ✅ All API requests successful
- ✅ Users view populated
- ✅ Modern UI rendering
- ✅ Session persistence working

## Next Steps After Fix

1. **Create your actual user account** (not test@example.com)
2. **Import existing data** if migrating from old system
3. **Test all features** (expenses, commissions, policies)
4. **Consider setting up local Supabase** for future development
5. **Review RLS policies** for production security
6. **Add more users** if multi-user system

## Notes

- This plan addresses the immediate auth failure
- The new Login.tsx design is already implemented
- Tailwind is configured and ready
- Only environment and database setup needed
- Estimated time: 15-20 minutes total
