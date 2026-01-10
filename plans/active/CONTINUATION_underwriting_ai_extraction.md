# Continuation Prompt: AI-Powered Underwriting Criteria Extraction

## Context
Continue implementing the AI-powered extraction of carrier-specific underwriting criteria from PDF guides.

## Previous Sessions Summary

### Session 1: Foundation Work (COMPLETE)
- Fixed UI freeze bug with React.memo()
- Expanded medication tracking (insulin, blood thinners, antidepressants, pain medications)
- Created initial implementation plan

### Session 2: Phase 1 & 2 (COMPLETE)
**Date:** 2026-01-10

#### Phase 1: PDF Text Extraction (COMPLETE)
Replaced stub implementation with real PDF text extraction using Mozilla's pdf.js library.

**Critical fixes applied:**
- Timeout protection (50s limit)
- Page count limit (500 pages max)
- Failure threshold (50% max failed pages)
- Memory-efficient string concatenation (array + join)
- Resource cleanup (pdfDoc.destroy())
- Safe type handling for text items

**File:** `supabase/functions/parse-underwriting-guide/index.ts`

#### Phase 2: Database Schema (COMPLETE)
Created `carrier_underwriting_criteria` table for storing AI-extracted criteria with human review workflow.

**Files:**
- `supabase/migrations/20260110_009_carrier_underwriting_criteria.sql`
- `supabase/migrations/20260110_010_fix_criteria_rls_policies.sql`
- `supabase/migrations/reverts/20260110_009_carrier_underwriting_criteria.sql`

**Table Features:**
- IMO, carrier, guide, product foreign keys
- Extraction status & confidence tracking
- Human review workflow (pending/approved/rejected/needs_revision)
- Criteria JSONB for structured data
- Source excerpts for audit trail
- RLS policies (uses `roles` array)
- Unique constraint for active criteria per carrier/product

### Session 3: Phase 3 (COMPLETE)
**Date:** 2026-01-10

#### Phase 3: AI Extraction Edge Function (COMPLETE)
Created edge function to extract structured underwriting criteria from parsed PDF guides using Claude API.

**File:** `supabase/functions/extract-underwriting-criteria/index.ts`

**Key Features:**
- Authorization check (IMO admin/owner roles required)
- Reads `parsed_content` from `underwriting_guides` table
- Creates extraction record with "processing" status
- Calls Claude API (claude-sonnet-4-20250514) with structured extraction prompt
- Handles large document chunking (40K chars/chunk, max 3 chunks)
- Chunk overlap (500 chars) for context continuity
- Extracts: age limits, face amounts, knockouts, build/BMI, tobacco, medications, state availability
- Merges criteria from multiple chunks
- Stores results with confidence score and source excerpts
- Error handling with "failed" status update

**Deployment:**
- Deployed to Supabase Edge Functions on 2026-01-10
- Dashboard: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/functions

### Session 4: Phase 3.5 (COMPLETE)
**Date:** 2026-01-10

#### Phase 3.5: Frontend Integration (COMPLETE)
Built frontend hooks and UI to trigger and monitor AI extraction.

**Files Created:**
- `src/services/underwriting/criteriaService.ts` - Service layer for criteria operations
- `src/features/underwriting/hooks/useCriteria.ts` - Query hooks (useCriteriaList, useCriteriaByGuide)
- `src/features/underwriting/hooks/useExtractCriteria.ts` - Mutation hooks (useExtractCriteria, useUpdateCriteriaReview, useDeleteCriteria)

**Files Modified:**
- `src/features/underwriting/types/underwriting.types.ts` - Added criteria types
- `src/features/underwriting/components/GuideManager/GuideList.tsx` - Added Criteria column with extraction button

**UI Features:**
- "Extract" button on parsed guides (violet sparkle icon)
- Status badges: Extracting (blue spinner), Done with confidence %, Failed with retry, Pending
- Tooltip with confidence score and review status
- Disabled extract for unparsed guides with tooltip explanation
- Polling while extraction is processing (3s interval)

### Session 5: Phase 4 (COMPLETE)
**Date:** 2026-01-10

#### Phase 4: Human Review UI (COMPLETE)
Built complete human review interface for approving/rejecting AI-extracted criteria.

**Files Created:**
- `src/features/underwriting/components/CriteriaReview/index.ts` - Module exports
- `src/features/underwriting/components/CriteriaReview/CriteriaReviewDashboard.tsx` - Main list view with filtering/sorting
- `src/features/underwriting/components/CriteriaReview/CriteriaEditor.tsx` - Detail view with collapsible sections
- `src/features/underwriting/components/CriteriaReview/ApprovalDialog.tsx` - Review action dialog
- `src/features/underwriting/components/CriteriaReview/CriteriaSection.tsx` - Reusable collapsible section
- `src/features/underwriting/components/CriteriaReview/SourceExcerptsPanel.tsx` - Audit trail display

**Files Modified:**
- `src/features/underwriting/components/UnderwritingSettingsTab.tsx` - Added "Criteria" tab
- `src/services/underwriting/criteriaService.ts` - Added `updateCriteriaContent` method
- `src/features/underwriting/hooks/useExtractCriteria.ts` - Added `useUpdateCriteriaContent` hook
- `src/types/database.types.ts` - Regenerated with carrier_underwriting_criteria table

**UI Features:**
- Dashboard with search, filter by carrier/extraction status/review status
- Sortable columns: created_at, confidence, carrier, review_status
- CriteriaEditor with collapsible sections for all criteria types:
  - Age Limits, Face Amount Limits, Knockout Conditions
  - Build/BMI Requirements, Tobacco Rules, Medication Restrictions, State Availability
- Source excerpts panel showing PDF citations grouped by field
- ApprovalDialog with Approve/Reject/Needs Revision actions
- Edit mode for manual criteria corrections (admin only)
- Confidence badges with color coding (green 80%+, amber 60-79%, red <60%)

---

## What Needs To Be Implemented (Next Phases)

### Phase 4: Human Review UI (COMPLETE)
Created `src/features/underwriting/components/CriteriaReview/`
- CriteriaReviewDashboard.tsx - List/filter/sort extractions with carrier, status, confidence filters
- CriteriaEditor.tsx - View/edit criteria with collapsible sections for all criteria types
- ApprovalDialog.tsx - Approve/Reject/Needs Revision workflow with notes
- CriteriaSection.tsx - Reusable collapsible section component
- SourceExcerptsPanel.tsx - Audit trail display showing source citations from PDF
- index.ts - Module exports

**Integration:**
- Added "Criteria" tab to UnderwritingSettingsTab.tsx
- Added `updateCriteriaContent` method to criteriaService.ts
- Added `useUpdateCriteriaContent` hook to useExtractCriteria.ts
- Regenerated database.types.ts with `carrier_underwriting_criteria` table

### Phase 5: Integration (NEXT)
- Apply approved criteria to products.metadata
- Auto-generate decision tree rules from criteria

---

## Implementation Order (Updated)
1. [x] Replace PDF stub with real extraction (DONE)
2. [x] Create `carrier_underwriting_criteria` migration (DONE)
3. [x] Build AI extraction edge function (DONE)
4. [x] Build frontend hooks (useExtractCriteria, useCriteriaList, useApproveCriteria) (DONE)
5. [x] Update GuideList UI with extraction trigger (DONE)
6. [x] Build review UI (CriteriaReviewDashboard, CriteriaEditor, ApprovalDialog) (DONE)
7. [ ] Build integration service (apply criteria to products.metadata)

## Testing Required (Phase 4)
To test the Human Review UI:
1. Navigate to Settings → Underwriting → Criteria tab
2. View the list of all extracted criteria for your IMO
3. Use filters: Carrier dropdown, Extraction status, Review status
4. Click a row to open the CriteriaEditor
5. View extracted criteria in collapsible sections:
   - Age Limits (min/max issue age)
   - Face Amount Limits (with age tiers table)
   - Knockout Conditions (code/name/severity table)
   - Build/BMI Requirements
   - Tobacco Rules (classifications, nicotine test requirements)
   - Medication Restrictions
   - State Availability (available/excluded states)
6. View source excerpts panel showing citations from the PDF
7. Click "Review" to open ApprovalDialog
8. Choose action: Approve (activates criteria), Reject, or Request Revision
9. Add review notes and submit

## Start Command for Next Session
```
Continue from plans/active/CONTINUATION_underwriting_ai_extraction.md

Begin Phase 5: Integration - Apply approved criteria to products and auto-generate decision tree rules.
```

---

# Phase 4 Continuation Prompt

## Context
Continue from `plans/active/CONTINUATION_underwriting_ai_extraction.md`

Phases 1-3.5 are complete:
- ✅ Phase 1: PDF text extraction (pdf.js)
- ✅ Phase 2: `carrier_underwriting_criteria` table with RLS
- ✅ Phase 3: AI extraction edge function deployed
- ✅ Phase 3.5: Frontend hooks and GuideList UI integration

## Phase 4 Task
Build Human Review UI for approving/rejecting extracted criteria.

### Requirements

1. **CriteriaReviewDashboard.tsx**
   - List all extraction records for the IMO
   - Filterable by: carrier, extraction_status, review_status
   - Sortable by: created_at, confidence, carrier
   - Show: carrier name, guide name, confidence, extraction status, review status, extracted_at
   - Click row to open CriteriaEditor

2. **CriteriaEditor.tsx**
   - Display extracted criteria in collapsible sections:
     - Age Limits
     - Face Amount Limits (with age tiers table)
     - Knockout Conditions (code/name/severity table)
     - Build/BMI Requirements
     - Tobacco Rules
     - Medication Restrictions
     - State Availability (chips)
   - Source excerpts panel (audit trail)
   - Edit mode for manual corrections (admin only)
   - Save changes back to criteria JSONB

3. **ApprovalDialog.tsx**
   - Review actions: Approve, Reject, Needs Revision
   - Notes field for reviewer comments
   - Displays reviewer name and timestamp when reviewed
   - Approve sets `is_active = true`

4. **Route Integration**
   - Add to Underwriting Settings tab navigation
   - Route: `/settings/underwriting/criteria`
   - Permission: IMO admin/owner only

### Component Structure
```
src/features/underwriting/components/CriteriaReview/
├── index.ts
├── CriteriaReviewDashboard.tsx
├── CriteriaEditor.tsx
├── ApprovalDialog.tsx
├── CriteriaSection.tsx (reusable section component)
└── SourceExcerptsPanel.tsx
```

### Reference Files
- Types: `src/features/underwriting/types/underwriting.types.ts` (ExtractedCriteria, CriteriaWithRelations)
- Hooks: `src/features/underwriting/hooks/useCriteria.ts`, `useExtractCriteria.ts`
- Service: `src/services/underwriting/criteriaService.ts`
- Existing settings pattern: `src/features/underwriting/components/GuideManager/`

### Design Guidelines
- Match existing compact design (text-[10px] to text-[11px])
- Use shadcn/ui components (Table, Badge, Dialog, Collapsible)
- Muted color palette, minimal padding
- Data-dense layout

### Deliverables
1. `src/features/underwriting/components/CriteriaReview/` directory with all components
2. Updated underwriting settings navigation
3. Route configuration

### Success Criteria
- Dashboard shows all criteria extractions
- Editor displays all criteria sections properly
- Approve/Reject workflow updates database
- Active criteria visible in system
- No TypeScript errors on build

## Plan File Reference
Full implementation plan: `/home/nneessen/.claude/plans/steady-wishing-reef.md`
