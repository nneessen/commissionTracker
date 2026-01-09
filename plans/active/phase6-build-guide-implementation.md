# Phase 6: Build Guide Implementation Plan

## Decisions Made

- **Granularity**: Per-carrier (one build table per carrier, shared across all products)
- **Input Method**: Manual grid entry
- **Gender Variation**: No (unisex tables)
- **Tobacco Variation**: No (same tables for all)

---

## Data Model

### New Table: `carrier_build_tables`

```sql
CREATE TABLE carrier_build_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,

  -- Height in inches (e.g., 60 = 5'0", 72 = 6'0")
  -- Each row stores max weight for each rating class at that height
  build_data JSONB NOT NULL DEFAULT '[]',

  -- Optional notes about this table
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One build table per carrier per IMO
  UNIQUE(carrier_id, imo_id)
);
```

### Build Data JSON Structure

```typescript
interface BuildTableRow {
  heightInches: number;      // 58, 59, 60, ... 78
  maxWeights: {
    preferredPlus?: number;  // Max weight for Preferred Plus
    preferred?: number;       // Max weight for Preferred
    standardPlus?: number;    // Max weight for Standard Plus
    standard?: number;        // Max weight for Standard
    // Anything above standard goes to table ratings or decline
  };
}

// Example build_data for a carrier:
[
  { heightInches: 60, maxWeights: { preferredPlus: 130, preferred: 145, standardPlus: 160, standard: 180 } },
  { heightInches: 61, maxWeights: { preferredPlus: 135, preferred: 150, standardPlus: 165, standard: 185 } },
  { heightInches: 62, maxWeights: { preferredPlus: 140, preferred: 155, standardPlus: 170, standard: 190 } },
  // ... up to 78 inches (6'6")
]
```

---

## Rating Class Determination Logic

```typescript
function getBuildRatingClass(
  heightInches: number,
  weightLbs: number,
  buildTable: BuildTableRow[]
): RatingClass {
  // Find the row for this height (or nearest if between rows)
  const row = findRowForHeight(heightInches, buildTable);
  if (!row) return 'unknown';

  const { maxWeights } = row;

  // Check from best to worst rating class
  if (maxWeights.preferredPlus && weightLbs <= maxWeights.preferredPlus) {
    return 'preferred_plus';
  }
  if (maxWeights.preferred && weightLbs <= maxWeights.preferred) {
    return 'preferred';
  }
  if (maxWeights.standardPlus && weightLbs <= maxWeights.standardPlus) {
    return 'standard_plus';
  }
  if (maxWeights.standard && weightLbs <= maxWeights.standard) {
    return 'standard';
  }

  // Above standard = substandard/table rated
  return 'table_rated';
}
```

---

## UI Components

### Build Table Editor (Settings > Carriers)

Located in the Carriers settings tab. Each carrier card will have an "Edit Build Table" action.

**Build Table Editor Grid**:
- Rows: Heights from 4'10" (58") to 6'6" (78")
- Columns: Preferred Plus, Preferred, Standard Plus, Standard
- Editable number inputs
- Bulk actions: Clear all, Copy from another carrier

---

## Integration Points

### 1. RecommendationsStep Enhancement

Show build-based rating for each recommended carrier:

```
Mutual of Omaha - Whole Life
├── AI Rating: Preferred (85% confidence)
├── Build Table: Standard Plus (based on 5'10" 195lbs)
└── ⚠️ Build table is stricter than AI estimate
```

### 2. Eligibility Checker Extension

Add optional build-based rating to ProductEligibilityResult:
- `buildBasedRating`: The rating class from build table lookup
- `buildTableExists`: Whether carrier has a build table configured

---

## File Changes

### New Files
- `supabase/migrations/20260109_XXX_carrier_build_tables.sql`
- `src/features/underwriting/types/build-table.types.ts`
- `src/features/underwriting/utils/buildTableLookup.ts`
- `src/features/underwriting/hooks/useBuildTables.ts`
- `src/features/settings/carriers/components/BuildTableEditor.tsx`

### Modified Files
- `src/types/database.types.ts` (regenerated)
- `src/features/underwriting/components/WizardSteps/RecommendationsStep.tsx`

---

## Implementation Order

1. **Database Migration** - Create table, RLS policies
2. **TypeScript Types** - Define BuildTableRow, related types
3. **Build Table Lookup** - Utility for height/weight → rating class
4. **TanStack Query Hooks** - useBuildTables, useUpdateBuildTable
5. **Build Table Editor UI** - Settings component for manual entry
6. **RecommendationsStep Integration** - Show build-based ratings

---

## Edge Cases

1. **Height not in table**: Interpolate or use nearest row
2. **Weight exactly at boundary**: Include in better class (<=, not <)
3. **No build table for carrier**: Show "No build table configured"
4. **American Home Life**: Known to have no build table, skip gracefully

---

## Notes

- Build tables are typically published per-carrier in their underwriting guides
- Heights typically range from 4'10" to 6'6" in 1-inch increments (21 rows)
- This feature replaces guesswork with deterministic carrier-specific data
