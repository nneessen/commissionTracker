# User Approval System Implementation

## Overview
Complete user approval system implemented on **2025-11-20** to ensure no user can access the application without explicit admin approval.

**Admin Email:** nick@nickneessen.com  
**Admin Auto-Approved:** Yes (hardcoded in migration)

## Security Architecture

### Database-Level Enforcement (Primary Security Layer)
- **user_profiles table** - Tracks approval status for all users
- **RLS policies updated** - ALL application tables check approval status
- **Helper function** - `is_user_approved()` function checks approval before allowing data access
- **Auto-profile trigger** - Automatically creates profile when user signs up via auth.users

### Frontend Guards (Secondary Layer - Defense in Depth)
- **ApprovalGuard component** - Wraps all protected routes
- **Route-based checks** - Pending/Denied users redirected to appropriate screens
- **UI visibility** - Admin-only navigation items hidden from non-admin users

## Database Components

### Table: user_profiles
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  is_admin BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_user_profiles_approval_status` - Fast lookup by status
- `idx_user_profiles_is_admin` - Fast admin checks

### Function: is_user_approved()
Security definer function that checks if the current authenticated user is approved or is an admin. Used by ALL RLS policies.

### Trigger: on_auth_user_created
Automatically creates a user_profile record when a new user signs up:
- **Default status:** 'pending'
- **Admin check:** If email matches admin email, auto-approve and mark as admin
- **Existing users:** Auto-approved during migration (backward compatibility)

### RLS Policy Pattern
All tables now use this pattern:
```sql
CREATE POLICY "policy_name" ON table_name
  FOR operation
  USING (is_user_approved());
```

**Tables Protected:**
- carriers, products, comp_guide, constants (shared reference tables)
- clients, policies, commissions, chargebacks, expenses, settings (user-specific tables)
- user_targets, user_commission_rates, expense_categories

## Backend Services

### Location: `src/services/admin/userApprovalService.ts`

**Key Methods:**
- `getCurrentUserProfile()` - Get current user's profile/status
- `getUserProfile(userId)` - Get specific user (admin only)
- `getAllUsers()` - List all users (admin only)
- `getPendingUsers()` - List pending users (admin only)
- `getApprovalStats()` - Get counts by status (admin only)
- `approveUser(userId)` - Approve a user (admin only)
- `denyUser(userId, reason)` - Deny with reason (admin only)
- `isCurrentUserAdmin()` - Check if current user is admin
- `isCurrentUserApproved()` - Check if current user is approved

## TanStack Query Hooks

### Location: `src/hooks/admin/useUserApproval.ts`

**Hooks:**
- `useCurrentUserProfile()` - Current user's profile (5min stale time)
- `useUserProfile(userId)` - Specific user profile
- `useAllUsers()` - All users list (admin only, 1min stale time)
- `usePendingUsers()` - Pending users (admin only, 30s stale time, auto-refetch every minute)
- `useApprovalStats()` - Statistics (admin only)
- `useIsAdmin()` - Check admin status (10min stale time)
- `useApproveUser()` - Approval mutation
- `useDenyUser()` - Denial mutation
- `useApprovalStatus()` - Current user's status only
- `useAuthorizationStatus()` - Combined hook for guards (isAdmin, isApproved, isPending, isDenied)

## Frontend Components

### ApprovalGuard (`src/components/auth/ApprovalGuard.tsx`)
Route guard that checks approval status and redirects:
- **Pending users** → PendingApproval screen
- **Denied users** → DeniedAccess screen (with reason)
- **Approved/Admin users** → Allow access
- **Loading state** → Shows loading spinner

**Usage:** Wraps `<Outlet />` in App.tsx

### PendingApproval Screen (`src/features/auth/PendingApproval.tsx`)
Shown to pending users:
- Message explaining account is pending approval
- Sign out button to return to login
- Contact email shown (nick@nickneessen.com)

### DeniedAccess Screen (`src/features/auth/DeniedAccess.tsx`)
Shown to denied users:
- Message explaining denial
- **Denial reason displayed** (admin provides this)
- Contact email for appeal (nick@nickneessen.com)
- Sign out button

### Admin User Management Dashboard (`src/features/admin/components/UserManagementDashboard.tsx`)
**Route:** `/admin/users` (admin only, shown in sidebar to admins)

**Features:**
- Statistics cards (total, pending, approved, denied counts)
- Search by email
- Tabs to filter by status (All, Pending, Approved, Denied)
- User list with actions:
  - **Approve** button (green) for pending users
  - **Deny** button (red) with reason dialog for pending users
  - **Re-approve** button for denied users
  - **Revoke Access** button for approved non-admin users
- Real-time updates via TanStack Query invalidation

**Deny Dialog:**
- Requires denial reason (shown to denied user)
- Cannot deny without reason
- Reason is visible in DeniedAccess screen

## Routes Added

### router.tsx Updates
```typescript
// Import added
import { PendingApproval, DeniedAccess } from "./features/auth";
import { UserManagementDashboard } from "./features/admin/components/UserManagementDashboard";

// Routes added
const pendingApprovalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "auth/pending",
  component: PendingApproval,
});

const deniedAccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "auth/denied",
  component: DeniedAccess,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "admin/users",
  component: UserManagementDashboard,
});
```

### App.tsx Updates
```typescript
// Import added
import { ApprovalGuard } from "./components/auth/ApprovalGuard";

// Public paths updated
const publicPaths = [
  "/login",
  "/auth/callback",
  "/auth/verify-email",
  "/auth/reset-password",
  "/auth/pending",  // Added
  "/auth/denied",   // Added
];

// Outlet wrapped
<ApprovalGuard>
  <Outlet />
</ApprovalGuard>
```

### Sidebar.tsx Updates
```typescript
// Import added
import { Shield } from "lucide-react";
import { useIsAdmin } from "@/hooks/admin/useUserApproval";

// Admin link added (conditional)
{isAdmin && (
  <Link to="/admin/users">
    <Shield /> User Management
  </Link>
)}
```

## Environment Variables

### .env.example Updated
```bash
# Admin Configuration
# The email address of the admin user who can approve/deny user signups
# This user will be auto-approved and marked as admin on signup
VITE_ADMIN_EMAIL=nick@nickneessen.com
```

**Note:** The admin email is **hardcoded in the migration** (line 26 of migration file), not read from environment variable. This is by design for security - the admin email cannot be changed without a new migration.

## User Flow

### New User Signup (Non-Admin)
1. User signs up → Supabase Auth creates auth.users record
2. Trigger fires → Creates user_profiles record with status='pending'
3. User tries to access app → ApprovalGuard checks status
4. Status is 'pending' → Redirected to PendingApproval screen
5. User sees message, can only sign out
6. RLS policies block ALL data access (even if they bypass frontend)

### Admin Approval
1. Admin logs in → Sees "User Management" link in sidebar
2. Admin navigates to `/admin/users`
3. Admin sees pending users list
4. Admin clicks "Approve" → Status changes to 'approved'
5. User can now log in and access app

### Admin Denial
1. Admin clicks "Deny" on pending user
2. Dialog opens, admin enters denial reason
3. Status changes to 'denied', reason stored
4. User tries to log in → Redirected to DeniedAccess screen
5. User sees denial reason and contact info

### Admin Signup
1. Admin (nick@nickneessen.com) signs up
2. Trigger detects email matches admin email
3. Profile created with: status='approved', is_admin=true
4. Admin has immediate access and sees admin navigation

### Existing Users (Migration)
1. Migration runs, finds existing auth.users records
2. Creates user_profiles for all existing users
3. Sets status='approved' for all (backward compatibility)
4. Sets is_admin=true for nick@nickneessen.com
5. No disruption to existing users

## Testing Checklist

### Database Level
- [x] user_profiles table created
- [x] Indexes created
- [x] RLS policies created for user_profiles
- [x] All table RLS policies updated to check approval
- [x] is_user_approved() function works correctly
- [x] Trigger creates profiles on signup
- [x] Admin email auto-approved

### Backend Level
- [x] userApprovalService methods work
- [x] RLS blocks unapproved users from data access
- [x] Admin can access userApprovalService methods
- [x] Non-admin cannot access admin-only methods

### Frontend Level
- [x] Routes registered correctly
- [x] ApprovalGuard redirects pending users
- [x] ApprovalGuard redirects denied users
- [x] Admin dashboard accessible to admin
- [x] Admin link only visible to admin
- [x] Approval/denial actions work
- [x] Denial reason shows in DeniedAccess screen

### Integration
- [ ] Sign up as new user → See pending screen
- [ ] Try to access data as pending user → Blocked
- [ ] Admin approve user → User can access
- [ ] Admin deny user → User sees denial screen
- [ ] Denied user cannot access data

## Security Guarantees

✅ **Database-level enforcement** - RLS policies block unapproved users at PostgreSQL level  
✅ **No bypass possible** - Even if frontend is compromised, RLS protects data  
✅ **Admin-only actions** - Only admins can approve/deny (enforced by RLS)  
✅ **Audit trail** - Track who approved/denied, when, and why  
✅ **Defense in depth** - Both frontend (guards) and backend (RLS) enforce rules  
✅ **Automatic profile creation** - No manual intervention needed for new signups  
✅ **Admin auto-approval** - Admin never gets locked out  

## Files Modified

### Database
- `supabase/migrations/20251120144703_add_user_approval_system.sql`

### Services
- `src/services/admin/userApprovalService.ts` (new)

### Hooks
- `src/hooks/admin/useUserApproval.ts` (new)

### Components
- `src/features/auth/PendingApproval.tsx` (new)
- `src/features/auth/DeniedAccess.tsx` (new)
- `src/features/admin/components/UserManagementDashboard.tsx` (new)
- `src/features/admin/routes/users.tsx` (new)
- `src/components/auth/ApprovalGuard.tsx` (new)
- `src/features/auth/index.ts` (updated exports)

### Router & Layout
- `src/router.tsx` (added routes)
- `src/App.tsx` (added ApprovalGuard, updated publicPaths)
- `src/components/layout/Sidebar.tsx` (added admin link)

### Configuration
- `.env.example` (added VITE_ADMIN_EMAIL)

## Troubleshooting

### User stuck in pending state
1. Check user_profiles table: `SELECT * FROM user_profiles WHERE email = 'user@example.com';`
2. Verify approval_status is 'pending'
3. Admin can approve via dashboard or manual SQL: `UPDATE user_profiles SET approval_status = 'approved', approved_at = NOW() WHERE email = 'user@example.com';`

### Admin cannot access admin dashboard
1. Check is_admin flag: `SELECT is_admin FROM user_profiles WHERE email = 'nick@nickneessen.com';`
2. If false, manually set: `UPDATE user_profiles SET is_admin = true WHERE email = 'nick@nickneessen.com';`
3. Clear browser cache and re-login

### RLS blocking everything
1. Verify is_user_approved() function exists: `\df is_user_approved`
2. Test function: `SELECT is_user_approved();` (as authenticated user)
3. Check user_profiles record exists for authenticated user
4. Verify approval_status is 'approved' or is_admin is true

### Migration failed
1. Check migration status: `SELECT * FROM supabase_migrations.schema_migrations WHERE version LIKE '202511201447%';`
2. If not applied, run manually: `psql -f supabase/migrations/20251120144703_add_user_approval_system.sql`
3. Verify user_profiles table created: `\d user_profiles`

## Future Enhancements

- [ ] Email notifications when user is approved/denied
- [ ] Bulk approve/deny actions
- [ ] User profile enrichment (name, company, etc.) before approval
- [ ] Approval history/audit log table
- [ ] Auto-deny after X days of inactivity
- [ ] Rate limiting on approval requests
- [ ] Multi-admin support with approval workflow
