# Redesign Permission Management Dialog

## Current State

The Roles & Permissions tab in Admin → AdminControlCenter now has working CRUD:
- "Create Role" button
- "Permissions" button on each role → opens permission management dialog
- Permissions can be toggled on/off via checkboxes

**File:** `src/features/admin/components/AdminControlCenter.tsx`

## Problem

The current permission management dialog uses a **tiny 300px scrolling window** with a flat list of checkboxes. This is poor UX because:

1. **No organization** - All permissions are in one flat alphabetical list
2. **Hard to scan** - Users must scroll through 50+ permissions
3. **No context** - Permissions like `nav.dashboard` and `policies.create` are mixed together
4. **Cramped** - Dialog is too small for the amount of content
5. **No search/filter** - Can't find specific permissions quickly

## Requirements

Redesign the permission management dialog with a **professional, usable interface**:

### Must Have
- Group permissions by category (nav, policies, commissions, admin, etc.)
- Expandable/collapsible sections per category
- Full-width dialog or slide-out panel (not cramped modal)
- Visual indication of permission count per category
- "Select All" / "Deselect All" per category
- Search/filter to find permissions quickly

### Nice to Have
- Show which permissions are inherited vs direct
- Keyboard navigation
- Bulk operations (copy permissions from another role)
- Permission descriptions visible on hover/expand

## Permission Categories

Based on the permission codes, group by prefix:
- `nav.*` - Navigation access
- `policies.*` - Policy management
- `commissions.*` - Commission operations
- `expenses.*` - Expense tracking
- `recruiting.*` - Recruiting pipeline
- `hierarchy.*` - Team hierarchy
- `reports.*` - Reporting
- `settings.*` - Settings access
- `admin.*` - Admin operations
- `messages.*` - Messaging

## Design Considerations

1. **Slide-out panel** (like Settings) vs **Full-screen dialog** vs **Expandable accordion**
2. **Two-column layout**: Categories on left, permissions on right
3. **Card-based layout**: Each category is a card with permissions inside
4. **Tab-based**: Tabs for each category

## Files to Modify

- `src/features/admin/components/AdminControlCenter.tsx` - Remove inline dialog
- Create new component: `src/features/admin/components/RolePermissionEditor.tsx`
- Consider using Sheet component from shadcn/ui for slide-out

## Technical Notes

- Permissions come from `useAllPermissions()` hook
- Role's current permissions are in `selectedRole.permissions`
- Toggle uses `useAssignPermissionToRole()` and `useRemovePermissionFromRole()`
- Permission type: `{ id, code, description, category }`

## Start Here

1. Read current dialog implementation in AdminControlCenter.tsx (lines 1213-1300)
2. Query the database to see all permission codes: `SELECT code, category FROM permissions ORDER BY code`
3. Design the new UI component
4. Replace the dialog with the new component

---

*Created: 2025-12-27*
