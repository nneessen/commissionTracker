# Continuation Prompt: Code Review - Onboarding Status Refactor

## Context

A refactor was just completed to remove hardcoded `OnboardingStatus` types and make onboarding statuses dynamic based on the `pipeline_phases` database table. This addresses the architectural issue where multiple pipelines can exist, each with different phases.

## What Changed

### Problem Solved
- Removed hardcoded `OnboardingStatus` union type that was duplicated across 8+ files
- Onboarding statuses now come dynamically from `pipeline_phases` table based on recruit's `pipeline_template_id`

### Files Modified (10 files)

**Types:**
1. `src/types/recruiting.types.ts` - Removed `OnboardingStatus`, `PhaseName`, `PHASE_DISPLAY_NAMES`; added `TerminalStatus`, renamed `ONBOARDING_STATUS_COLORS` → `TERMINAL_STATUS_COLORS`
2. `src/types/user.types.ts` - Removed `OnboardingStatus` type

**Services:**
3. `src/services/recruiting/checklistService.ts` - Replaced `phaseNameToStatus()` with `normalizePhaseNameToStatus()`
4. `src/services/recruiting/repositories/RecruitRepository.ts` - `getStats()` now accepts optional `activePhaseStatuses` parameter

**Components:**
5. `src/features/recruiting/RecruitingDashboard.tsx` - Added `useActiveTemplate()` + `usePhases()` hooks, dynamic phase calculation
6. `src/features/recruiting/components/FilterDialog.tsx` - Now accepts `pipelinePhases` prop, builds options dynamically
7. `src/features/recruiting/components/RecruitListTable.tsx` - Uses `TERMINAL_STATUS_COLORS` with fallback
8. `src/features/recruiting/components/RecruitDetailPanel.tsx` - Uses `TERMINAL_STATUS_COLORS` with fallback
9. `src/features/dashboard/components/TeamRecruitingSection.tsx` - Fetches phases via hooks
10. `src/features/training-hub/components/RecruitingTab.tsx` - Uses `TERMINAL_STATUS_COLORS`

## Code Review Request

Perform a comprehensive code review on the onboarding status refactor. Focus on:

### 1. Type Safety
- Are there any remaining hardcoded status strings that should be dynamic?
- Is the `string` type too loose where we removed `OnboardingStatus`?
- Should we add runtime validation for status values?

### 2. Consistency
- Is `normalizePhaseNameToStatus()` duplicated? Should it be in a shared utility?
- Are all components using the same pattern for fetching phases?
- Is `TERMINAL_STATUS_COLORS` being used consistently across all files?

### 3. Edge Cases
- What happens if `useActiveTemplate()` returns null/undefined?
- What happens if `usePhases()` returns empty array?
- Are there loading states handled properly?
- What about recruits with no `pipeline_template_id`?

### 4. Performance
- Are there unnecessary re-renders from the new hooks?
- Is the phase fetching efficient (cached properly with TanStack Query)?

### 5. Missing Updates
- Are there other files still importing removed types (`OnboardingStatus`, `PhaseName`, `PHASE_DISPLAY_NAMES`, `ONBOARDING_STATUS_COLORS`)?
- Are there database queries filtering by hardcoded status values?

### 6. FilterDialog Integration
- The `FilterDialog` now accepts `pipelinePhases` as optional prop - verify all parent components pass it
- Check if filtering still works correctly with dynamic phases

### 7. Stats Calculation
- Verify `RecruitRepository.getStats()` works correctly with and without `activePhaseStatuses` parameter
- Check if callers are passing the phases correctly

## Commands to Run

```bash
# Check for any remaining hardcoded status references
grep -r "interview_1\|zoom_interview\|pre_licensing\|npn_received\|bootcamp" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Check for any remaining imports of removed types
grep -r "OnboardingStatus\|PhaseName\|PHASE_DISPLAY_NAMES\|ONBOARDING_STATUS_COLORS" src/ --include="*.ts" --include="*.tsx"

# Run typecheck
npm run typecheck

# Run build
npm run build
```

## Success Criteria

1. No TypeScript errors
2. Build succeeds
3. No hardcoded phase/status arrays remain (except terminal states)
4. All components fetching phases use consistent pattern
5. Edge cases handled gracefully
