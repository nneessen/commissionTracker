# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Checkpoint] - 2025-09-26 14:04:57

### Changed Files
- `src/features/policies/PolicyDashboard.tsx`

### Statistics
```
 1 file changed, 2 insertions(+), 2 deletions(-)
```

## [Checkpoint] - 2025-09-26 13:34:25

### Changed Files
- `ADD-POLICY-NOW.js`
- `BROWSER-TEST-INSTRUCTIONS.md`
- `CHANGELOG.md`
- `TEST-NOW.md`
- `add-test-policy.html`
- `debug-policy-issue.js`
- `manual-test-instructions.md`
- `simulate-add-policy.js`
- `src/__tests__/policies.test.tsx`
- `src/features/policies/PolicyDashboard.tsx`
- `src/features/policies/PolicyForm.tsx`
- `src/features/policies/PolicyList.tsx`
- `src/hooks/usePolicy.ts`
- `src/setupTests.ts`
- `src/types/policy.types.ts`
- `src/utils/__tests__/policyCalculations.test.ts`
- `src/utils/policyCalculations.ts`
- `src/utils/test-add-policy.js`
- `test-add-policy-comprehensive.html`
- `test-live-addition.html`
- `test-live-app.js`
- `test-policy-add.html`
- `test-policy-browser.js`
- `test-policy-node.js`

### Statistics
```
 24 files changed, 2059 insertions(+), 70 deletions(-)
```
## [1.0.2] - 2025-09-26

### Fixed - Complete Rewrite of Policy Addition Logic
- **CRITICAL FIX**: Completely rewrote policy addition to fix scope and closure issues
  - Fixed: `addPolicy` had scope issues where `isDuplicate` and `newPolicy` variables were only accessible inside `setPolicies` callback
  - Fixed: Moved duplicate checking BEFORE state update to properly throw errors
  - Fixed: Added `policies` dependency to useCallback hooks to avoid stale closures
  - Fixed: Similar scope fixes applied to `updatePolicy` function
  - Result: Policies now properly add and persist to localStorage

### Root Cause Analysis
- The bug was caused by attempting to check `isDuplicate` and return `newPolicy` outside the `setPolicies` callback where they were set
- This caused the function to always return `null` and never throw duplicate errors
- The fix moves duplicate checking before the state update and creates the policy object in the correct scope

## [1.0.1] - 2025-09-26 (Initial Attempt - Did Not Work)

### Attempted Fixes
- **Initial Bug Report**: Policy addition failing - form submission did nothing
  - Annual premium calculation was added but didn't fix the core issue
  - Created utility functions but the main problem was in the hook logic

### Added
- Created `utils/policyCalculations.ts` with reusable premium calculation functions
- Added comprehensive test suite for policy functionality
- Added validation for commission percentages (0-200% range)
- Added validation for premium amounts

### Changed
- Refactored PolicyForm to calculate annual premium before submission
- Updated NewPolicyForm interface to include optional annualPremium field
- Improved form validation with clearer error messages

### Technical Details
- Premium calculation logic is now centralized in utility functions
- Support for all payment frequencies (monthly, quarterly, semi-annual, annual)
- Test coverage includes edge cases and different payment scenarios
- Added extensive console logging for debugging (can be removed in production)


## [Checkpoint] - 2025-09-26 10:41:42

### Changed Files
- `.serena/.gitignore`
- `.serena/project.yml`
- `package-lock.json`
- `package.json`
- `postcss.config.js`
- `src/App.tsx`
- `src/components/ui/DataTable.tsx`
- `src/components/ui/Input.tsx`
- `src/features/analytics/AnalyticsDashboard.tsx`
- `src/features/analytics/ChartCard.tsx`
- `src/features/analytics/MetricsCard.tsx`
- `src/features/analytics/PerformanceTable.tsx`
- `src/features/analytics/index.ts`
- `src/features/policies/PolicyDashboard.tsx`
- `src/features/policies/PolicyForm.tsx`
- `src/features/policies/PolicyList.tsx`
- `src/features/policies/index.ts`
- `src/hooks/index.ts`
- `src/hooks/useCommissions.ts`
- `src/hooks/useMetrics.ts`
- `src/hooks/usePolicy.ts`
- `src/styles/policy.css`
- `src/styles/tailwind.css`
- `src/types/carrier.types.ts`
- `src/types/commission.types.ts`
- `src/types/index.ts`
- `src/types/metrics.types.ts`
- `src/types/policy.types.ts`
- `src/types/ui.types.ts`
- `supabase/.branches/_current_branch`
- `supabase/.temp/cli-latest`
- `tsconfig.json`

### Statistics
```
 32 files changed, 4419 insertions(+), 80 deletions(-)
```
