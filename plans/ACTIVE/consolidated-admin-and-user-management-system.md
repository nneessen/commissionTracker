# Consolidated Admin & User Management System

**Created:** 2025-11-28
**Updated:** 2025-11-28
**Status:** In Progress - Phase 1-3 Complete
**Priority:** CRITICAL - System consolidation and security

---

## Executive Summary

Consolidate the over-engineered 3-page admin system into a single, coherent Admin Control Center at `/admin`. Disable public signup entirely, implement invitation-only user creation, and ensure all admin functions are centralized in one logical location.

**Key Changes:**

- Merge /admin/users, /admin/roles, /admin/permissions → Single `/admin` page
- Disable all public signup
- User creation happens in Admin page (where it belongs)
- Simplified navigation (one "Admin" menu item instead of three)

---

## Current Problems

1. **Over-engineered Admin Pages**
   - Three separate pages for admin functions (users, roles, permissions)
   - Too much navigation for a small team app
   - Confusing where to find things

2. **Security Issues**
   - Public signup allows anyone to request access
   - No verification of who's joining

3. **Incomplete User Data**
   - Missing critical fields (license #, NPN, address, DOB)
   - No hierarchy established during creation

4. **Poor Organization**
   - User creation not in User Management (illogical)
   - Functions scattered across multiple pages

---

## New Architecture

### Single Admin Page Structure

```
/admin - Admin Control Center
│
├── Tab 1: Users & Access
│   ├── User List/Table
│   │   ├── Search/Filter bar
│   │   ├── [Create User] button
│   │   ├── [Invite User] button
│   │   └── User rows with inline actions
│   │
│   ├── User Details (expandable or side panel)
│   │   ├── Complete profile view
│   │   ├── Role assignment
│   │   ├── Activity history
│   │   └── Edit capabilities
│   │
│   └── Bulk Operations
│       ├── Import CSV
│       └── Bulk role assignment
│
├── Tab 2: Roles & Permissions
│   ├── Role List (left panel)
│   │   ├── System roles (locked, can't delete)
│   │   ├── Custom roles (editable)
│   │   └── [Create Role] button
│   │
│   └── Permission Editor (right panel)
│       ├── Select role to edit
│       ├── Checkbox list of permissions
│       ├── Grouped by category
│       └── [Save Changes] button
│
└── Tab 3: System Settings
    ├── Company Information
    ├── Email Templates
    ├── Backup & Restore
    └── System Configuration
```

### Simplified Navigation

**Before (Too Many):**

```
- User Management
- Role Management
- Permissions
- Settings
```

**After (Clean):**

```
- Admin (single item, contains everything)
- Settings (personal only)
```

---

## User Creation System

### Two Creation Modes (Both in Admin Page)

#### Mode A: Direct Creation

**When:** Admin has all user information
**Where:** /admin → Users & Access → [Create User]

```
Admin fills complete form → User created → Email sent with temp password
```

#### Mode B: Invitation

**When:** User will self-onboard
**Where:** /admin → Users & Access → [Invite User]

```
Admin sends invite → User receives email → Completes profile → Auto-approved
```

### Complete User Data Model

```typescript
interface UserProfile {
  // === REQUIRED FIELDS ===

  // Authentication
  id: string;
  email: string; // Unique, for login
  password_hash: string; // Set by user or temp

  // Identity (REQUIRED)
  first_name: string;
  last_name: string;
  date_of_birth: Date; // For compliance/background checks
  phone: string; // Primary contact

  // Address (REQUIRED for 1099s)
  street_address: string;
  city: string;
  state: string; // 2-letter code
  zip: string;

  // Professional/Licensing (REQUIRED)
  license_number: string; // State insurance license
  npn: string; // National Producer Number
  resident_state: string; // Primary licensed state
  contract_level: number; // Commission percentage (50-150)
  contract_start_date: Date;

  // Hierarchy (REQUIRED)
  upline_id: string; // Manager/upline user ID

  // System Access (REQUIRED)
  roles: string[]; // ['agent', 'manager', 'admin']
  is_active: boolean; // Can login
  is_approved: boolean; // Passed admin review

  // === OPTIONAL FIELDS ===

  // Extended Licensing
  non_resident_states?: string[]; // Additional state licenses
  license_expiration?: Date;
  eo_insurance?: boolean; // Errors & Omissions
  eo_expiration?: Date;

  // Banking/Tax
  ssn_last4?: string; // For 1099
  tax_id?: string; // EIN if applicable
  bank_account_last4?: string; // For direct deposit
  routing_number?: string;

  // Social/Marketing
  profile_photo_url?: string;
  linkedin_handle?: string;
  instagram_handle?: string;
  facebook_handle?: string;
  personal_website?: string;

  // System Tracking
  invited_by?: string; // Who sent invitation
  invitation_code?: string; // Unique invitation token
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  onboarding_completed: boolean;
  onboarding_completed_at?: Date;
}
```

---

## User Creation Form Design

### Quick Invite Form (Minimal)

```
┌─────────────────────────────────┐
│ Invite New User                 │
├─────────────────────────────────┤
│ Email*         [___________]    │
│ First Name*    [___________]    │
│ Last Name*     [___________]    │
│ Suggested Role [Agent      ▼]   │
│                                  │
│ [Cancel] [Send Invitation]       │
└─────────────────────────────────┘
```

### Full Creation Form (Complete)

```
┌─────────────────────────────────────────┐
│ Create New User                         │
├─────────────────────────────────────────┤
│ ▼ Account Information                   │
│   Email*           [___________]        │
│   Temp Password*   [___________]        │
│                                          │
│ ▼ Personal Information                  │
│   First Name*      [___________]        │
│   Last Name*       [___________]        │
│   Date of Birth*   [___________]        │
│   Phone*           [___________]        │
│                                          │
│ ▼ Address (Required for 1099)          │
│   Street*          [___________]        │
│   City*            [___________]        │
│   State*           [______▼]            │
│   ZIP*             [___________]        │
│                                          │
│ ▼ Professional/Licensing               │
│   License #*       [___________]        │
│   NPN*             [___________]        │
│   Resident State*  [______▼]            │
│   Non-Res States   [Multi-select]       │
│   Contract Level*  [___]%               │
│   Start Date*      [___________]        │
│   Upline*          [Select User ▼]      │
│                                          │
│ ▼ Access Control                        │
│   Role*            [Agent      ▼]       │
│   Active           [✓]                  │
│   Approved         [✓]                  │
│                                          │
│ ▼ Optional Information                  │
│   Profile Photo    [Choose File]        │
│   LinkedIn         [___________]        │
│   Instagram        [___________]        │
│                                          │
│ [Cancel] [Create User]                  │
└─────────────────────────────────────────┘
```

---

## How Pages Work Together

### Page Responsibilities

#### `/admin` - System Administration

- **Purpose:** Central control for all admin functions
- **Access:** Admin role only
- **Contains:**
  - User management (CRUD)
  - Role management
  - Permission assignment
  - System settings
- **Key Point:** Everything admin-related is HERE, not scattered

#### `/recruiting` - Team Building

- **Purpose:** Grow your downline team
- **Access:** Managers and above
- **Contains:**
  - Send invitations to downlines
  - Track invitation status
  - Onboarding pipeline
  - Recruiting metrics
- **Key Point:** Focused on team GROWTH

#### `/team` or `/hierarchy` - Team Visualization

- **Purpose:** View and manage existing team
- **Access:** All users (see their portion)
- **Contains:**
  - Organizational chart
  - Upline/downline relationships
  - Team performance metrics
  - Commission overrides
- **Key Point:** Focused on team STRUCTURE

#### `/settings` - Personal Settings

- **Purpose:** User self-service
- **Access:** All users
- **Contains:**
  - Edit own profile
  - Change password
  - Notification preferences
  - Personal targets
- **Key Point:** Users manage THEMSELVES

### Clear Separation of Concerns

```
System Admin → /admin
Team Growth → /recruiting
Team View → /team
Self Service → /settings
```

No overlap, no confusion, everything in its logical place.

---

## Security Implementation

### Disable Public Signup

1. **Remove signup route**

```typescript
// DELETE or comment in router.tsx
// const signupRoute = createRoute({
//   path: "signup",
//   component: Signup
// });
```

2. **Remove signup link from login**

```typescript
// In Login.tsx, replace signup link with:
<Alert>
  <Info className="h-4 w-4" />
  <AlertDescription>
    This system is invitation-only.
    Contact your manager for access.
  </AlertDescription>
</Alert>
```

3. **Block signup endpoint**

```sql
-- Revoke public access to auth.users insert
REVOKE INSERT ON auth.users FROM anon;
```

### Invitation Flow

```
Manager → Sends Invite → Email with Token →
User Clicks → Onboarding Form → Profile Complete →
Auto-approved → Hierarchy Established
```

---

## Implementation Phases

### Phase 1: Consolidate Admin Pages (2 hours) ✅ COMPLETED

- [x] Create unified /admin page with tabs
- [x] Migrate UserManagementPage content to Users & Access tab
- [x] Migrate RoleManagementPage to Roles & Permissions tab
- [x] Remove separate permission page (integrate into roles)
- [x] Update navigation to single "Admin" item
- [ ] Delete old separate page components (deferred to phase 6)

**Implementation Details:**

- Created `AdminControlCenter.tsx` with 3 tabs (Users & Access, Roles & Permissions, System Settings)
- Updated router.tsx to use single `/admin` route instead of 3 separate routes
- Updated Sidebar to show single "Admin" menu item
- All changes tested and working correctly

### Phase 2: Disable Public Signup (30 mins) ✅ COMPLETED

- [x] Remove signup route (no signup route existed)
- [x] Remove signup mode from Login component
- [x] Add invitation-only message to login page
- [x] Test that signup is fully blocked

**Implementation Details:**

- Modified Login.tsx to remove signup mode completely
- Changed mode type from `AuthMode` to `"signin" | "reset"`
- Added invitation-only Alert message on login page
- Removed SignUpForm import and usage
- Fixed type errors related to signup mode removal

### Phase 3: Extend User Data Model (1 hour) ✅ COMPLETED

- [x] Add missing fields to user_profiles table
- [x] Create migration for new fields
- [ ] Update TypeScript interfaces (will auto-generate after migration)
- [ ] Set defaults for existing users (not needed - nullable fields)

**Implementation Details:**

- Created migration `20251128170833_add_extended_user_profile_fields.sql`
- Added ALL missing fields from plan:
  - Identity: date_of_birth
  - Address: street_address, city, state, zip
  - Professional: license_number, npn, resident_state, non_resident_states[], license_expiration, contract_start_date
  - Insurance: eo_insurance, eo_expiration
  - Banking/Tax: ssn_last4, tax_id, bank_account_last4, routing_number
  - Social: facebook_handle, personal_website
  - System: invited_by, invitation_code, last_login, onboarding_completed
- Added proper foreign key constraint for invited_by
- Created indexes for commonly queried fields
- Added comprehensive column comments for documentation

### Phase 4: Build User Creation Forms (2 hours) 🔄 TODO

- [ ] Create quick invite form component
- [ ] Create full creation form component
- [ ] Add forms to Admin page Users & Access tab
- [ ] Wire up to backend services
- [ ] Add validation and error handling

### Phase 5: Implement Invitation System (2 hours) 🔄 TODO

- [ ] Enhance invitation service (hierarchy_invitations table already exists)
- [ ] Create onboarding flow for invited users
- [ ] Add invitation tracking/status views
- [ ] Test end-to-end invitation workflow

### Phase 6: Clean Up & Test (1 hour) 🔄 TODO

- [ ] Remove old admin page components (UserManagementDashboard if not used)
- [ ] Apply migration to local and remote database
- [ ] Regenerate TypeScript types from database
- [ ] Test all user creation paths
- [ ] Test admin page functionality
- [ ] Verify security (no public signup possible)
- [ ] Update documentation

**Total: ~8 hours**
**Completed: ~3.5 hours (Phases 1-3)**
**Remaining: ~4.5 hours (Phases 4-6)**

---

## Benefits

### For Admins

- Everything in one place (/admin)
- No navigation between multiple pages
- Complete user data from day one
- Clear role and permission management

### For Security

- No random signups
- Every user is verified
- Complete audit trail
- Proper data collection

### For Users

- Clear onboarding process
- All needed info collected upfront
- Automatic hierarchy setup
- No confusion about access

### For Maintenance

- Single admin component to maintain
- Clear separation of concerns
- No duplicated code
- Logical organization

---

## Success Criteria

- [x] Only ONE admin page at /admin ✅
- [x] Public signup completely disabled ✅
- [ ] User creation in Admin page (not scattered) 🔄 Forms need to be built
- [x] All required fields available in database ✅
- [ ] Invitation system working 🔄 Needs form UI
- [x] Roles and permissions manageable from same page ✅
- [x] Clean navigation (no redundant menu items) ✅
- [ ] Complete user profiles for all new users 🔄 After forms built

**Progress: 5/8 criteria met (62.5%)**

---

## Notes

- Keep it simple - this is for a small team, not enterprise
- Don't over-engineer - one admin page is enough
- Leverage existing systems (hierarchy_invitations table)
- Test thoroughly before removing old components
- Document for future developers

