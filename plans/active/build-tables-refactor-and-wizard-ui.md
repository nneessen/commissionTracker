# Build Tables Refactor & Underwriting Wizard UI Relocation

## Continuation Prompt

Refactor the build table system to support product-level tables (not just carrier-level), add BMI table support, explore PDF extraction for build data, and relocate the Underwriting Wizard button from the Policies page to the Sidebar footer.

---

## Context: Current State

### Build Table Architecture (NEEDS REFACTORING)
- `carrier_build_tables` table stores build data at the **carrier level**
- Schema: `id, carrier_id, build_data (JSON), notes, created_at, updated_at`
- Problem: Some carriers like Mutual of Omaha have **different build charts per product**
- Problem: Some carriers use **BMI tables** instead of height/weight charts

### Current Files
- `supabase/migrations/20260110_002_carrier_build_tables.sql` - Current schema
- `src/features/underwriting/types/build-table.types.ts` - Types
- `src/features/underwriting/utils/buildTableLookup.ts` - Rating lookup logic
- `src/features/underwriting/hooks/useBuildTables.ts` - Query hooks
- `src/features/settings/carriers/components/BuildTableEditor.tsx` - Editor UI
- `src/features/underwriting/utils/buildTableCsvParser.ts` - CSV import/export

### Underwriting Wizard Button Location
- Currently in: `src/features/policies/PolicyList.tsx` (with star icon)
- Goal: Move to Sidebar footer, near logout/theme buttons
- Sidebar file: `src/components/layout/Sidebar.tsx`

---

## Part 1: Build Table Architecture Refactor

### New Requirements
1. **Product-level build tables** - Each product can have its own build table
2. **BMI table support** - Alternative to height/weight (single BMI value per rating class)
3. **Carrier fallback** - If product has no table, fall back to carrier-level table
4. **Table type field** - Distinguish between "height_weight" and "bmi" tables

### Proposed Schema Change

```sql
-- Migration: product_build_tables.sql

-- Add table_type to existing carrier_build_tables
ALTER TABLE carrier_build_tables
ADD COLUMN table_type TEXT NOT NULL DEFAULT 'height_weight'
CHECK (table_type IN ('height_weight', 'bmi'));

-- Create product-level build tables
CREATE TABLE product_build_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  table_type TEXT NOT NULL DEFAULT 'height_weight' CHECK (table_type IN ('height_weight', 'bmi')),
  build_data JSONB NOT NULL, -- Same format as carrier_build_tables for height_weight
  bmi_data JSONB, -- For BMI tables: { preferredPlus: 25, preferred: 28, standardPlus: 32, standard: 38 }
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id)
);

-- RLS policies for product_build_tables (copy pattern from carrier_build_tables)
```

### BMI Data Structure
```typescript
interface BmiTableData {
  preferredPlus?: number;  // Max BMI for Preferred Plus
  preferred?: number;      // Max BMI for Preferred
  standardPlus?: number;   // Max BMI for Standard Plus
  standard?: number;       // Max BMI for Standard
}
```

### Lookup Priority
1. Check for product-level build table first
2. If not found, fall back to carrier-level build table
3. Handle both height/weight and BMI table types

### Files to Create/Modify
- Create: `supabase/migrations/YYYYMMDD_NNN_product_build_tables.sql`
- Modify: `src/features/underwriting/types/build-table.types.ts` - Add BMI types
- Modify: `src/features/underwriting/utils/buildTableLookup.ts` - Add BMI lookup, product fallback
- Modify: `src/features/underwriting/hooks/useBuildTables.ts` - Add product hooks
- Create: `src/features/settings/products/components/ProductBuildTableEditor.tsx`
- Modify: Product settings UI to include build table editor

---

## Part 2: PDF Build Table Extraction (Research/Stretch Goal)

### Approach Options

**Option A: Extend existing edge function**
- `supabase/functions/parse-underwriting-guide/index.ts` already parses PDFs
- Add build table detection and extraction logic
- Use regex patterns to find height/weight tables
- Return structured data for manual review

**Option B: Dedicated AI extraction**
- Create new edge function `extract-build-table`
- Use Claude/GPT to analyze PDF pages with tables
- Higher accuracy but more expensive per call

### Implementation Notes
- Build tables in PDFs often have headers like "Height", "Weight", "Build Chart"
- Common patterns: 4'10" to 6'6" height range, weight columns per rating class
- Should extract with confidence score
- Always require manual review before saving

### Files to Modify (if implementing)
- `supabase/functions/parse-underwriting-guide/index.ts`
- Add UI in GuideList.tsx to show "Build table detected" and import option

---

## Part 3: Underwriting Wizard Button Relocation

### Current Location (REMOVE)
- File: `src/features/policies/PolicyList.tsx`
- Has star icon (Sparkles from lucide-react)

### New Location: Sidebar Footer
- File: `src/components/layout/Sidebar.tsx`
- Place near logout button, above theme toggle
- Use professional icon (not star) - suggestions:
  - `FileSearch` - Document search/analysis
  - `ClipboardCheck` - Checklist/verification
  - `ShieldCheck` - Protection/underwriting
  - `Stethoscope` - Health evaluation (if available)

### Sidebar Footer Redesign Concept
```
┌─────────────────────────────┐
│  [UW Wizard]  [Settings]    │  <- Action buttons row
│  ─────────────────────────  │
│  [User Avatar] Agent Name   │  <- User info
│  [Logout]      [Theme]      │  <- Utility buttons
└─────────────────────────────┘
```

Or simpler:
```
┌─────────────────────────────┐
│  UW Wizard                  │  <- Full-width button
│  ─────────────────────────  │
│  [Logout]  [Theme]          │
└─────────────────────────────┘
```

### Implementation
1. Remove wizard button from PolicyList.tsx
2. Add to Sidebar footer section
3. Use `useNavigate` to route to `/underwriting/wizard`
4. Style to match existing sidebar footer aesthetic

---

## Implementation Order

### Phase 1: UI Relocation (Quick Win)
1. Remove wizard button from PolicyList.tsx
2. Redesign Sidebar footer to include UW Wizard button
3. Test navigation works correctly

### Phase 2: Build Table Architecture
1. Create migration for product_build_tables
2. Add table_type to carrier_build_tables
3. Update types and lookup logic
4. Create ProductBuildTableEditor component
5. Update hooks for product-level queries
6. Add UI in product settings

### Phase 3: BMI Support
1. Add BMI calculation utility (height/weight -> BMI)
2. Add BMI lookup function
3. Update RecommendationsStep to handle both types
4. Add BMI table editor UI

### Phase 4: PDF Extraction (Optional/Stretch)
1. Research PDF table extraction approaches
2. Prototype in edge function
3. Add UI for import with review

---

## Testing Checklist

### UI Relocation
- [x] Wizard button removed from Policies page
- [x] Wizard button appears in Sidebar footer
- [x] Navigation to /underwriting/wizard works
- [x] Button styling matches Sidebar theme (blue accent)
- [ ] Mobile/collapsed sidebar handles button correctly (needs testing)

### Build Table Refactor
- [x] Migration created for product_build_tables and BMI support
- [x] Types updated for product tables and BMI
- [x] Lookup functions support BMI tables
- [x] Hooks support product-level queries with carrier fallback
- [ ] Product-level tables save/load correctly (needs DB migration applied)
- [ ] Carrier fallback works when product has no table (needs testing)
- [ ] Existing carrier tables still work (needs testing)
- [ ] BMI tables calculate ratings correctly (logic complete, needs testing)
- [ ] Editor UI supports both table types (ProductBuildTableEditor not yet created)

---

## Progress Summary (Updated 2026-01-09)

### Completed
1. **Phase 1: UI Relocation** - COMPLETE
   - Removed UW Wizard button from PolicyList.tsx
   - Added to Sidebar footer with ShieldCheck icon
   - Blue accent styling matches design system

2. **Phase 2: Core Infrastructure** - COMPLETE
   - Created migration: `20260110_004_product_build_tables.sql`
     - Adds `table_type` and `bmi_data` columns to carrier_build_tables
     - Creates new `product_build_tables` table with RLS policies
   - Updated `build-table.types.ts`:
     - Added `BuildTableType`, `BmiTableData` types
     - Added `ProductBuildTableRow`, `BuildTableWithProduct` types
     - Added `BuildTableLookupContext` for unified lookups
     - Added utility functions for BMI data parsing
   - Updated `buildTableLookup.ts`:
     - Added `lookupBmiRating()` for BMI-based lookups
     - Added `lookupBuildRatingUnified()` for type-aware lookups
     - Added `getBmiGuidance()` for weight loss recommendations
   - Updated `useBuildTables.ts`:
     - Added product build table hooks (`useProductBuildTable`, `useProductBuildTables`)
     - Added mutation hooks (`useUpsertProductBuildTable`, `useDeleteProductBuildTable`)
     - Added `useBuildTableForProduct()` for unified lookup with fallback

### Remaining Work
1. **Apply Migration** - Run migration in Supabase to create tables
2. **Regenerate Types** - `npx supabase gen types typescript` after migration
3. **ProductBuildTableEditor Component** - Create UI for editing product-level tables
4. **Update BuildTableEditor** - Add BMI table type selector and BMI input fields
5. **Integration Testing** - Test product fallback, BMI calculations

---

## Do NOT

- Break existing carrier-level build table functionality
- Auto-import PDF data without user review
- Use overly decorative icons (keep professional)
- Add build table UI complexity if not needed for current carriers
