# Component Naming Conventions - CRITICAL

## NEVER CREATE DUPLICATES WITH UNCONVENTIONAL NAMES

### ❌ FORBIDDEN NAMING PATTERNS:
- ComponentNameUpdated
- ComponentNameImproved 
- ComponentNameAdvanced
- ComponentNameNew
- ComponentNameOld
- ComponentNameTemp
- ComponentNameTest

### ✅ CORRECT NAMING:
- Use clear, descriptive names that indicate purpose
- Examples:
  - `PolicyForm` → For editing/creating policies
  - `AddPolicyForm` → Specifically for adding new policies
  - `EditPolicyForm` → Specifically for editing existing policies
  - `Sidebar` NOT `AdvancedSidebar`
  - `PolicyList` NOT `PolicyListInfinite`

### RULES:
1. **NEVER** create a new component with "Updated", "Improved", "Advanced" suffixes
2. **ALWAYS** update the existing component instead of creating a duplicate
3. **ALWAYS** use conventional naming that describes the component's purpose
4. **NEVER** leave duplicate/orphaned components in the codebase
5. If you need to refactor, refactor the existing component in place
6. If you need different behavior, use props/configuration, not duplicate components

### Recently Cleaned Up Duplicates:
- Removed: PolicyFormUpdated.tsx (was duplicate of PolicyForm.tsx)
- Removed: PolicyListInfinite.tsx (was duplicate of PolicyList.tsx)

### Before Creating Any Component:
1. Check if a similar component already exists
2. If yes → modify the existing one
3. If no → create with a proper conventional name
4. Never append "Updated", "New", "Advanced" etc. to bypass existing components