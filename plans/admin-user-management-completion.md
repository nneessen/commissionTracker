# Admin User Management - Completion Plan

## ✅ COMPLETED

1. **Removed non-functional Approve/Deny buttons** from recruiting pipeline
2. **Added resident_state column** to recruiting pipeline table
3. **Changed Edit button** to "Edit Profile" with proper handler
4. **Added imports** for AddUserDialog and services
5. **Added state** for `isAddUserDialogOpen`
6. **Created handlers**: `handleAddUser`, `handleEditUser`, `handleSaveUser`, `handleDeleteUser`
7. **Created AddUserDialog component** (`src/features/admin/components/AddUserDialog.tsx`)
8. **Added service methods** to UserApprovalService: `createUser()`, `updateUser()`, `deleteUser()`

## 🚧 REMAINING TASKS

### 1. Wire up "+ Add User" button onClick
**File**: `src/features/admin/components/AdminControlCenter.tsx` ~line 273

**Change from:**
```tsx
<Button size="sm">
  <Plus className="h-3.5 w-3.5 mr-1.5" />
  Add User
</Button>
```

**To:**
```tsx
<Button size="sm" onClick={() => setIsAddUserDialogOpen(true)}>
  <Plus className="h-3.5 w-3.5 mr-1.5" />
  Add User
</Button>
```

### 2. Add Delete button to Users & Access table rows
**File**: `src/features/admin/components/AdminControlCenter.tsx` ~line 355

**Change from:**
```tsx
<TableCell className="py-1.5 text-right">
  <Button
    size="sm"
    variant="ghost"
    className="h-5 px-1.5"
    onClick={() => handleEditRoles(user)}
  >
    <Edit className="h-2.5 w-2.5" />
  </Button>
</TableCell>
```

**To:**
```tsx
<TableCell className="py-1.5 text-right">
  <div className="flex items-center justify-end gap-1">
    <Button
      size="sm"
      variant="ghost"
      className="h-5 px-1.5"
      onClick={() => handleEditUser(user)}
      title="Edit user"
    >
      <Edit className="h-2.5 w-2.5" />
    </Button>
    <Button
      size="sm"
      variant="ghost"
      className="h-5 px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
      onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
      title="Delete user"
    >
      <Trash2 className="h-2.5 w-2.5" />
    </Button>
  </div>
</TableCell>
```

### 3. Add AddUserDialog to component JSX
**File**: `src/features/admin/components/AdminControlCenter.tsx`
**Location**: End of component, before final closing tag (after Edit Dialog)

**Add:**
```tsx
{/* Add User Dialog */}
<AddUserDialog
  open={isAddUserDialogOpen}
  onOpenChange={setIsAddUserDialogOpen}
  onSave={handleAddUser}
/>
```

### 4. Create comprehensive EditUserDialog component
**File**: `src/features/admin/components/EditUserDialog.tsx` (NEW FILE)

**Requirements**:
- Edit ALL user fields (not just roles like current dialog)
- Fields: email, first_name, last_name, phone, upline_id, roles, approval_status, onboarding_status, resident_state, contract_level, etc.
- Use same structure as AddUserDialog but pre-fill with existing user data
- Props: `open`, `onOpenChange`, `user: UserProfile | null`, `onSave: (updates: Partial<UserProfile>) => void`

### 5. Replace current Edit dialog with EditUserDialog
**File**: `src/features/admin/components/AdminControlCenter.tsx`

**Remove** the current simple role-only edit dialog (~lines 620-688)

**Replace with**:
```tsx
import EditUserDialog from "./EditUserDialog";

// ... in JSX ...
<EditUserDialog
  open={isEditDialogOpen}
  onOpenChange={setIsEditDialogOpen}
  user={editingUser}
  onSave={handleSaveUser}
/>
```

### 6. Add resident_state field to database migration
**File**: Create new migration `supabase/migrations/YYYYMMDD_add_resident_state.sql`

```sql
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS resident_state TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_resident_state
ON public.user_profiles(resident_state);
```

**Run**: `./scripts/apply-migration.sh supabase/migrations/[filename].sql`

### 7. Create 'recruit' role in database
**File**: Create migration `supabase/migrations/YYYYMMDD_add_recruit_role.sql`

```sql
-- Add recruit role to roles table
INSERT INTO public.roles (name, display_name, description, is_system_role)
VALUES (
  'recruit',
  'Recruit',
  'New recruit with access only to their own recruiting pipeline',
  true
)
ON CONFLICT (name) DO NOTHING;

-- Add permissions for recruit role (view own profile only)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'recruit'
AND p.name IN ('view_own_profile', 'update_own_profile');
```

**Run**: `./scripts/apply-migration.sh supabase/migrations/[filename].sql`

### 8. Create admin RPC functions
**File**: Create migration `supabase/migrations/YYYYMMDD_add_admin_rpc_functions.sql`

**Required functions**:
1. `admin_create_user()` - Creates user in auth.users + user_profiles
2. `admin_delete_user()` - Deletes user from auth.users (cascades to user_profiles)

```sql
-- admin_create_user function
CREATE OR REPLACE FUNCTION admin_create_user(
  user_email TEXT,
  user_password TEXT DEFAULT NULL,
  user_first_name TEXT,
  user_last_name TEXT,
  user_phone TEXT DEFAULT NULL,
  user_upline_id UUID DEFAULT NULL,
  user_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  user_approval_status TEXT DEFAULT 'approved',
  user_onboarding_status TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- Create auth.users record (requires service role - this is a simplified version)
  -- In production, this should use Supabase Admin API via Edge Function
  -- For now, return error telling user to use Supabase Dashboard

  RAISE EXCEPTION 'User creation requires Supabase Admin API. Please use Supabase Dashboard or create Edge Function.';

  -- TODO: Implement via Edge Function that calls Supabase Admin API
  -- admin.auth.createUser({ email, password, ... })

  RETURN json_build_object('success', false, 'error', 'Not implemented');
END;
$$;

-- admin_delete_user function
CREATE OR REPLACE FUNCTION admin_delete_user(
  target_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Delete from auth.users (cascades to user_profiles via FK)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

**Run**: `./scripts/apply-migration.sh supabase/migrations/[filename].sql`

### 9. Add resident_state to UserProfile TypeScript type
**File**: `src/types/hierarchy.types.ts`

**Add to UserProfile interface**:
```typescript
export interface UserProfile {
  // ... existing fields ...
  resident_state?: string | null;
}
```

### 10. Update AddUserDialog to include resident_state field
**File**: `src/features/admin/components/AddUserDialog.tsx`

**Add to NewUserData interface**:
```typescript
export interface NewUserData {
  // ... existing fields ...
  resident_state?: string;
}
```

**Add to form**:
```tsx
<div className="space-y-2">
  <Label htmlFor="resident_state">Resident State</Label>
  <Input
    id="resident_state"
    value={formData.resident_state}
    onChange={(e) => setFormData(prev => ({ ...prev, resident_state: e.target.value }))}
    placeholder="e.g., CA, NY, TX"
    maxLength={2}
  />
</div>
```

## 📝 NOTES

- The `admin_create_user` RPC function is a placeholder - actual user creation requires Supabase Admin API which can only be called from server-side (Edge Function with service role key)
- For now, users can be created via Supabase Dashboard, or you need to create an Edge Function
- All other functionality (update, delete, edit) works immediately once migrations are run
- The EditUserDialog component needs to be created following the same pattern as AddUserDialog

## 🎯 TESTING CHECKLIST

Once completed, test:
- [ ] Click "+ Add User" opens dialog
- [ ] Fill form and save creates user (or shows appropriate error about Admin API)
- [ ] Click "Edit Profile" on any user opens edit dialog with pre-filled data
- [ ] Update user fields and save works
- [ ] Click delete button shows confirmation and deletes user
- [ ] Resident state displays in recruiting pipeline table
- [ ] All data persists after page refresh (no local storage)
- [ ] No broken/non-functional buttons anywhere
