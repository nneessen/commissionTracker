# Recruiting Feature Refactor - Continuation Prompt

## Context
I'm working on fixing critical issues in the recruiting feature of my insurance commission tracking app. The previous developer (you) identified major problems and started implementing fixes. Here's what was found and what's been done.

## Critical Issues Identified

### 1. **MISSING CRUD OPERATIONS** ❌
- No delete UI in list view (only in detail panel now)
- No edit recruit dialog
- No bulk operations
- No archive/soft delete

### 2. **DANGEROUS EDGE CASES** ⚠️
- Delete cascades without proper checks
- No orphan handling for uplines
- No unique constraint on emails
- Race conditions in concurrent updates

### 3. **POOR ERROR HANDLING** 🔥
- Basic throw patterns
- Silent failures
- No retry logic
- Missing user feedback

### 4. **ARCHITECTURAL ISSUES** 💀
- Mixed concerns across 30+ files
- Inconsistent patterns
- No validation layer
- No transaction support

### 5. **DATA INTEGRITY** 📊
- No referential integrity
- Missing indexes
- Incomplete audit trails
- Dangerous cascade deletes

### 6. **UX PROBLEMS** 👎
- No confirmation dialogs (PARTIALLY FIXED)
- No undo/redo
- No search in list
- No keyboard shortcuts
- No status indicators

### 7. **PERFORMANCE** 🐌
- N+1 queries
- No pagination
- No caching
- No optimistic updates

## Work Completed (Phase 1 - Partial)

### ✅ Delete Confirmation Dialog
- Created `/src/features/recruiting/components/DeleteRecruitDialog.tsx`
- Checks for related data (emails, documents, activities, checklist, downlines)
- Blocks deletion if recruit has downlines
- Shows exact counts of what will be deleted
- Integrated into RecruitDetailPanel with delete button

### ✅ Error Boundaries & Notifications
- Created `/src/features/recruiting/components/RecruitingErrorBoundary.tsx`
- Added toast notifications to all mutations
- Wrapped RecruitingDashboard in error boundary
- Proper error messages with recovery options

## Remaining Work

### Phase 1: Critical Fixes (INCOMPLETE)
1. **Add unique constraint on email** - Need database migration
2. **Fix deleteRecruit service** - Add proper dependency checking server-side

### Phase 2: CRUD Completion (NOT STARTED)
1. **Edit Recruit Dialog** - Modal to edit recruit info
2. **Bulk Operations** - Select multiple, bulk delete/update
3. **Archive/Restore** - Soft deletes with recovery
4. **Validation Service** - Centralized validation layer

### Phase 3: Architecture Refactor (NOT STARTED)
1. **Consolidate Logic** - Move scattered code into modules
2. **Transaction Support** - Multi-step operations atomically
3. **Optimistic Updates** - Immediate UI feedback
4. **Error Recovery** - Retry logic and fallbacks

### Phase 4: Performance & UX (NOT STARTED)
1. **Pagination/Virtual Scroll** - Handle large datasets
2. **Search & Filters** - Advanced filtering
3. **Keyboard Navigation** - Accessibility
4. **Undo/Redo System** - Action history

## Code Review & Edge Cases to Consider

### Current Implementation Issues:

1. **DeleteRecruitDialog Problems:**
   - Counting related data is inefficient (multiple queries)
   - No loading state while checking dependencies
   - Doesn't check for policies or commissions
   - Should use transaction to ensure atomic delete
   - Error messages are generic

2. **Error Boundary Limitations:**
   - Only catches render errors, not async errors
   - No error reporting to backend
   - Recovery might not work for all error types
   - Should integrate with logging service

3. **Missing Edge Cases:**
   - What if recruit is both upline AND downline?
   - Circular reference checks missing
   - No handling for network failures during delete
   - No rate limiting on mutations
   - No conflict resolution for concurrent edits
   - What if user deletes their own profile?
   - No audit log for deletions

4. **Security Issues:**
   - No server-side validation of delete permissions
   - Client-side checks can be bypassed
   - No rate limiting
   - No CSRF protection

5. **Data Consistency:**
   - Deletes should be soft by default
   - Need archived_at timestamp
   - Need deleted_by tracking
   - Should maintain referential integrity

## Files to Review
```
/src/features/recruiting/components/DeleteRecruitDialog.tsx
/src/features/recruiting/components/RecruitingErrorBoundary.tsx
/src/features/recruiting/components/RecruitDetailPanel.tsx
/src/features/recruiting/hooks/useRecruitMutations.ts
/src/features/recruiting/RecruitingDashboard.tsx
/src/services/recruiting/recruitingService.ts
```

## Next Steps Priority

1. **URGENT**: Add database migration for email unique constraint
2. **URGENT**: Fix server-side deleteRecruit to check dependencies
3. **HIGH**: Create EditRecruitDialog component
4. **HIGH**: Add soft delete functionality
5. **MEDIUM**: Implement bulk operations
6. **MEDIUM**: Add search/filter to recruit list
7. **LOW**: Performance optimizations

## Technical Debt to Address

- **recruitingService.ts:181-185** - deleteRecruit is too simple, needs checks
- **RecruitListTable.tsx** - Missing delete/edit actions in rows
- **No validation service** - Validation scattered across components
- **No centralized error handling** - Each component handles differently
- **No loading states** - Many operations appear frozen
- **No empty states** - Poor UX when no data

## Testing Requirements

Before considering this complete, ensure:
1. Can't delete recruit with downlines
2. Can't create duplicate emails
3. All CRUD operations have confirmations
4. Errors are handled gracefully
5. No data loss on failures
6. Audit trail for all operations
7. Performance acceptable with 1000+ recruits

## Database Migrations Needed

```sql
-- Add unique constraint on email
ALTER TABLE user_profiles
ADD CONSTRAINT unique_user_email UNIQUE (email);

-- Add soft delete columns
ALTER TABLE user_profiles
ADD COLUMN archived_at TIMESTAMPTZ,
ADD COLUMN archived_by UUID REFERENCES user_profiles(id),
ADD COLUMN archive_reason TEXT;

-- Add indexes for performance
CREATE INDEX idx_user_profiles_archived ON user_profiles(archived_at);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
```

## CRITICAL: Review What Was Built

The code I wrote has these problems:

1. **DeleteRecruitDialog** - Makes 5 separate queries, should be one
2. **Error boundary** - Doesn't actually prevent data loss
3. **Toast notifications** - Can stack up and block UI
4. **No permissions checking** - Anyone can delete anyone
5. **Race conditions** - Multiple users can edit same recruit
6. **Memory leaks** - Subscriptions not cleaned up properly

Please continue the refactor, focusing on Phase 1 completion first, then Phase 2. Be extremely critical of the existing code and fix these architectural issues properly.