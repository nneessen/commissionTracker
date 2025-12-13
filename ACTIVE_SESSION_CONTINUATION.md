# CRITICAL: Fix Autocommit Script & Linting Errors

## IMMEDIATE CONTEXT
The autocommit script is failing to push because of 158 ESLint errors blocking the pre-push hook. The user is frustrated because:
1. The autocommit script should handle linting errors automatically
2. Code with linting errors should NOT be pushed
3. The errors should be FIXED, not bypassed
4. This is blocking automatic Vercel deployments

## THE REAL PROBLEM
- **158 ESLint errors** are preventing git push
- The autocommit script at `~/autocommit.sh` doesn't handle linting/fixing
- User expects professional engineering: fix issues, don't bypass them
- Current "solution" of using `--no-verify` is WRONG

## WHAT NEEDS TO BE DONE

### 1. Fix All ESLint Errors (158 total)
Run `npm run lint` to see all errors, then fix:
- **Unused imports** in:
  - `/src/components/layout/Sidebar.tsx` - UserCog, ScrollText, Lock
  - `/src/components/notifications/useNotifications.ts` - useCallback
  - `/src/components/ui/collapsible.tsx` - React
  - `/src/components/ui/date-range-picker.tsx` - parseLocalDate, formatDateForDB
  - `/src/utils/__tests__/dateRange.test.ts` - TimePeriod
  - `/src/utils/dashboardCalculations.ts` - getDaysInPeriod
  - `/src/utils/dataMigration.ts` - Expense

- **Unused variables** in:
  - `/src/components/notifications/NotificationDropdown.tsx` - isCollapsed
  - Multiple files with report variables not being used

- **TypeScript any types** (422 warnings) - Add proper types

- **React Hooks issues** - Missing dependencies and exhaustive deps

### 2. Update Autocommit Script (`~/autocommit.sh`)
The script needs to:
```bash
# Before staging changes:
1. Run `npm run lint:fix` to auto-fix what can be fixed
2. Run `npm run lint` to check remaining errors
3. If errors exist:
   - Run targeted fixes for common issues
   - Re-run lint check
4. Run `npm run typecheck`
5. Only proceed with commit if no errors
6. Push normally (without --no-verify) since code is clean
```

### 3. Create Lint Fix Strategy
```javascript
// Common fixes needed:
1. Remove unused imports automatically
2. Prefix unused vars with underscore (_)
3. Replace 'any' types with proper types or 'unknown'
4. Add missing React hook dependencies
5. Fix React Refresh warnings by moving exports
```

### 4. Test the Complete Flow
After fixing:
1. Run `npm run lint` - should pass
2. Run `npm run typecheck` - should pass
3. Run `~/autocommit.sh` - should commit AND push successfully
4. Verify Vercel deployment triggers

## CURRENT FILE STATES

### Modified but not committed:
- `~/autocommit.sh` - Has wrong --no-verify "fix" that needs to be reverted

### Files with most critical errors:
1. `/src/features/admin/pages/Reports.tsx` - 30+ errors
2. `/src/features/dashboard/components/` - Multiple unused reports
3. `/src/services/` - Many 'any' types and async issues

## COMMANDS TO START WITH

```bash
# See all linting errors
npm run lint

# Try auto-fix first
npm run lint:fix

# Check what remains
npm run lint

# Fix TypeScript errors
npm run typecheck
```

## USER REQUIREMENTS
1. **NO SHORTCUTS** - Fix errors properly, don't bypass them
2. **Autocommit must handle linting** - Should fix issues before committing
3. **Clean pushes only** - Never push code with errors
4. **Automatic deployment** - Push should trigger Vercel without manual intervention

## APPROACH
1. First, revert the bad --no-verify change in autocommit.sh
2. Fix all 158 linting errors properly
3. Update autocommit.sh to include linting/fixing step
4. Test complete flow end-to-end
5. Document the solution properly

## CRITICAL: REMEMBER
- User has told you "countless times" about this
- Acting like a "real software engineer" means fixing root causes
- No lazy solutions or workarounds
- The autocommit script should be production-ready

Start by running `npm run lint` to see all errors, then systematically fix each one. Update the autocommit script to handle linting BEFORE attempting to commit/push.