# Protected Admin Routes and Features

**Last Updated:** 2025-11-27

This document lists all admin routes and features protected by the PermissionGuard component and permission checks to restrict access to administrative functions.

---

## Protected Routes Summary

| Route | Permission Required | Description | Access Level |
|-------|-------------------|-------------|--------------|
| `/comps` | `carriers.manage` | Comp Guide - Manage carriers, products, and commission rates | Admin only |
| `/admin/users` | `nav.user_management` | User Management Dashboard | Admin only |
| `/admin/roles` | `nav.role_management` + `nick@nickneessen.com` | Role Management - Assign roles and permissions | Super-admin only |
| `/test-comp` | Email: `nick@nickneessen.com` | Test route for debugging Comp Guide | Super-admin only |
| `/admin/auth-diagnostic` | Email: `nick@nickneessen.com` | Auth diagnostic tools | Super-admin only |
| `/recruiting/admin/pipelines` | Email: `nick@nickneessen.com` | Pipeline admin - Manage recruiting pipelines | Super-admin only |

---

## Protected Settings Tabs

The **Settings** page (`/settings`) conditionally shows tabs based on user permissions:

| Tab | Permission Required | Visible To | Description |
|-----|-------------------|------------|-------------|
| **Carriers** | `carriers.manage` | Admin only | CRUD operations on carriers |
| **Products** | `carriers.manage` | Admin only | CRUD operations on products |
| **Commission Rates** | `carriers.manage` | Admin only | CRUD operations on commission rates |
| **Constants** | `carriers.manage` | Admin only | System constants configuration |
| **Profile** (Agents) | None (public) | All users | User profile and preferences |

### User Experience by Role

**Admin Users:**
- See all 5 tabs: Carriers, Products, Commission Rates, Constants, Profile
- Can perform CRUD operations on all admin features
- Default tab: Carriers

**Regular Users:**
- See only 1 tab: Profile
- Can only manage their own profile and preferences
- Admin tabs are completely hidden (not just disabled)
- Default tab: Profile

---

## Permission Levels

### Admin Users
Users with the **admin** role have access to:
- ✅ `/comps` - Manage carriers, products, commission rates
- ✅ `/admin/users` - User management
- ✅ `/admin/roles` - Role management (if email matches super-admin)

Required permissions in database:
- `carriers.manage`
- `nav.user_management`
- `nav.role_management`

### Super-Admin (nick@nickneessen.com)
The super-admin email has unrestricted access to ALL routes, including:
- ✅ All admin routes above
- ✅ `/test-comp` - Testing and debugging routes
- ✅ `/admin/auth-diagnostic` - Auth diagnostic tools
- ✅ `/recruiting/admin/pipelines` - Pipeline configuration

### Regular Users
Regular users (non-admin) are **denied access** to all admin routes and will see the PermissionDenied page.

---

## How It Works

All protected routes use the `PermissionGuard` component:

```tsx
// Example: Comp Guide route protection
const compGuideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "comps",
  component: () => (
    <PermissionGuard permission="carriers.manage">
      <CompGuide />
    </PermissionGuard>
  ),
});
```

### PermissionGuard Props

- **`permission`**: Single permission code required (e.g., `"carriers.manage"`)
- **`permissions`**: Array of permission codes (use with `requireAll`)
- **`requireAll`**: If true, user must have ALL permissions. If false (default), user needs ANY permission
- **`requireEmail`**: Optional email check for super-admin only pages
- **`fallback`**: Custom fallback component (defaults to PermissionDenied page)

---

## Database Setup

### Admin Role Permissions

Run this query to verify admin role has required permissions:

```sql
SELECT r.name as role, p.code as permission
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'admin'
ORDER BY p.code;
```

Expected permissions for admin role:
- `carriers.manage`
- `nav.role_management`
- `nav.user_management`

### Assign Admin Role to User

```sql
-- Update user profile to include admin role
UPDATE profiles
SET roles = array_append(roles, 'admin')
WHERE email = 'user@example.com';
```

---

## Testing Protected Routes

### Manual Test Checklist

- [ ] **Admin user (with `carriers.manage`)** can access `/comps`
- [ ] **Admin user (with `nav.user_management`)** can access `/admin/users`
- [ ] **Super-admin (nick@nickneessen.com)** can access `/admin/roles`
- [ ] **Super-admin only** can access `/test-comp`
- [ ] **Super-admin only** can access `/admin/auth-diagnostic`
- [ ] **Super-admin only** can access `/recruiting/admin/pipelines`
- [ ] **Regular users** see PermissionDenied page for all admin routes
- [ ] **No console errors** when accessing protected routes
- [ ] **Sidebar navigation** hides admin links for non-admin users

### Automated Testing

No automated tests exist yet for permission guards. Consider adding:
- Unit tests for PermissionGuard component
- Integration tests for protected routes
- E2E tests for permission denial flows

---

## Security Notes

- **Email-based super-admin check** is intentionally hardcoded for security
- **All permission checks** query Supabase database - no localStorage caching
- **PermissionGuard** shows loading state while checking permissions
- **PermissionDenied** page is distinct from DeniedAccess (approval system)
- **Row Level Security (RLS)** policies protect database tables as the ultimate fallback

---

## Future Enhancements

Potential improvements:
- Add permission checks to API endpoints (server-side validation)
- Create audit logs for admin actions
- Add granular permissions for specific admin operations
- Implement permission inheritance from parent roles
- Add temporary permission grants with expiration

---

## Related Documentation

- [Permission System Architecture](./permissions-architecture.md) (if exists)
- [Role Management Guide](./role-management.md) (if exists)
- [User Management Guide](./user-management.md) (if exists)

---

**Questions or Issues?**
Contact: nick@nickneessen.com
