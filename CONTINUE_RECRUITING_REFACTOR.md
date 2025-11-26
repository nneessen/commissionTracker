# Continue Recruiting System - REFACTOR TO user_profiles

## CRITICAL CONTEXT: Current Situation

We started building a recruiting system but **made a design mistake**: created a separate `recruiting_profiles` table instead of extending the existing `user_profiles` table. The user correctly identified this as overengineering - recruits ARE agents at different lifecycle stages and should live in the same table.

**Current State:**
- ✅ Backend: 5 migrations created (BUT NOT PUSHED TO REMOTE - tables don't exist in production)
- ✅ Frontend: RecruitingDashboard, RecruitCard, AddRecruitDialog all built and working
- ✅ Routing: `/recruiting` route added, sidebar nav exists
- ✅ UI Components: Using @dnd-kit for Kanban drag-and-drop
- ❌ Database: Getting 404 errors because `recruiting_profiles` table doesn't exist remotely
- ❌ Architecture: Wrong - needs refactor to use `user_profiles` instead

## The Right Way: Use user_profiles Table

### Core Principle
**Recruits and agents are the same entity at different lifecycle stages.** No separate table needed.

### Database Changes Needed

#### 1. Extend user_profiles Table
Add these columns to existing `user_profiles`:
```sql
-- Onboarding tracking fields
onboarding_status TEXT DEFAULT 'active' CHECK (onboarding_status IN ('lead', 'active', 'completed', 'dropped'))
current_onboarding_phase TEXT
recruiter_id UUID REFERENCES user_profiles(id)
onboarding_started_at TIMESTAMPTZ
onboarding_completed_at TIMESTAMPTZ
referral_source TEXT

-- Social media (optional for now)
instagram_username TEXT
instagram_url TEXT
linkedin_username TEXT
linkedin_url TEXT
```

#### 2. Create Supporting Tables (link to user_profiles.id)
- **onboarding_phases**: Track 8 phases per recruit
  - `user_id UUID REFERENCES user_profiles(id)` (NOT recruit_id)
  - `phase_name TEXT` (initial_contact, application, background_check, pre_licensing, exam, state_license, contracting, complete)
  - `phase_order INTEGER`
  - `status TEXT` (not_started, in_progress, completed, blocked)
  - `started_at`, `completed_at`, `notes`, `blocked_reason`
  - Auto-trigger to create 8 phases when user.onboarding_status = 'lead'

- **user_documents**: Track recruit/agent documents
  - `user_id UUID REFERENCES user_profiles(id)` (NOT recruit_id)
  - `document_type TEXT` (application, background_check, license, contract, etc.)
  - `document_name TEXT`
  - `file_name TEXT`, `file_size INTEGER`, `file_type TEXT`
  - `storage_path TEXT` (Supabase Storage)
  - `status TEXT` (pending, received, approved, rejected)
  - `uploaded_by UUID`, `uploaded_at TIMESTAMPTZ`
  - `required BOOLEAN`, `expires_at TIMESTAMPTZ`

- **user_emails**: Track communication history
  - `user_id UUID REFERENCES user_profiles(id)` (NOT recruit_id)
  - `sender_id UUID`, `subject TEXT`, `body_html TEXT`, `body_text TEXT`
  - `status TEXT` (draft, sending, sent, delivered, opened, failed)
  - `sent_at TIMESTAMPTZ`, `delivered_at TIMESTAMPTZ`, `opened_at TIMESTAMPTZ`

- **user_email_attachments**: Email attachments
  - `email_id UUID REFERENCES user_emails(id)`
  - `file_name TEXT`, `file_size INTEGER`, `storage_path TEXT`

- **user_activity_log**: Complete audit trail
  - `user_id UUID REFERENCES user_profiles(id)` (NOT recruit_id)
  - `performed_by UUID REFERENCES user_profiles(id)`
  - `action_type TEXT` (created, updated, phase_changed, document_uploaded, etc.)
  - `details JSONB` (before/after values)

#### 3. DELETE Wrong Migrations
Remove these files from `supabase/migrations/`:
- `20251126_001_create_recruiting_profiles.sql`
- `20251126_002_create_onboarding_phases.sql`
- `20251126_003_create_recruit_documents.sql`
- `20251126_004_create_recruit_emails.sql`
- `20251126_005_create_recruit_activity_log.sql`

**IMPORTANT:** These were NEVER pushed to remote Supabase, so no rollback needed. Just delete them.

### TypeScript Changes Needed

#### Update Types (src/types/recruiting.ts)
```typescript
// Use UserProfile as base, extend with onboarding fields
export interface UserProfile {
  // ... existing fields ...
  onboarding_status?: 'lead' | 'active' | 'completed' | 'dropped';
  current_onboarding_phase?: PhaseName;
  recruiter_id?: string;
  onboarding_started_at?: string;
  onboarding_completed_at?: string;
  referral_source?: string;
  instagram_username?: string;
  instagram_url?: string;
  linkedin_username?: string;
  linkedin_url?: string;
}

export interface OnboardingPhase {
  id: string;
  user_id: string; // Changed from recruit_id
  phase_name: PhaseName;
  // ... rest stays same
}

export interface UserDocument {
  id: string;
  user_id: string; // Changed from recruit_id
  document_type: DocumentType;
  // ... rest stays same
}

export interface UserEmail {
  id: string;
  user_id: string; // Changed from recruit_id
  // ... rest stays same
}

export interface UserActivityLog {
  id: string;
  user_id: string; // Changed from recruit_id
  performed_by: string;
  // ... rest stays same
}
```

#### Update Service (src/services/recruiting/recruitingService.ts)
Change all queries from:
- `supabase.from('recruiting_profiles')` → `supabase.from('user_profiles')`
- Add filters: `.eq('onboarding_status', 'lead')` or `.in('onboarding_status', ['lead', 'active'])`
- Join with recruiter: `recruiter:recruiter_id(id, email, first_name, last_name)`

Example query:
```typescript
async getRecruits(filters?: RecruitFilters) {
  let query = supabase
    .from('user_profiles')
    .select(`
      *,
      recruiter:recruiter_id(id, email, first_name, last_name)
    `)
    .in('onboarding_status', ['lead', 'active']); // Only show recruits, not all agents

  // Apply filters...
  return query;
}
```

### Frontend Changes Needed

#### Minimal UI Updates Required
The existing components mostly work as-is:
- `RecruitingDashboard.tsx` - Change type imports, update filters
- `RecruitCard.tsx` - No changes needed (uses UserProfile now)
- `AddRecruitDialog.tsx` - Change mutation to create user_profile instead

#### Key Differences
1. **Filter by onboarding_status**: Only show users with status 'lead' or 'active' in recruiting view
2. **Create flow**: When adding recruit, set `onboarding_status: 'lead'`, `current_onboarding_phase: 'initial_contact'`
3. **Completion flow**: When recruit completes onboarding, set `onboarding_status: 'completed'`, `onboarding_completed_at: NOW()`

### Migration Strategy

#### Step 1: Create New Migrations (in order)
1. `20251126_001_alter_user_profiles_add_onboarding.sql` - Add columns to user_profiles
2. `20251126_002_create_onboarding_phases.sql` - Create onboarding_phases (link to user_profiles.id)
3. `20251126_003_create_user_documents.sql` - Create user_documents table
4. `20251126_004_create_user_emails.sql` - Create user_emails + attachments
5. `20251126_005_create_user_activity_log.sql` - Create activity log

#### Step 2: Update TypeScript
1. Update `src/types/recruiting.ts` - Use UserProfile, rename recruit_id to user_id
2. Update `src/services/recruiting/recruitingService.ts` - Query user_profiles table
3. Update hooks if needed (imports should work)

#### Step 3: Update Components
1. `RecruitingDashboard.tsx` - Update imports, filters
2. `AddRecruitDialog.tsx` - Create user_profile with onboarding fields
3. Test in browser

#### Step 4: Push to Remote
```bash
npx supabase db push
```

### Benefits of This Approach

✅ **Single source of truth** - All people in one table
✅ **No data migration** - Status change, not table migration
✅ **Hierarchy integration** - Recruits appear in team tree automatically
✅ **Simpler queries** - No recruit/agent joins needed
✅ **Real-world pattern** - How Salesforce, HubSpot, etc. work
✅ **Future-proof** - Easy to add more lifecycle stages

### Existing Code to Reference

**Components Already Built:**
- `src/features/recruiting/RecruitingDashboard.tsx` - Kanban board with drag-drop
- `src/features/recruiting/components/RecruitCard.tsx` - Recruit cards
- `src/features/recruiting/components/AddRecruitDialog.tsx` - TanStack Form for adding recruits
- `src/router.tsx` - Route already added at `/recruiting`
- `src/components/layout/Sidebar.tsx` - Nav item already added

**Hooks Already Built:**
- `src/features/recruiting/hooks/useRecruits.ts`
- `src/features/recruiting/hooks/useRecruitMutations.ts`
- `src/features/recruiting/hooks/useRecruitPhases.ts`
- `src/features/recruiting/hooks/useRecruitDocuments.ts`
- `src/features/recruiting/hooks/useRecruitEmails.ts`
- `src/features/recruiting/hooks/useRecruitActivity.ts`

**Just need to update them to use user_profiles instead of recruiting_profiles**

### What's Working Right Now

- ✅ Frontend UI components render correctly
- ✅ Kanban board layout with 6 columns
- ✅ AddRecruitDialog form validates and submits
- ✅ Routing works (`/recruiting` route exists)
- ✅ Sidebar navigation works
- ✅ TypeScript compiles (no errors in recruiting code)
- ✅ @dnd-kit drag-and-drop installed and configured

### What's Broken

- ❌ API calls return 404 (table doesn't exist)
- ❌ Can't actually create/view recruits
- ❌ Wrong architecture (separate table instead of user_profiles)

## TODO List

1. **Delete wrong migrations** from `supabase/migrations/`
2. **Create new migrations** that extend user_profiles + create supporting tables
3. **Update TypeScript types** to use UserProfile and rename recruit_id → user_id
4. **Update service layer** to query user_profiles with onboarding_status filter
5. **Update hooks** (should mostly work with type changes)
6. **Update UI components** (minimal changes needed)
7. **Test locally** with `npx supabase db reset`
8. **Push to remote** with `npx supabase db push`

## Current File Structure

```
src/
├── features/recruiting/
│   ├── RecruitingDashboard.tsx
│   ├── components/
│   │   ├── RecruitCard.tsx
│   │   └── AddRecruitDialog.tsx
│   └── hooks/
│       ├── useRecruits.ts
│       ├── useRecruitMutations.ts
│       ├── useRecruitPhases.ts
│       ├── useRecruitDocuments.ts
│       ├── useRecruitEmails.ts
│       └── useRecruitActivity.ts
├── services/recruiting/
│   ├── recruitingService.ts
│   └── index.ts
├── types/
│   └── recruiting.ts
└── router.tsx (updated)
```

## Project Rules to Follow

- **Zero local storage** for business data
- **Feature-based folders** for organization
- **TanStack Router, Query, Form** for state management
- **shadcn/ui + Tailwind v4** for styling
- **Supabase PostgreSQL** for all data
- **File path comments** at top of every file
- **Conventional naming** (PascalCase components, camelCase functions, kebab-case files)

## Key Database Schema to Know

**user_profiles** (existing table - needs extension):
- `id UUID PRIMARY KEY`
- `user_id UUID REFERENCES auth.users(id)` (can be NULL for leads without login)
- `email TEXT UNIQUE NOT NULL`
- `first_name TEXT`, `last_name TEXT`, `phone TEXT`
- `upline_id UUID REFERENCES user_profiles(id)` (hierarchy)
- ... (many other fields)

**NEW FIELDS TO ADD:**
- `onboarding_status TEXT DEFAULT 'active'`
- `current_onboarding_phase TEXT`
- `recruiter_id UUID REFERENCES user_profiles(id)`
- `onboarding_started_at TIMESTAMPTZ`
- `onboarding_completed_at TIMESTAMPTZ`
- `referral_source TEXT`
- `instagram_username TEXT`, `instagram_url TEXT`
- `linkedin_username TEXT`, `linkedin_url TEXT`

## START HERE

1. Delete the 5 wrong migration files from `supabase/migrations/`
2. Create new migration: `npx supabase migration new alter_user_profiles_add_onboarding`
3. Write SQL to ALTER user_profiles table
4. Create remaining 4 migrations for supporting tables
5. Update TypeScript types
6. Update service layer
7. Test locally
8. Push to remote

## Important Notes

- The wrong migrations were NEVER applied to remote Supabase (that's why we're getting 404s)
- No rollback needed - just delete files and start fresh
- All frontend components can stay mostly the same
- This is the proper engineering approach - single source of truth
- Much simpler mental model: recruits are just agents with onboarding_status='lead'

## Context Window

This prompt was created because the previous conversation reached ~79% context usage. Start fresh with this comprehensive context.
