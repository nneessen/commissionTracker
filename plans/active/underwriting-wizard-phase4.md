# AI Underwriting Wizard - Phase 4 Implementation

## Context
Phases 1-3 are complete. The wizard has core functionality, decision tree editor, settings integration, session history, guide management UI, and feature toggle. Phase 4 focuses on making the uploaded guides useful by parsing them and integrating with the AI analysis.

## Branch
`feature/underwriting-wizard` (continue on existing branch)

## What's Complete

### Phase 1 - Core Wizard
- 5-step wizard: ClientInfo → HealthConditions → CoverageRequest → Review → Recommendations
- 28 health conditions with dynamic follow-up schemas
- Edge function: `supabase/functions/underwriting-ai-analyze/index.ts`
- RLS policies (IMO-scoped)

### Phase 2 - Decision Tree Editor
- Full CRUD for decision trees with rule builder
- Conditions, operators, and action configuration
- Set default tree functionality

### Phase 3 - Settings Integration
- UnderwritingSettingsTab with 4 sub-tabs (Trees, Sessions, Guides, Settings)
- DecisionTreeList with CRUD operations
- SessionHistoryList and SessionDetailDialog
- GuideUploader and GuideList for PDF management
- Feature toggle for enabling/disabling wizard per agency
- Shared formatters and type guards

## Phase 4 Scope

### 1. Guide PDF Parsing (Priority 1)
Parse uploaded PDFs to extract underwriting content for AI context.

**Approach Options:**
- **Option A:** Edge function using pdf-parse or similar library
- **Option B:** External service (OpenAI file upload, dedicated parsing API)
- **Option C:** Simple text extraction + chunking for RAG

**Components needed:**
- `supabase/functions/parse-underwriting-guide/index.ts` - Edge function to parse PDF
- Update `underwriting_guides` table with parsed content fields
- Trigger parsing after upload (or manual "Parse" action)
- Store extracted text/sections in `parsed_content` JSONB field

**Database changes:**
```sql
ALTER TABLE underwriting_guides ADD COLUMN IF NOT EXISTS parsed_content JSONB;
ALTER TABLE underwriting_guides ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMPTZ;
ALTER TABLE underwriting_guides ADD COLUMN IF NOT EXISTS parsing_error TEXT;
```

### 2. AI Analysis Enhancement (Priority 2)
Improve the AI analysis to use decision trees and parsed guide content.

**Current state:** `underwriting-ai-analyze` edge function exists but may not use:
- Decision tree rules for logic
- Parsed guide content for carrier-specific recommendations

**Enhancements:**
- Fetch active decision tree and apply rules before/alongside AI
- Include relevant guide excerpts in AI prompt for carrier context
- Better carrier matching based on guide criteria
- Risk factor weighting from decision tree rules

### 3. Recommendation Quality (Priority 3)
Improve the recommendations output with:
- Confidence scores for each carrier recommendation
- Specific guide references (page/section numbers if available)
- Alternative products when primary isn't available
- Decline reasons when applicable

### 4. Testing & Polish (Priority 4)
- Unit tests for parsing logic
- Integration tests for AI analysis flow
- Error handling improvements
- Loading states and progress indicators for long operations

## File Structure to Create

```
supabase/functions/
├── parse-underwriting-guide/
│   └── index.ts              # PDF parsing edge function

supabase/migrations/
└── 20260109_005_guide_parsing_fields.sql

src/features/underwriting/
├── hooks/
│   └── useParseGuide.ts      # Mutation to trigger parsing
└── components/
    └── GuideManager/
        └── GuideParsingStatus.tsx  # Show parsing progress/results
```

## Implementation Order

1. **Database migration** - Add parsed_content fields to underwriting_guides
2. **Parse edge function** - Create PDF parsing function
3. **useParseGuide hook** - Trigger parsing from UI
4. **Update GuideList** - Add "Parse" action and show parsing status
5. **Enhance AI analysis** - Integrate parsed content into prompts
6. **Decision tree integration** - Apply rules in analysis flow
7. **Testing** - Add tests for critical paths

## Design Decisions Needed

1. **PDF Parsing Library:** Which library/approach for PDF text extraction?
   - pdf-parse (Node.js, simple)
   - pdfjs-dist (browser-compatible)
   - External API (more robust but adds dependency)

2. **Content Storage:** How to structure parsed content?
   - Full text blob
   - Chunked sections with metadata
   - Structured extraction (tables, conditions, etc.)

3. **AI Integration:** How to use guide content in prompts?
   - Include full text (token-heavy)
   - Semantic search for relevant sections (RAG approach)
   - Pre-summarized key points per guide

## To Continue

```
Continue implementing Phase 4 of the AI Underwriting Wizard on branch feature/underwriting-wizard.

See plans/active/underwriting-wizard-phase4.md for full context.

Start with Priority 1 - Guide PDF Parsing:

1. Create migration: `supabase/migrations/20260109_005_guide_parsing_fields.sql`
   - Add parsed_content JSONB, parsed_at TIMESTAMPTZ, parsing_error TEXT to underwriting_guides

2. Create edge function: `supabase/functions/parse-underwriting-guide/index.ts`
   - Accept guide ID parameter
   - Download PDF from storage
   - Extract text using pdf-parse or similar
   - Update database with parsed content
   - Handle errors gracefully

3. Create hook: `src/features/underwriting/hooks/useParseGuide.ts`
   - Mutation to invoke the edge function
   - Invalidate guide queries on success

4. Update GuideList.tsx:
   - Add "Parse" action in dropdown menu
   - Show parsing status (pending/completed/failed)
   - Display parsed_at timestamp

Run typecheck after each step. Follow existing edge function patterns.
```

## Key Files Reference

### Edge functions to study:
- `supabase/functions/underwriting-ai-analyze/index.ts` - Existing AI analysis
- `supabase/functions/send-password-reset/index.ts` - Edge function pattern

### Hooks pattern:
- `src/features/underwriting/hooks/useUnderwritingGuides.ts` - Guide CRUD

### Storage service:
- `src/services/underwriting/guideStorageService.ts` - PDF storage operations
