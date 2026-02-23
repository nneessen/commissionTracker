# UW Wizard Upgrade TODO (Including Training PDF Pipeline)

**Created:** 2026-02-23  
**Status:** Planning / Review Complete / Implementation Not Started  
**Owner:** Nick (with Codex support)  
**Purpose:** Document the current state, risks, and a phased upgrade plan for high-accuracy PDF parsing/extraction for:
- Underwriting (UW) guides and UW wizard recommendations
- Training module generation from PDFs (`My Training`)

## 1. Scope of This Review

This review covers the relevant implemented systems end-to-end for the requested work:

- UW guide upload, storage, parsing, criteria extraction, review, approval
- UW wizard recommendation execution (AI + deterministic engine)
- UW rule engine v2 integration path
- UW extracted criteria usage in deterministic engine and AI analyzer
- Training PDF import flow for generating modules/lessons/quizzes
- Related types, validators, and deployment proxy wiring for PDF extraction

This is a complete review of the relevant subsystems for the upgrade, not a review of unrelated repo areas (billing, commissions, recruiting, etc.).

## 2. Executive Summary (What Was Verified)

### 2.1 Verified Current State

- The deterministic UW decision engine is already using Rule Engine v2 (older docs saying otherwise are stale).
- The UW wizard runs two recommendation systems in parallel:
  - AI underwriting analysis (guide-informed)
  - Deterministic rate-table + rules engine recommendations
- UW PDF parsing is still text-only extraction from PDF text layers (no OCR/layout routing).
- UW criteria extraction is the main accuracy bottleneck for mixed-format PDFs:
  - plain text chunking
  - hard chunk cap
  - "first found wins" merge behavior
- The Training module PDF flow already depends on a richer external OCR/layout extractor and returns structured data (`lessons`, `tables`, `pages`).

### 2.2 Why Accuracy Is Failing on Mixed PDFs

The UW parsing/extraction pipeline currently assumes text-heavy, layout-simple PDFs. It does not classify pages or route to different extractors for:

- scanned pages
- mixed text/image pages
- table-heavy pages
- inconsistent page templates

As a result, multi-format guides and medical-style documents lose structure before the AI sees them.

### 2.3 Best Upgrade Direction (Repo-Specific)

Build a shared document-ingestion pipeline (layout/OCR-aware) and reuse it for two downstream transforms:

- UW criteria extraction (high-confidence structured underwriting fields)
- Training module generation (lessons/content/quizzes)

Do not add more one-off PDF parsing paths.

## 3. Reviewed Systems and Key Files

## 3.1 UW Guide / Criteria Pipeline (Admin)

- Guide upload/storage:
  - `src/features/underwriting/hooks/useUnderwritingGuides.ts`
  - `src/services/underwriting/guideStorageService.ts`
  - `src/features/underwriting/components/GuideManager/GuideUploader.tsx`
  - `src/features/underwriting/components/GuideManager/GuideList.tsx`
- Parse trigger:
  - `src/features/underwriting/hooks/useParseGuide.ts`
  - `supabase/functions/parse-underwriting-guide/index.ts`
- Criteria extraction trigger/review:
  - `src/features/underwriting/hooks/useExtractCriteria.ts`
  - `src/services/underwriting/criteriaService.ts`
  - `supabase/functions/extract-underwriting-criteria/index.ts`
  - `src/features/underwriting/components/CriteriaReview/*`
  - `src/features/underwriting/utils/criteriaValidation.ts`
- Data types:
  - `src/features/underwriting/types/underwriting.types.ts`
  - `src/types/database.types.ts`

## 3.2 UW Wizard Execution Pipeline

- Wizard orchestration:
  - `src/features/underwriting/components/UnderwritingWizard.tsx`
- Results UI:
  - `src/features/underwriting/components/WizardSteps/RecommendationsStep.tsx`
- AI analysis hook:
  - `src/features/underwriting/hooks/useUnderwritingAnalysis.ts`
- Deterministic decision engine hook:
  - `src/features/underwriting/hooks/useDecisionEngineRecommendations.ts`
- Decision engine orchestration:
  - `src/services/underwriting/decisionEngine.ts`
  - `src/services/underwriting/product-evaluation.ts`
  - `src/services/underwriting/eligibility-filter.ts`
- Rule engine v2 path:
  - `src/services/underwriting/ruleEngineV2Adapter.ts`
  - `src/services/underwriting/ruleService.ts`
  - `src/services/underwriting/ruleEvaluator.ts`
- Condition response normalization:
  - `src/services/underwriting/conditionResponseTransformer.ts`

## 3.3 UW AI Analyzer / Guide Context / Criteria Filtering

- Main edge function:
  - `supabase/functions/underwriting-ai-analyze/index.ts`
- Criteria evaluator (deterministic pre-filtering):
  - `supabase/functions/underwriting-ai-analyze/criteria-evaluator.ts`
- Decision tree rule evaluator:
  - `supabase/functions/underwriting-ai-analyze/rule-evaluator.ts`

## 3.4 Training PDF -> Module Generation

- Import dialog and hook:
  - `src/features/training-modules/components/admin/CreateFromPdfDialog.tsx`
  - `src/features/training-modules/hooks/useCreateModuleFromPdf.ts`
- PDF extraction + transform + seeding:
  - `src/features/training-modules/services/pdfModuleService.ts`
  - `src/features/training-modules/types/pdf-extraction.types.ts`
- Local pipeline scripts (similar transform flow):
  - `scripts/pdf-pipeline/transform.ts`
  - `scripts/pdf-pipeline/types.ts`
  - `scripts/pdf-pipeline/quiz-generator.ts`
- Module creation services:
  - `src/features/training-modules/services/trainingModuleService.ts`
  - `src/features/training-modules/services/trainingLessonService.ts`
  - `src/features/training-modules/services/trainingQuizService.ts`
- Extraction proxy wiring:
  - `vite.config.ts`
  - `vercel.json`

## 4. Verified Findings (Important Corrections and Risks)

## 4.1 UW Rule Engine v2 Is Already Integrated (Docs Are Partially Stale)

Older internal docs state the decision engine is still using the legacy acceptance system only. Current code shows:

- `product-evaluation` calls `calculateApprovalV2()`:
  - `src/services/underwriting/product-evaluation.ts:535`
- v2 adapter builds fact map and loads approved rule sets:
  - `src/services/underwriting/ruleEngineV2Adapter.ts:174`
  - `src/services/underwriting/ruleEngineV2Adapter.ts:202`
  - `src/services/underwriting/ruleEngineV2Adapter.ts:216`

This means the "rule engine disconnected" problem is no longer the primary blocker for the PDF upgrade work.

## 4.2 UW Wizard Runs AI and Deterministic Recommendations in Parallel

On review submit, the wizard triggers both:

- AI analysis mutation:
  - `src/features/underwriting/components/UnderwritingWizard.tsx:313`
- Deterministic decision engine mutation:
  - `src/features/underwriting/components/UnderwritingWizard.tsx:323`

Implication:
- Any parser/extraction refactor must preserve both consumer paths and avoid breaking the current results UI.

## 4.3 UW PDF Parsing Is Text-Layer Extraction Only (No OCR / No Layout)

Current UW parsing edge function:

- extracts page text via `getTextContent()`:
  - `supabase/functions/parse-underwriting-guide/index.ts:216`
- stores parsed content as JSON string with `fullText` + page sections:
  - `supabase/functions/parse-underwriting-guide/index.ts:284`

This is fragile for:

- scanned PDFs
- image-based pages
- tables without clean text flow
- mixed page templates/layouts

The validation message itself acknowledges this risk:

- `supabase/functions/parse-underwriting-guide/index.ts:357`

## 4.4 UW Criteria Extraction Has Multiple Accuracy/Recall Constraints

### Hard chunk cap (drops large document content)

- `MAX_TOTAL_CHUNKS = 3`:
  - `supabase/functions/extract-underwriting-criteria/index.ts:90`
- extra chunks are ignored:
  - `supabase/functions/extract-underwriting-criteria/index.ts:268`

Impact:
- large guides are partially analyzed
- later sections (often medication/tables/state riders/product appendices) may never be seen

### Char-based chunking breaks semantic boundaries

- chunking logic:
  - `supabase/functions/extract-underwriting-criteria/index.ts:390`

Impact:
- tables split across chunks
- headers separated from rows
- underwriting rules separated from conditions/product scope context

### Single-prompt plain-text extraction per chunk

- model call:
  - `supabase/functions/extract-underwriting-criteria/index.ts:446`
- prompt returns one JSON object with broad categories:
  - `supabase/functions/extract-underwriting-criteria/index.ts:493`

Impact:
- broad prompt encourages omissions on mixed documents
- no page-type specialization
- no table-specific parsing strategy

### Merge strategy is lossy

- merge implementation:
  - `supabase/functions/extract-underwriting-criteria/index.ts:591`

Behavior:
- many fields use "first non-null wins"
- conflicts are not surfaced
- extraction disagreement across chunks is not tracked for review

## 4.5 Criteria Schema Is Inconsistent Across Extractor / UI Validation / Runtime Evaluators

### Extractor edge function supports only a limited medication subset

- `supabase/functions/extract-underwriting-criteria/index.ts:68`

### UI validation schema also validates only a limited subset

- `src/features/underwriting/utils/criteriaValidation.ts:82`

### Runtime UW types and criteria evaluator support a much broader set

- `src/features/underwriting/types/underwriting.types.ts:686`
- `supabase/functions/underwriting-ai-analyze/criteria-evaluator.ts:65`

Impact:
- valid medication restriction fields may be dropped, never extracted, or blocked by UI validation
- meds are especially important for your use case (medical conditions/medications)

## 4.6 Criteria Scoping / Selection Is Inconsistent Between Engines

### Extraction records can be carrier-level or product-level

- extraction insert sets `product_id: productId || null`:
  - `supabase/functions/extract-underwriting-criteria/index.ts:231`

### Deterministic engine only loads criteria by product IDs

- `getExtractedCriteriaMap()` query filters `.in("product_id", productIds)`:
  - `src/services/underwriting/product-evaluation.ts:121`
  - `src/services/underwriting/product-evaluation.ts:129`

Impact:
- carrier-level criteria (null `product_id`) may be ignored by deterministic recommendations

### AI analyzer collapses criteria to one record per carrier (map overwrite risk)

- criteria map initialization:
  - `supabase/functions/underwriting-ai-analyze/index.ts:571`
- map insert by carrier:
  - `supabase/functions/underwriting-ai-analyze/index.ts:604`

Impact:
- multiple criteria rows for the same carrier/product can overwrite each other (last write wins)
- product-scoped nuances may be lost

## 4.7 Guide Evidence/Citations Are Too Coarse for High-Confidence Review

### Current source excerpts are page-level only

- `SourceExcerpt` only stores `pageNumber`:
  - `src/features/underwriting/types/underwriting.types.ts:743`
- UI shows page only:
  - `src/features/underwriting/components/CriteriaReview/SourceExcerptsPanel.tsx:90`

Impact:
- reviewers cannot verify exact table cell / region
- harder to trust extracted medication/threshold rules
- weak auditability for user-facing explanations

## 4.8 UW AI Analyzer Uses Guide Excerpts But with Tight Heuristic Budgets

- guide char budget:
  - `supabase/functions/underwriting-ai-analyze/index.ts:165`
- excerpt extraction function:
  - `supabase/functions/underwriting-ai-analyze/index.ts:1252`
- criteria context prompt section:
  - `supabase/functions/underwriting-ai-analyze/index.ts:1165`

This is useful, but it is not a substitute for accurate structured extraction.

## 4.9 Training PDF Flow Already Uses a Richer Extractor (External Service)

Training import pipeline uses `/api/pdf-extract` proxy:

- endpoint config:
  - `src/features/training-modules/services/pdfModuleService.ts:25`
  - `vite.config.ts:64`
  - `vercel.json:34`
- extraction mode:
  - `src/features/training-modules/services/pdfModuleService.ts:84`
  - `src/features/training-modules/services/pdfModuleService.ts:85`

The extractor returns a structured schema (`lessons`, `tables`, `pages`) used to build modules.

This is closer to what UW needs than the current text-only UW parser.

## 4.10 Training Module Seeding Is Client-Side and Non-Transactional

The current import path inserts:

- module
- lessons
- content blocks
- quizzes
- questions
- options

sequentially from the browser:

- start of seeding:
  - `src/features/training-modules/services/pdfModuleService.ts:232`
- module create:
  - `src/features/training-modules/services/pdfModuleService.ts:241`
- lesson create:
  - `src/features/training-modules/services/pdfModuleService.ts:262`
- quiz create:
  - `src/features/training-modules/services/pdfModuleService.ts:292`

Impact:
- partial imports are possible if a later insert fails
- no transaction boundary or resumable job state

## 4.11 `My Training` Module Management Is Not Actually Super-Admin-Only in Code

Current access helper allows:

- `is_super_admin`
- admin
- roles in `STAFF_ONLY_ROLES`

See:
- `src/features/training-modules/hooks/useCanManageTraining.ts:9`
- `src/features/training-modules/hooks/useCanManageTraining.ts:19`
- `src/features/training-modules/components/learner/MyTrainingPage.tsx:33`

If the intended policy is "only me / super-admin can build modules", this should be captured as an explicit implementation decision in the upgrade plan.

## 5. What Must Be Preserved (Compatibility Constraints)

Until cutover is complete, the following contracts should stay stable:

- UW guide admin UX:
  - upload -> parse -> extract -> review/approve in existing UI
- UW wizard result UX:
  - deterministic rate table recommendations section
  - AI analysis section
  - term change triggers deterministic re-run only
- Existing `ExtractedCriteria` consumer expectations (but schema should be aligned before expansion)
- Training module import UX:
  - "Import PDF" action in Modules tab
  - create module -> navigate to builder on success
- Existing training module DTOs:
  - `CreateModuleInput`
  - `CreateLessonInput`
  - `CreateContentBlockInput`
  - `CreateQuizInput`
  - `CreateQuestionInput`
  - `CreateOptionInput`

## 6. Upgrade Strategy (High-Level)

### Recommendation

Use a shared document-ingestion pipeline with page classification + layout/OCR extraction, then branch into two downstream profiles:

- `UW profile` -> extract underwriting criteria + evidence + confidence
- `Training profile` -> generate lessons/content blocks/quizzes

### Why Shared?

- avoids duplicate parser logic
- improves accuracy for both systems
- keeps one provenance model
- reduces long-term maintenance cost

## 7. Phase Plan and TODO Tracker

Status values used in this document:

- `COMPLETED` = verified in current review
- `TODO` = not started
- `REVIEW` = approval gate/checkpoint
- `BLOCKED` = pending decision/dependency

## Phase 0. Audit Freeze + Benchmark Baseline

**Goal:** Lock down what exists today and create a measurable baseline before refactor work.

### Status
- `COMPLETED` Relevant UW and Training PDF-related code reviewed end-to-end
- `COMPLETED` Core architecture and integration points documented in this file

### TODO
- `TODO` Build benchmark PDF corpus covering:
  - text-only UW guides
  - scanned/image-heavy PDFs
  - mixed-layout pages
  - table-heavy pages
  - pages with and without images
  - medical-style docs (if in scope)
- `TODO` Define extraction accuracy scorecard (field-level)
- `TODO` Define recommendation impact scorecard (UW result agreement / false filtering checks)
- `TODO` Snapshot current outputs for representative PDFs and training imports

### Review Gate
- `REVIEW` Approve benchmark set and metrics before any parser replacement starts

## Phase 1. Contract Stabilization (Before Parser Replacement)

**Goal:** Fix current schema/scoping inconsistencies so parser improvements do not land on unstable consumers.

### TODO (UW Criteria Contract Alignment)
- `TODO` Align `ExtractedCriteria` schema across all four places:
  - `src/features/underwriting/types/underwriting.types.ts`
  - `src/features/underwriting/utils/criteriaValidation.ts`
  - `supabase/functions/extract-underwriting-criteria/index.ts`
  - `supabase/functions/underwriting-ai-analyze/criteria-evaluator.ts`
- `TODO` Expand medication restrictions support in extractor + validation to match runtime evaluator support
- `TODO` Add version metadata to criteria records (schema version / parser version / extractor version)

### TODO (Criteria Scoping and Selection)
- `TODO` Define precedence model:
  - product-specific criteria override carrier-level criteria
  - carrier-level criteria apply as fallback when product-specific absent
- `TODO` Update deterministic engine criteria loading to honor carrier fallback + product override
- `TODO` Update AI analyzer criteria mapping so multiple criteria rows do not overwrite by carrier
- `TODO` Explicitly handle multiple active criteria records (latest approved by scope/version)

### TODO (Evidence/Review Foundations)
- `TODO` Extend source evidence schema design to support region-level provenance (page + bounding box / region id)
- `TODO` Keep backward compatibility for existing `source_excerpts` while new format is introduced

### Review Gate
- `REVIEW` Run regression tests and compare current UW outputs before/after contract stabilization

## Phase 2. Shared Document Ingestion Core (Layout/OCR-Aware)

**Goal:** Replace text-only assumptions with a canonical parsed-document representation suitable for both UW and Training.

### Target Output (Canonical Parsed Document)
- `TODO` Define canonical page JSON shape (minimum):
  - page number
  - page type/classification
  - text blocks with coordinates
  - tables with cell structure + coordinates
  - image regions + metadata
  - OCR confidence
  - extraction engine provenance

### TODO (Ingestion Pipeline)
- `TODO` Add page classification step:
  - embedded text
  - scanned image
  - mixed
  - table-heavy
  - image-heavy
- `TODO` Add routed extraction by page type:
  - PDF text extraction for text pages
  - OCR/layout extractor for image/scanned/mixed pages
  - table-focused extraction for table-heavy pages
- `TODO` Preserve raw page artifacts and parsed outputs for audit/debugging
- `TODO` Add per-page caching and retry support

### TODO (Integration Safety)
- `TODO` Introduce adapter layer so existing UW and Training consumers can continue working during migration
- `TODO` Keep current admin UI actions (`Parse`, `Extract`) while backend implementation changes underneath

### Review Gate
- `REVIEW` Compare canonical parsed output vs current `parsed_content` for benchmark corpus
- `REVIEW` Do not cut over defaults until scanned/mixed/table-heavy PDFs show meaningful improvement

## Phase 3. UW Criteria Extraction v2 (High Accuracy)

**Goal:** Build a high-confidence underwriting criteria extraction pipeline on top of canonical parsed pages.

### TODO (Extraction Design)
- `TODO` Replace plain char chunking with logical section chunking (page/section/table aware)
- `TODO` Extract by field family using targeted prompts/rules:
  - age limits
  - face amount limits
  - knockout conditions
  - build/BMI rules
  - tobacco rules
  - medication restrictions
  - state availability
- `TODO` Add table-aware extraction for threshold grids and limits
- `TODO` Add conflict detection (same field, different values across pages)
- `TODO` Store field-level confidence and competing candidates

### TODO (Merge and Review Quality)
- `TODO` Replace "first found wins" merge logic with confidence + provenance-based merge strategy
- `TODO` Persist field-level evidence links (page + region + snippet)
- `TODO` Persist extraction warnings (ambiguous values, conflicts, missing sections)
- `TODO` Enhance review UI to show field-level evidence and conflicts

### TODO (Medical Accuracy for UW Inputs)
- `TODO` Ensure medication extraction supports the full meds taxonomy currently used by UW types/evaluator
- `TODO` Add explicit negation handling guidance/rules for meds/conditions if using medical-style docs later

### Review Gate
- `REVIEW` Benchmark extraction accuracy against manually labeled results before switching production default

## Phase 4. UW Wizard Integration Hardening and Explainability

**Goal:** Ensure both recommendation engines consume upgraded criteria consistently and expose trustworthy explanations.

### TODO
- `TODO` Align deterministic engine and AI analyzer criteria precedence/scoping behavior
- `TODO` Add fallback behavior for missing/partial criteria (explicit, testable)
- `TODO` Improve recommendation explanations with evidence-backed criteria references
- `TODO` Add regression tests for:
  - carrier-level criteria fallback
  - product-level overrides
  - medication restrictions
  - multi-condition conflicts
  - missing follow-up data handling

### Review Gate
- `REVIEW` Validate UW wizard outputs on known scenarios before production cutover

## Phase 5. Training Module Generation v2 (Shared Ingestion Reuse)

**Goal:** Reuse the same document-ingestion foundation to generate higher-quality training modules without duplicate parsing stacks.

### TODO (Pipeline Reuse)
- `TODO` Define a "training transform" on canonical document output (sections/tables/key points -> lessons/content blocks/quizzes)
- `TODO` Maintain compatibility with current module seeding DTOs and builder UX
- `TODO` Preserve existing `PdfExtraction` compatibility via adapter during transition

### TODO (Reliability)
- `TODO` Add preview-before-insert workflow (review generated lessons/quizzes before DB writes)
- `TODO` Move seeding from client-side sequential inserts to a backend job or transactional process
- `TODO` Add idempotency / resumable import behavior to avoid partial imports
- `TODO` Add import logs/status records for long-running module builds

### TODO (Access Control Policy)
- `TODO` Decide whether module creation/import should be:
  - super-admin only
  - current manager/admin/staff policy
  - feature-flagged by tenant/user
- `TODO` Enforce chosen policy in code/UI (current helper is broader than "super-admin only")

### Review Gate
- `REVIEW` Confirm generated modules match your builder expectations and require minimal manual cleanup

## Phase 6. Cleanup, Cutover, and Documentation

**Goal:** Remove deprecated paths safely and document the final operating model.

### TODO
- `TODO` Deprecate old UW text-only parser/extractor path after production validation
- `TODO` Remove dead merge/chunk logic and stale docs
- `TODO` Update admin runbooks for parse/extract/review flows
- `TODO` Document failure handling and retry paths for both UW and Training ingestion jobs

### Review Gate
- `REVIEW` Final cleanup approval after stable production use across at least one real cycle

## 8. Current Status Board (Rollup)

### Completed in This Planning Pass
- `COMPLETED` UW parser/extractor/review flow reviewed
- `COMPLETED` UW wizard AI + deterministic execution flow reviewed
- `COMPLETED` Rule engine v2 integration verified
- `COMPLETED` UW AI criteria filtering path reviewed
- `COMPLETED` Training PDF import + module seeding flow reviewed
- `COMPLETED` External PDF extractor dependency/proxy wiring documented
- `COMPLETED` Key risks and mismatches identified and documented

### Not Started (Implementation)
- `TODO` Contract stabilization
- `TODO` Shared ingestion core
- `TODO` UW extraction v2
- `TODO` Training import v2
- `TODO` Cutover + cleanup

### Pending Decisions
- `REVIEW` Module creation access policy (super-admin only vs broader roles)
- `REVIEW` External extractor reuse vs in-house ingestion engine over time
- `REVIEW` Whether medical records/APS PDFs are in first rollout or later phase

## 9. Recommended Implementation Order

1. Phase 1 (stabilize contracts/scoping/schema mismatches)
2. Phase 2 (shared ingestion core)
3. Phase 3 (UW criteria extraction v2)
4. Phase 4 (UW integration hardening)
5. Phase 5 (Training generation v2 on same ingestion core)
6. Phase 6 (cleanup + cutover)

### Why This Order

- Prevents parser improvements from landing on inconsistent criteria contracts
- Minimizes risk of breaking current UW wizard output
- Reuses one ingestion investment for both UW and Training
- Keeps admin UX stable during backend migration

## 10. Success Criteria (What "Done" Looks Like)

## 10.1 UW Criteria Extraction Success

- Mixed-format PDFs (different page styles, tables, images) parse with materially better field coverage
- Medication restrictions are extracted into the full supported schema
- Field-level evidence is reviewable with precise provenance
- Large guides are not silently truncated to first 3 text chunks
- Conflicting extracted values are surfaced for review instead of silently merged

## 10.2 UW Wizard Recommendation Success

- Deterministic engine and AI analyzer both honor the same criteria scoping rules
- Carrier/product criteria are applied consistently
- Recommendations include traceable evidence for important exclusions or suggestions
- No regression in rate-table recommendations and term switching UX

## 10.3 Training Module Generation Success

- Training modules can be generated from complex PDFs with cleaner lesson segmentation and table handling
- Imports are previewable and reliable (no silent partial inserts)
- Resulting module structure fits the existing builder and learner flows

## 11. Decisions / Notes for Ongoing Tracking

Use this section as the running log while executing the plan.

### Decision Log
- `PENDING` Access policy for `My Training` module creation/import
- `PENDING` Initial ingestion backend choice (reuse external extractor vs build internal first)
- `PENDING` Medical records/APS in initial scope vs UW guide-only first

### Implementation Log
- `TODO` Add first implementation PR link here
- `TODO` Record benchmark corpus location and metrics dashboard
- `TODO` Record parser/extractor versioning convention

## 12. Appendix: Key Code Anchors (for Refactor Planning)

### UW Parser / Extractor
- UW parse text extraction (`getTextContent`): `supabase/functions/parse-underwriting-guide/index.ts:216`
- UW parse content validation: `supabase/functions/parse-underwriting-guide/index.ts:349`
- UW parse save parsed JSON: `supabase/functions/parse-underwriting-guide/index.ts:284`
- UW extract chunk cap: `supabase/functions/extract-underwriting-criteria/index.ts:90`
- UW extract chunk slicing/truncation: `supabase/functions/extract-underwriting-criteria/index.ts:268`
- UW extract chunking logic: `supabase/functions/extract-underwriting-criteria/index.ts:390`
- UW extract model call: `supabase/functions/extract-underwriting-criteria/index.ts:446`
- UW extract merge logic: `supabase/functions/extract-underwriting-criteria/index.ts:591`

### UW Wizard / Rules / Criteria Consumption
- Wizard AI mutation call: `src/features/underwriting/components/UnderwritingWizard.tsx:313`
- Wizard deterministic mutation call: `src/features/underwriting/components/UnderwritingWizard.tsx:323`
- Deterministic criteria load by product IDs: `src/services/underwriting/product-evaluation.ts:121`
- Deterministic criteria application in product evaluation: `src/services/underwriting/product-evaluation.ts:512`
- Rule engine v2 approval evaluation call: `src/services/underwriting/product-evaluation.ts:535`
- Rule engine v2 adapter entry: `src/services/underwriting/ruleEngineV2Adapter.ts:174`

### UW AI Analyzer Criteria + Guide Context
- Criteria fetch/map start: `supabase/functions/underwriting-ai-analyze/index.ts:571`
- Criteria map insert (overwrite risk by carrier): `supabase/functions/underwriting-ai-analyze/index.ts:604`
- Prompt build entry: `supabase/functions/underwriting-ai-analyze/index.ts:991`
- Guide excerpt budget constants: `supabase/functions/underwriting-ai-analyze/index.ts:165`
- Guide excerpt extraction function: `supabase/functions/underwriting-ai-analyze/index.ts:1252`
- Structured criteria prompt section: `supabase/functions/underwriting-ai-analyze/index.ts:1165`

### Training PDF Import / Generation
- Training extractor endpoint: `src/features/training-modules/services/pdfModuleService.ts:25`
- Training extractor mode (`ocr_layout`): `src/features/training-modules/services/pdfModuleService.ts:84`
- Training extractor output format (`training`): `src/features/training-modules/services/pdfModuleService.ts:85`
- Training seeding entry: `src/features/training-modules/services/pdfModuleService.ts:232`
- Training module create: `src/features/training-modules/services/pdfModuleService.ts:241`
- Training lesson create: `src/features/training-modules/services/pdfModuleService.ts:262`
- Training quiz create: `src/features/training-modules/services/pdfModuleService.ts:292`
- External extractor proxy (Vite): `vite.config.ts:64`
- External extractor rewrite (Vercel): `vercel.json:34`

### Training Access Control (Current)
- Manage training access helper: `src/features/training-modules/hooks/useCanManageTraining.ts:9`
- Broader role allowance: `src/features/training-modules/hooks/useCanManageTraining.ts:19`
- Modules tab visibility uses helper: `src/features/training-modules/components/learner/MyTrainingPage.tsx:33`

