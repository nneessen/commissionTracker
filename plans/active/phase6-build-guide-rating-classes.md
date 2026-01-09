# Phase 6: Build Guide Integration for Rating Class Determination

## Continuation Prompt

Continue developing the Underwriting Wizard by integrating carrier-specific build (height/weight) guides that determine rating classes. This builds on Phase 5's product constraint filtering.

---

## Context: What's Complete

### Phase 5 (Just Completed)
- `RecommendationsStep.tsx` now filters products by underwriting constraints
- Eligibility checking via `eligibilityChecker.ts` handles:
  - Age-tiered face amount limits
  - Knockout conditions (disqualifying health conditions)
  - Full underwriting threshold flags
- Product constraints stored in `products.metadata` as `ProductUnderwritingConstraints`
- UI shows eligible/ineligible products with reasons

### Existing Wizard Data Collection
The wizard already collects build data in `ClientInfo`:
```typescript
interface ClientInfo {
  heightFeet: number;
  heightInches: number;
  weight: number;
  age: number;
  gender: "male" | "female" | "other" | "";
  // ...
}
```

BMI is calculated via `calculateBMI(heightFeet, heightInches, weight)` in `bmiCalculator.ts`.

### Current AI Analysis Flow
1. Wizard collects client info, health conditions, coverage request
2. On "Review" step, calls AI edge function (`underwriting-ai-analyze`)
3. AI returns `AIAnalysisResult` with `healthTier` and `recommendations`
4. `RecommendationsStep` applies constraint filtering to recommendations

---

## The Problem

Currently, rating class determination relies solely on AI interpretation. However:

1. **Carriers have specific build tables** - Each carrier has published height/weight charts that map to rating classes (Preferred Plus, Preferred, Standard Plus, Standard, Table ratings)

2. **Build tables vary by carrier** - American Home Life may rate a 5'10" 200lb male as Standard, while Mutual of Omaha rates them Preferred

3. **Tables often vary by**:
   - Gender (male vs female tables)
   - Age bands (some carriers have different tables for 18-49, 50-65, 65+)
   - Product type (term vs whole life may have different tolerances)
   - Tobacco status (smoker tables are more restrictive)

4. **American Home Life exception** - No build guide available; fall back to AI/general logic

---

## Requirements

### 1. Build Guide Data Model

Design a schema to store carrier-specific build tables that map:
- Height + Weight + Gender + (optional: age band, tobacco status)
- → Rating Class (preferred_plus, preferred, standard_plus, standard, table_A through table_P, decline)

Consider:
- Should this be a new table or stored in carrier/product metadata?
- How to handle carriers with multiple tables (by age, by product)?
- How to handle table ratings (Table A = +25%, Table B = +50%, etc.)?

### 2. Build Guide Management UI

Where should admins upload/manage build tables?
- Option A: Per-carrier in Settings > Carriers
- Option B: Per-product in Settings > Products
- Option C: Dedicated "Underwriting Guides" section (already exists for parsed PDF guides)

### 3. Rating Class Determination Logic

Create utility that:
- Takes client build (height, weight, gender, age, tobacco)
- Takes carrier/product ID
- Returns the rating class per that carrier's build table
- Falls back gracefully if no build table exists

### 4. Integration with RecommendationsStep

Enhance recommendations to show:
- Expected rating class based on build table (not just AI guess)
- Comparison: "AI suggests Preferred, Build Table indicates Standard Plus"
- Flag discrepancies for agent review

### 5. Integration with AI Analysis

Option A: Pre-filter before AI call
- Calculate build-based rating classes for each carrier
- Pass to AI as context so it can factor in

Option B: Post-process AI results
- AI returns recommendations
- Overlay build table ratings on top
- Adjust/flag where they differ

---

## Key Files to Reference

| File | Purpose |
|------|---------|
| `src/features/underwriting/types/product-constraints.types.ts` | Existing constraint types |
| `src/features/underwriting/utils/eligibilityChecker.ts` | Constraint checking logic |
| `src/features/underwriting/utils/bmiCalculator.ts` | BMI calculation |
| `src/features/underwriting/components/WizardSteps/RecommendationsStep.tsx` | Results display |
| `src/features/underwriting/hooks/useProductConstraints.ts` | Fetching product constraints |
| `supabase/functions/underwriting-ai-analyze/` | AI analysis edge function |

---

## Questions to Resolve in Planning

1. **Data structure**: New table `carrier_build_tables` or extend product metadata?

2. **Granularity**: Per-carrier or per-product build tables?

3. **Input format**: How will admins enter build data?
   - Manual entry (height/weight grid)
   - CSV upload
   - Parsed from uploaded PDF guides (existing infrastructure)

4. **Rating class taxonomy**: Standardize across carriers?
   ```typescript
   type RatingClass =
     | "preferred_plus" | "preferred" | "standard_plus" | "standard"
     | "table_a" | "table_b" | "table_c" | "table_d" // ... through table_p
     | "decline";
   ```

5. **Edge cases**:
   - What if height/weight falls between table rows?
   - What if carrier has no build table (American Home Life)?
   - What if build table and AI disagree significantly?

---

## Suggested Approach

### Phase 6A: Data Model & Storage
- Design `carrier_build_tables` schema or extend metadata
- Create migration
- Define TypeScript types

### Phase 6B: Build Table Management UI
- Admin interface to view/edit build tables
- Consider CSV import for bulk entry

### Phase 6C: Rating Class Calculation
- Utility function to look up rating class from build table
- Handle interpolation/rounding for between-row values
- Fallback logic for missing tables

### Phase 6D: Integration
- Update `RecommendationsStep` to show build-table rating class
- Optionally feed into AI analysis for better accuracy

---

## Do NOT

- Over-engineer the data model for hypothetical future needs
- Build a full PDF parsing system (use existing guide infrastructure if possible)
- Create separate rating taxonomies per carrier (standardize)
- Forget that American Home Life has no build guide

---

## Start By

1. Research: Check if any build table data already exists in the codebase
2. Design the data model (propose options)
3. Get user input on granularity and input method preferences
4. Plan implementation phases
