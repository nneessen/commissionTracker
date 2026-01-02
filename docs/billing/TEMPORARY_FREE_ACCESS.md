# Temporary Free Access Period

**Implemented**: January 2, 2026
**Expires**: February 1, 2026 (automatically)

## What This Does

All users have FREE access to all subscription features **except the Recruiting Pipeline** until the end of January 2026.

### Features Now Free for Everyone

- Expenses tracking
- Basic & Full Targets
- Reports (view & export)
- Email messaging
- SMS messaging
- Team Hierarchy
- Override tracking
- Downline reports

### Features Still Gated

- **Recruiting Pipeline** - Still requires Team subscription
  - Non-admin users see a yellow warning banner: "Preview Feature - Not Ready for Production Use"
  - You (nickneessen@thestandardhq.com) do NOT see this banner

## Auto-Expiration

The temporary access **automatically expires on February 1, 2026**. No action needed—normal subscription gating resumes.

## Files to Remove After Promotion Ends

If you want to clean up the code after Feb 1, 2026:

### 1. Delete the utility file
```
src/lib/temporaryAccess.ts
```

### 2. Remove from useFeatureAccess.ts
File: `src/hooks/subscription/useFeatureAccess.ts`

Remove this import:
```typescript
import { shouldGrantTemporaryAccess } from "@/lib/temporaryAccess";
```

Remove these lines (3 occurrences in the file):
```typescript
// Temporary free access period (until Feb 1, 2026)
// Grants access to all features EXCEPT recruiting
const hasTemporaryAccess = shouldGrantTemporaryAccess(feature);
```

And remove `|| hasTemporaryAccess` or `|| shouldGrantTemporaryAccess(f)` from the access checks.

### 3. Remove from Sidebar.tsx
File: `src/components/layout/Sidebar.tsx`

Remove this import:
```typescript
import { shouldGrantTemporaryAccess } from "@/lib/temporaryAccess";
```

Remove these lines from hasFeature():
```typescript
// Check temporary free access period (until Feb 1, 2026)
// Grants access to all features EXCEPT recruiting
if (shouldGrantTemporaryAccess(feature)) {
  return true;
}
```

### 4. Remove the recruiting banner (optional)
File: `src/features/recruiting/RecruitingDashboard.tsx`

Remove imports:
```typescript
import { RecruitingPreviewBanner } from "./components/RecruitingPreviewBanner";
import { isSuperAdminEmail } from "@/lib/temporaryAccess";
```

Remove the banner variable and JSX:
```typescript
const showPreviewBanner = !isSuperAdminEmail(supabaseUser?.email);
```
```jsx
{showPreviewBanner && <RecruitingPreviewBanner />}
```

Delete the banner component file:
```
src/features/recruiting/components/RecruitingPreviewBanner.tsx
```

## Quick Verification

To confirm it's working, log in as a non-admin user and check:
1. They can access Expenses, Hierarchy, Reports, etc. without upgrade prompts
2. Recruiting Pipeline shows the yellow warning banner at the top
