# Type Architecture Audit Findings

**Phase 1 Completion Date**: 2024-12-12
**Status**: Ready for Phase 2

---

## Critical Finding #1: UserProfile Triplication

### Overview

`UserProfile` is defined in **3 different locations** with incompatible field sets. This is the most critical issue in the type architecture.

### Detailed Field Comparison

#### Database Source of Truth (user_profiles table)
```
Fields: 53 total
Key fields with actual database column names:
- id: string
- user_id: string | null
- email: string
- first_name: string | null
- last_name: string | null
- phone: string | null
- profile_photo_url: string | null
- agent_status: 'unlicensed' | 'licensed' | 'not_applicable' | null
- approval_status: string
- approved_at: string | null
- approved_by: string | null
- denied_at: string | null
- denial_reason: string | null
- is_admin: boolean
- is_super_admin: boolean | null
- contract_level: number | null
- upline_id: string | null
- hierarchy_path: string | null
- hierarchy_depth: number | null
- onboarding_status: string | null
- current_onboarding_phase: string | null
- onboarding_started_at: string | null
- onboarding_completed_at: string | null
- recruiter_id: string | null
- referral_source: string | null
- pipeline_template_id: string | null
- licensing_info: Json | null
- roles: string[] | null
- instagram_url: string | null
- instagram_username: string | null (note: DB uses instagram_username, code uses instagramusername)
- linkedin_url: string | null
- linkedin_username: string | null (note: DB uses linkedin_username, code uses linkedinusername)
- facebook_handle: string | null
- personal_website: string | null
- street_address: string | null
- city: string | null
- state: string | null
- zip: string | null
- date_of_birth: string | null
- resident_state: string | null
- license_number: string | null
- license_expiration: string | null
- npn: string | null
- archive_reason: string | null
- archived_at: string | null
- archived_by: string | null
- is_deleted: boolean | null
- custom_permissions: Json | null
- created_at: string | null
- updated_at: string | null
```

#### hierarchy.types.ts:11 (40 fields)
```typescript
export interface UserProfile {
  id: string;
  user_id?: string | null;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  profile_photo_url?: string | null;
  upline_id: string | null;         // REQUIRED (DB: nullable)
  hierarchy_path: string;            // REQUIRED (DB: nullable)
  hierarchy_depth: number;           // REQUIRED (DB: nullable)
  approval_status: 'pending' | 'approved' | 'denied';  // Enum (DB: string)
  is_admin: boolean;
  roles?: string[] | null;
  contract_level?: number | null;
  onboarding_status?: 'interview_1' | 'zoom_interview' | 'pre_licensing' | 'exam' | 'npn_received' | 'contracting' | 'bootcamp' | 'completed' | 'dropped';  // Missing 'lead', 'active' from DB
  current_onboarding_phase?: string | null;
  recruiter_id?: string | null;
  onboarding_started_at?: string | null;
  onboarding_completed_at?: string | null;
  referral_source?: string | null;
  agent_status?: 'unlicensed' | 'licensed' | 'not_applicable';
  licensing_info?: Record<string, any> | null;
  pipeline_template_id?: string | null;
  instagramusername?: string | null;   // WRONG NAME (DB: instagram_username)
  instagram_url?: string | null;
  linkedinusername?: string | null;    // WRONG NAME (DB: linkedin_username)
  linkedin_url?: string | null;
  created_at: Date;                    // WRONG TYPE (DB: string)
  updated_at: Date;                    // WRONG TYPE (DB: string)
}
```
**Issues**:
- Uses `Date` for timestamps (DB uses `string`)
- Wrong field names: `instagramusername` vs `instagram_username`
- Missing `onboarding_status` values: 'lead', 'active'
- Required fields that are nullable in DB

#### messaging.types.ts:48 (6 fields only)
```typescript
export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  profile_photo_url: string | null;
}
```
**Issues**:
- Extremely minimal - only for message UI
- Should be a `Pick<>` from canonical UserProfile

#### userService.ts:10 (62 fields - most complete)
```typescript
export interface UserProfile {
  id: string;
  user_id?: string | null;
  email: string;
  full_name?: string | null;         // NOT IN DB
  first_name?: string;               // Missing null type
  last_name?: string;                // Missing null type
  roles?: RoleName[];                // Uses RoleName type
  agent_status?: "licensed" | "unlicensed" | "not_applicable";
  approval_status: "pending" | "approved" | "denied";
  is_admin: boolean;
  is_super_admin?: boolean;
  approved_by?: string;
  approved_at?: string;
  denied_at?: string;
  denial_reason?: string;
  created_at: string;
  updated_at: string;
  contract_level?: number;
  upline_id?: string;
  hierarchy_path?: string;
  hierarchy_depth?: number;
  onboarding_status?: "lead" | "active" | "interview_1" | "zoom_interview" | "pre_licensing" | "exam" | "npn_received" | "contracting" | "bootcamp" | "completed" | "dropped" | null;
  current_onboarding_phase?: string;
  onboarding_completed_at?: string;
  phone?: string;
  profile_photo_url?: string;
  instagram_url?: string;
  instagramusername?: string;        // WRONG NAME
  linkedin_url?: string;
  linkedinusername?: string;         // WRONG NAME
  agent_code?: string;               // NOT IN DB as column
  license_number?: string;
  license_state?: string;            // NOT IN DB (uses resident_state)
  license_states?: string[];         // NOT IN DB
  notes?: string;                    // NOT IN DB
  hire_date?: string;                // NOT IN DB
  ytd_commission?: number;           // NOT IN DB (calculated)
  ytd_premium?: number;              // NOT IN DB (calculated)
  is_deleted?: boolean;
  resident_state?: string;
  upline?: { ... } | null;           // Nested object (join result)
}
```
**Issues**:
- Defined in SERVICE file (wrong location!)
- Has fields not in database (`full_name`, `agent_code`, `license_state`, etc.)
- Also exports `ApprovalStats` (should be in types)
- Most complete but mixed with app-level computed fields

---

## Critical Finding #2: Carrier Defined 3 Times

### carrier.types.ts:1
```typescript
export interface Carrier {
  id: string;
  name: string;
  short_name?: string;
  is_active: boolean;
  default_commission_rates: Record<string, number>;  // NOT IN DB
  contact_info: {                                     // DB has this as Json
    email?: string;
    phone?: string;
    website?: string;
    rep_name?: string;
    rep_email?: string;
    rep_phone?: string;
  };
  notes?: string;
  created_at: Date;
  updated_at?: Date;
}
```

### carrierService.ts:14 (CORRECT PATTERN)
```typescript
import type { Database } from '@/types/database.types';
type CarrierRow = Database['public']['Tables']['carriers']['Row'];
export interface Carrier extends CarrierRow {}
```

### useCarriers.ts:5 (SIMPLIFIED)
```typescript
export interface Carrier {
  id: string;
  name: string;
  short_name?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
```

---

## Critical Finding #3: Client Defined 2 Times

### client.types.ts:15 (Correct)
```typescript
export interface Client {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  notes: string | null;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
}
```

### commission.types.ts:4 (Minimal inline)
```typescript
export interface Client {
  name: string;
  age: number;
  state: string;
}
```

**Issue**: The `commission.types.ts` Client is for form input only, not a DB entity. Should be renamed to `CommissionClientInput` or similar.

---

## Finding #4: recruiting.ts vs recruiting.types.ts

Two files exist:
- `recruiting.ts` (486 lines) - Older file with type unions and interfaces
- `recruiting.types.ts` (121 lines) - Newer file using DB types correctly

**Recommendation**: Merge into `recruiting.types.ts`, delete `recruiting.ts`

---

## Finding #5: Agent Types Fragmentation

Three files for agent-related types:
- `user.types.ts` - Has `User` interface (manual)
- `agent.types.ts` - Has `AgentSettings`, `AgentProfile`, `US_STATES`
- `agent-detail.types.ts` - Has `AgentDetails`, `AgentPolicy`, etc.

**Recommendation**: Consolidate into `user.types.ts`

---

## Finding #6: database.ts vs database.types.ts Confusion

- `database.types.ts` - Auto-generated Supabase types (source of truth)
- `database.ts` - Manual generic DB helper types (`DbRecord`, `DomainModel`, etc.)

**Recommendation**: Rename `database.ts` to `db-helpers.types.ts` to avoid confusion

---

## Consolidation Strategy

### Phase 2 Actions

1. **Create Canonical UserProfile**
   ```typescript
   // In user.types.ts
   import type { Database } from './database.types';

   // Base from database
   type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

   // App-level extension with joins
   export interface UserProfile extends UserProfileRow {
     upline?: UserProfileRow | null;
   }

   // Minimal version for messaging UI
   export type UserProfileMinimal = Pick<UserProfile,
     'id' | 'first_name' | 'last_name' | 'email' | 'profile_photo_url'
   >;
   ```

2. **Update hierarchy.types.ts**
   ```typescript
   import { UserProfile, UserProfileMinimal } from './user.types';
   // Remove local UserProfile definition
   // Import from user.types.ts
   ```

3. **Update messaging.types.ts**
   ```typescript
   import { UserProfileMinimal } from './user.types';
   // Replace local UserProfile with UserProfileMinimal
   ```

4. **Update userService.ts**
   ```typescript
   import { UserProfile } from '@/types/user.types';
   // Remove local interface definition
   // Move ApprovalStats to user.types.ts
   ```

5. **Fix Carrier Types**
   - Use `carrierService.ts` pattern everywhere
   - Delete duplicate in `useCarriers.ts`
   - Update `carrier.types.ts` to extend from DB

6. **Rename commission.types.ts Client**
   - Rename to `CommissionClientInput`
   - Add comment explaining it's form input, not DB entity

7. **Merge Files**
   - `recruiting.ts` → `recruiting.types.ts`
   - `agent.types.ts` + `agent-detail.types.ts` → `user.types.ts`
   - `comp.types.ts` → `commission.types.ts`

8. **Cleanup**
   - Delete `TODO.md` from types directory
   - Rename `database.ts` to `db-helpers.types.ts`

---

## Field Name Discrepancies

| Code Field | Database Field | Fix |
|------------|---------------|-----|
| `instagramusername` | `instagram_username` | Use DB name |
| `linkedinusername` | `linkedin_username` | Use DB name |
| `license_state` | `resident_state` | Use DB name |
| `full_name` | (computed) | Keep as computed, not in interface |
| `agent_code` | (not in DB) | Remove or add to DB |
| `hire_date` | (not in DB) | Remove or add to DB |

---

## Success Criteria for Phase 2

- [ ] UserProfile defined once in `user.types.ts`
- [ ] All other files import from `user.types.ts`
- [ ] No `export interface UserProfile` except in `user.types.ts`
- [ ] Carrier pattern from `carrierService.ts` applied everywhere
- [ ] `recruiting.ts` deleted
- [ ] `agent.types.ts` and `agent-detail.types.ts` merged
- [ ] Build passes: `npm run build` with 0 errors
- [ ] All tests pass: `npm run test:run`
