# Code Review Continuation: Phase 4 - Human Review UI for AI-Extracted Criteria

## Context

This is a production-grade code review for the Phase 4 implementation of the AI-powered underwriting criteria extraction system. The code implements a human review interface for approving/rejecting AI-extracted carrier underwriting criteria.

---

## Files to Review

### New Components (6 files)
```
src/features/underwriting/components/CriteriaReview/
├── index.ts                      - Module exports
├── CriteriaReviewDashboard.tsx   - Main list view with filtering/sorting
├── CriteriaEditor.tsx            - Detail view with collapsible sections
├── ApprovalDialog.tsx            - Approve/Reject/Revise workflow dialog
├── CriteriaSection.tsx           - Reusable collapsible section component
└── SourceExcerptsPanel.tsx       - Audit trail display for PDF citations
```

### Modified Files (4 files)
```
src/features/underwriting/components/UnderwritingSettingsTab.tsx  - Added "Criteria" tab
src/services/underwriting/criteriaService.ts                     - Added updateCriteriaContent()
src/features/underwriting/hooks/useExtractCriteria.ts            - Added useUpdateCriteriaContent hook
src/types/database.types.ts                                      - Regenerated (verify carrier_underwriting_criteria exists)
```

### Related Types (reference)
```
src/features/underwriting/types/underwriting.types.ts
  - ExtractedCriteria interface (lines 374-420)
  - SourceExcerpt interface (lines 422-426)
  - CriteriaWithRelations interface (lines 428-433)
  - ReviewStatus type (line 372)
  - ExtractionStatus type (line 371)
```

---

## Review Start Command

```
Perform a production-grade code review of Phase 4: Human Review UI.

Read and analyze these files in order:

1. src/features/underwriting/types/underwriting.types.ts (lines 364-445) - Type definitions
2. src/services/underwriting/criteriaService.ts - Service layer
3. src/features/underwriting/hooks/useExtractCriteria.ts - Mutation hooks
4. src/features/underwriting/components/CriteriaReview/CriteriaSection.tsx
5. src/features/underwriting/components/CriteriaReview/SourceExcerptsPanel.tsx
6. src/features/underwriting/components/CriteriaReview/ApprovalDialog.tsx
7. src/features/underwriting/components/CriteriaReview/CriteriaEditor.tsx
8. src/features/underwriting/components/CriteriaReview/CriteriaReviewDashboard.tsx
9. src/features/underwriting/components/UnderwritingSettingsTab.tsx

Then provide findings using the OUTPUT FORMAT below.
```

---

## Key Review Areas

### 1. Type Safety Concerns
- `criteria.criteria as ExtractedCriteria` - unsafe cast from JSONB
- `criteria.source_excerpts as unknown as SourceExcerpt[]` - double cast
- `CriteriaWithRelations` extends DB Row but adds nullable relation objects
- Verify `carrier_underwriting_criteria` table exists in database.types.ts

### 2. Authorization Check
- Review who can access the Criteria tab
- Check `useCanManageUnderwriting` permission guard
- Verify `updateCriteriaContent` has proper RLS protection
- Confirm only IMO admin/owner can approve criteria

### 3. Data Flow
- Service calls Supabase directly (not via BaseRepository pattern)
- Check for proper error handling in mutations
- Verify query invalidation patterns are correct

### 4. UI/UX Edge Cases
- Empty state handling for no criteria
- Loading states while fetching
- Error display on failed operations
- Filter combinations that return no results

### 5. Edit Mode Security
- Who can enable edit mode?
- Is `canEdit` prop properly controlled?
- What happens if criteria is edited while another user approves?

---

## OUTPUT FORMAT (REQUIRED)

```markdown
## 🔴 CRITICAL ISSUES
[Issues that MUST be fixed before merge - security, data loss, crashes]

| Issue | File:Line | Description | Impact | Fix |
|-------|-----------|-------------|--------|-----|

## 🟠 HIGH PRIORITY
[Issues that should be fixed soon - bugs, performance, maintainability]

| Issue | File:Line | Description | Impact | Fix |
|-------|-----------|-------------|--------|-----|

## 🟡 MEDIUM PRIORITY
[Issues worth addressing - code quality, consistency, minor bugs]

| Issue | File:Line | Description | Impact | Fix |
|-------|-----------|-------------|--------|-----|

## 🟢 LOW PRIORITY / SUGGESTIONS
[Nice-to-have improvements, style, documentation]

| Issue | File:Line | Description | Suggestion |
|-------|-----------|-------------|------------|

## ✅ CHECKLIST VERIFICATION

### Database & Types
- [ ] database.types.ts includes carrier_underwriting_criteria
- [ ] All types derive from Database types (not hardcoded)
- [ ] snake_case/camelCase handled consistently

### Service Layer
- [ ] criteriaService follows existing patterns
- [ ] Error handling is consistent
- [ ] No direct Supabase calls in components

### Security
- [ ] Authorization checks present
- [ ] No data leakage risks
- [ ] Input validation where needed

### Performance
- [ ] No N+1 query patterns
- [ ] Reasonable re-render behavior
- [ ] No memory leaks (useEffect cleanup)

## 📋 SUMMARY

**Overall Assessment:** [APPROVE / APPROVE WITH CHANGES / REQUEST CHANGES]

**Key Risks:**
1. [Risk 1]
2. [Risk 2]

**Recommended Actions:**
1. [Action 1]
2. [Action 2]
```

---

## Additional Context

### Database Table Schema (carrier_underwriting_criteria)
```sql
- id: uuid PK
- imo_id: uuid FK -> imos
- carrier_id: uuid FK -> carriers
- guide_id: uuid FK -> underwriting_guides
- product_id: uuid FK -> products (nullable)
- criteria: jsonb (ExtractedCriteria)
- source_excerpts: jsonb (SourceExcerpt[])
- extraction_status: text (pending|processing|completed|failed)
- extraction_confidence: numeric
- extraction_error: text
- extracted_at: timestamptz
- review_status: text (pending|approved|rejected|needs_revision)
- reviewed_by: uuid FK -> user_profiles
- reviewed_at: timestamptz
- review_notes: text
- is_active: boolean
- created_at: timestamptz
- updated_at: timestamptz
```

### RLS Policies
- SELECT: authenticated users in same IMO
- INSERT/UPDATE/DELETE: IMO admin/owner only (roles array contains 'admin' or 'owner')

### Previous Sessions
- Phase 1: PDF text extraction (pdf.js)
- Phase 2: Database schema migration
- Phase 3: AI extraction edge function (Claude API)
- Phase 3.5: Frontend hooks and GuideList integration
- **Phase 4: Human Review UI (this review)**

---

## Start the Review

Read the files listed above and provide your findings in the OUTPUT FORMAT.
