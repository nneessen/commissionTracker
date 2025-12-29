# Continuation Prompt: Trainer/Contracting Admin Hub - RESTART

## CRITICAL: Previous Attempt Failed - Start Fresh

The previous implementation attempt broke things. The user reports:
1. **No Dashboard** appearing for trainers/contracting admins
2. **Training Hub** not appearing
3. **Contracting Hub** not appearing
4. **Recruiting Pipeline** not appearing
5. **Integrations tab** missing in settings
6. **Recruit detail panel** not showing pipeline progress when clicking a recruit

---

## What Was Attempted (And Failed)

### Files Modified (Need Review/Revert):
1. `src/router.tsx` - Removed `noStaffRoles` from recruiting, added contracting route
2. `src/components/layout/Sidebar.tsx` - Updated staffNavigationItems
3. `src/components/auth/RouteGuard.tsx` - Added staff bypass for subscription checks
4. `src/features/training-hub/components/TrainingHubPage.tsx` - Removed RecruitingTab
5. `src/types/database.types.ts` - Manually added carrier_contracts type

### Migrations Created:
- `supabase/migrations/20251229_002_add_recruiting_permission_to_staff.sql`

---

## User Requirements (Original Request)

Build a comprehensive hub for **trainers** and **contracting admins** to manage ALL recruits within an IMO:

### What They NEED:
1. **Their own Dashboard** - KPI-focused (not agent dashboard with commissions/policies)
2. **Access to existing Recruiting page** - See ALL recruits in their IMO (not just downline)
3. **Training Hub** - Email templates, automation, activity
4. **Contracting Hub** - Manage carrier contracts for recruits
5. **Messages** - Already accessible
6. **Settings** - Profile, notifications, **Integrations** (NO billing, carriers, products, comp guide)

### What They DON'T Need:
- Agent dashboard (commissions, policies, analytics)
- Policies page
- Analytics page
- Targets page
- Admin page
- Billing in settings
- Carriers/Products/Comp guide in settings

---

## Key Architecture Context

### Roles System:
- `STAFF_ONLY_ROLES`: trainer, contracting_manager (defined in `src/constants/roles.ts`)
- Staff have permissions: `nav.training_hub`, `nav.messages`, `nav.recruiting_pipeline`, `nav.contracting_hub`, `recruiting.read.all`

### Current RouteGuard Logic (`src/components/auth/RouteGuard.tsx`):
- `noStaffRoles` - blocks staff, redirects to `/trainer-dashboard`
- `staffOnly` - only staff can access
- `subscriptionFeature` - checks subscription (should bypass for staff)
- `isStaffOnlyRole` = `hasStaffOnlyRole && !isAgent && !isAdmin`

### Staff Navigation (`src/components/layout/Sidebar.tsx`):
- `isTrainerOnly` check determines if user sees staff nav vs agent nav
- `staffNavigationItems` array defines what staff users see

### Existing Features:
- **Training Hub**: `src/features/training-hub/` - Has TrainingHubPage, TrainerDashboard
- **Contracting**: `src/features/contracting/` - Has ContractingPage, ContractingDashboard
- **Recruiting**: `src/features/recruiting/` - Has RecruitingDashboard, RecruitDetailPanel
- **Settings**: `src/features/settings/SettingsDashboard.tsx` - Tab-based settings

---

## Database Tables:
- `carrier_contracts` - Exists in DB (migration applied)
- `user_profiles` - Has roles array, imo_id
- RLS policies exist for IMO-scoped access

---

## Debug Steps for New Session:

1. **Check what staff user actually sees:**
   - Login as a trainer user
   - Check browser console for errors
   - Check what navigation items appear
   - Check what routes are accessible

2. **Verify role detection:**
   - Check `isTrainerOnly` logic in Sidebar.tsx
   - Verify user has correct roles in database
   - Check RouteGuard permission/role checks

3. **Verify permissions:**
   - Query database for trainer role permissions
   - Ensure `nav.training_hub`, `nav.recruiting_pipeline`, `nav.contracting_hub` exist

4. **Check Settings integrations tab:**
   - Look at `src/features/settings/SettingsDashboard.tsx`
   - Find where integrations tab is hidden for staff

5. **Check recruit detail panel:**
   - Look at `src/features/recruiting/components/RecruitDetailPanel.tsx`
   - Verify pipeline progress display logic

---

## Files to Investigate:

```
src/router.tsx
src/components/layout/Sidebar.tsx
src/components/auth/RouteGuard.tsx
src/features/training-hub/components/TrainingHubPage.tsx
src/features/training-hub/components/TrainerDashboard.tsx
src/features/contracting/ContractingPage.tsx
src/features/recruiting/RecruitingDashboard.tsx
src/features/recruiting/components/RecruitDetailPanel.tsx
src/features/settings/SettingsDashboard.tsx
src/constants/roles.ts
src/hooks/permissions/usePermissions.ts
```

---

## Approach for New Session:

1. **DO NOT modify files blindly** - First understand WHY things aren't working
2. **Check git status** - See what files were modified
3. **Consider reverting** - `git checkout HEAD -- <file>` to restore working state
4. **Test incrementally** - Make one change, verify it works, then continue
5. **Check browser console** - Look for JavaScript errors
6. **Verify database state** - Check user roles and permissions

---

## Commands to Run:

```bash
# Check git status
git status

# See what changed
git diff

# Revert a file if needed
git checkout HEAD -- src/path/to/file.tsx

# Check user permissions in database
PGPASSWORD='N123j234n345!$!$' psql -h aws-0-us-west-1.pooler.supabase.com -p 6543 -U postgres.gfmbdwptngmtnzpnrpxe -d postgres -c "
SELECT r.name as role, p.code as permission
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name IN ('trainer', 'contracting_manager')
ORDER BY r.name, p.code;"
```

---

## Success Criteria:

When logged in as a trainer/contracting_manager:
- [ ] Sidebar shows: Training Hub, Recruiting, Contracting, Messages, Settings
- [ ] `/training-hub` loads and shows Templates, Automation, Activity tabs
- [ ] `/recruiting` loads and shows ALL recruits in IMO
- [ ] `/contracting` loads and shows carrier contracts
- [ ] `/messages` loads
- [ ] `/settings` shows Profile, Notifications, **Integrations** tabs (NOT billing/carriers/products)
- [ ] Clicking a recruit in the pipeline shows their progress/checklist
- [ ] `npm run build` passes with zero errors
