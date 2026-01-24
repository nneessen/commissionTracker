# Build Chart Editor Architecture & UI Components

## Overview
Build chart editors manage carrier-specific height/weight and BMI charts used for underwriting. Charts define acceptable weight ranges for different rating classes at specific heights.

## 1. File Locations

### Primary UI Components
- **Carrier Level Editor**: `/src/features/settings/carriers/components/BuildTableEditor.tsx` (aka `BuildChartsManager`)
  - Full build chart creation/editing/deletion UI
  - CSV import/export functionality
  - Supports both height/weight and BMI chart types
  
- **Product Level Selector**: `/src/features/settings/products/components/ProductBuildTableEditor.tsx` (aka `ProductBuildChartSelector`)
  - Simple dropdown for products to select which carrier's chart to use
  - Shows default chart option + all available charts for selected carrier

### Type Definitions
- `/src/features/underwriting/types/build-table.types.ts`
  - All core data structures
  - Rating class definitions
  - Height display utilities
  - Constants (ALL_RATING_CLASSES, rating class labels, etc.)

### Data Services
- `/src/services/settings/carriers/BuildChartService.ts`
  - CRUD operations: create, read, update, delete
  - Default chart management
  - Product reference checking (prevent deletion if products use chart)

### Hooks (TanStack Query)
- `/src/features/settings/carriers/hooks/useCarrierBuildCharts.ts`
  - Fetch all build charts for a carrier (full display data)
  
- `/src/features/settings/carriers/hooks/useBuildChartOptions.ts`
  - Fetch minimal chart options for product selector dropdowns

### Utilities
- `/src/features/underwriting/utils/buildTableCsvParser.ts`
  - CSV import/export logic
  - Height parsing (supports: 5'10", 5-10, 5'10, pure inches)
  - CSV template generation

---

## 2. Rating Classes Available in Editor UI

Defined in `ALL_RATING_CLASSES` constant:

```typescript
export const ALL_RATING_CLASSES = [
  { key: "preferredPlus", label: "Preferred Plus", shortLabel: "Pref+" },
  { key: "preferred", label: "Preferred", shortLabel: "Preferred" },
  { key: "standardPlus", label: "Standard Plus", shortLabel: "Std+" },
  { key: "standard", label: "Standard", shortLabel: "Standard" },
] as const;
```

**Usage in Editor:**
- Rendered as checkboxes for user selection in `BuildChartsManager`
- User selects which rating classes to configure in the chart
- Only selected classes appear as columns in the weight/BMI grids
- Only selected classes' data is saved to database

---

## 3. Data Structures for Build Tables

### Height/Weight Chart (`height_weight`)

```typescript
interface BuildTableRow {
  heightInches: number;
  weightRanges: BuildTableWeightRanges;  // Per rating class
}

interface WeightRange {
  min?: number;  // Minimum weight in lbs
  max?: number;  // Maximum weight in lbs
}

interface BuildTableWeightRanges {
  preferredPlus?: WeightRange;
  preferred?: WeightRange;
  standardPlus?: WeightRange;
  standard?: WeightRange;
}

type BuildTableData = BuildTableRow[];
```

**Example Structure:**
```json
[
  {
    "heightInches": 70,
    "weightRanges": {
      "preferredPlus": { "min": 150, "max": 180 },
      "preferred": { "min": 145, "max": 195 },
      "standard": { "min": 140, "max": 210 }
    }
  },
  {
    "heightInches": 71,
    "weightRanges": {
      "preferredPlus": { "min": 155, "max": 190 }
    }
  }
]
```

### BMI Chart (`bmi`)

```typescript
interface BmiRange {
  min?: number;
  max?: number;
}

interface BmiTableData {
  preferredPlus?: BmiRange;
  preferred?: BmiRange;
  standardPlus?: BmiRange;
  standard?: BmiRange;
}
```

**Example Structure:**
```json
{
  "preferredPlus": { "min": 18.0, "max": 24.9 },
  "preferred": { "min": 18.0, "max": 27.0 },
  "standard": { "min": 18.0, "max": 30.0 }
}
```

---

## 4. How Rows Are Created/Edited

### Height/Weight Grid Creation
1. **Initial Empty Table** (line 219-224 of build-table.types.ts):
   - `createEmptyBuildTable()` generates ALL possible heights (54-86 inches / 4'6" to 7'2")
   - Each height starts with empty `weightRanges: {}`
   - User selects which rating classes to configure
   - Only selected classes show as columns

2. **User Edits Weight Values** (line 168-199 of BuildTableEditor.tsx):
   - `handleWeightChange()` called when user types in input field
   - Updates state: `buildData` is mapped to find matching height row
   - Weight range created/updated with min/max values
   - Empty ranges (both min & max undefined) are removed

3. **CSV Import** (buildTableCsvParser.ts):
   - Parses CSV file with height column + weight columns per rating class
   - Height parsing supports: "5'10"", "5-10", "5'10", or pure inches
   - Maps CSV columns to rating class keys automatically
   - Normalizes headers (pref+, pref_plus, preferredplus all → preferredPlus)
   - Imports weight values as max-only (min values can be edited after)
   - Deduplicates heights (uses later value if duplicate found)

### BMI Table Creation
1. **Initial Empty Table** (line 240-247 of build-table.types.ts):
   - One row per selected rating class
   - User enters min/max BMI values directly

2. **User Edits BMI Values** (line 202-224 of BuildTableEditor.tsx):
   - `handleBmiChange()` updates state for selected rating class
   - Similar pattern to weight ranges: undefined values removed

### Row Filtering on Save (line 334-357 of BuildTableEditor.tsx):
```typescript
// Filter to only selected rating classes
const filteredBuildData = buildData
  .map((row) => {
    // Keep only weight ranges for selected classes
    const filteredRanges = {};
    for (const classKey of selectedClasses) {
      const range = row.weightRanges[classKey];
      if (range !== undefined) {
        filteredRanges[classKey] = range;
      }
    }
    return { ...row, weightRanges: filteredRanges };
  })
  .filter((row) => Object.keys(row.weightRanges).length > 0);
```

---

## 5. UI Component Architecture

### BuildChartsManager (Carrier Level)

**States:**
- `charts`: List of all build charts for carrier (from useCarrierBuildCharts hook)
- `editingChart`: Null (list view) or BuildChartDisplay (edit view)
- `isCreating`: Boolean (new chart vs edit existing)
- `chartName`: String
- `tableType`: "height_weight" | "bmi"
- `buildData`: BuildTableData (array of height rows)
- `bmiData`: BmiTableData (object of rating class ranges)
- `selectedClasses`: Set<RatingClassKey> (which classes to configure)
- `csvErrors`: Array of parse/validation errors

**Two Rendering Modes:**

1. **List View** (lines 415-581):
   - Shows all charts for carrier
   - Edit, Delete, Set Default buttons per chart
   - Add new chart button

2. **Editor View** (lines 584-963):
   - Chart name input
   - Table type selector (height_weight / bmi)
   - Rating class checkboxes
   - CSV import/export buttons (height_weight only)
   - Height/Weight grid (if height_weight selected)
     - Rows = all heights (4'6" to 7'2")
     - Columns = Height + (2 columns per selected class: Min/Max weight)
     - Inline number inputs per cell
   - BMI grid (if bmi selected)
     - Rows = selected rating classes
     - Columns = Rating Class, Min BMI, Max BMI
   - Notes textarea
   - Save/Cancel buttons

**Height/Weight Grid Details** (lines 810-916):
```
Header Row 1:
  [Height] | [Pref+] | [Preferred] | [Std+] | [Standard] |
Header Row 2:
  [Height] | Min Max | Min Max     | Min Max| Min Max    |

Data Rows (per height 4'6" to 7'2"):
  [5'0"] | [---] [---] | [---] [---] | ... (inputs for each class)
  [5'1"] | [---] [---] | [---] [---] | ...
  ... (33 total rows)
```

---

## 6. CSV Import/Export Format

### CSV Format (buildTableCsvParser.ts)

**Header Row:**
```
height,preferred_plus,preferred,standard_plus,standard
```

**Data Rows:**
```
5'0",119,132,145,174
5'1",124,137,151,181
5'2",129,142,157,188
```

**Import Features:**
- Height column required, others optional (but at least one weight column must exist)
- Flexible height format parsing
- Warns on duplicate heights (uses later value)
- Validates weight values (0-999)
- Returns warnings for skipped rows

**Export Features:**
- Only exports max values (min values stay in UI only for now)
- Only exports selected rating classes
- Can generate empty template for manual entry

---

## 7. Data Flow: Create/Edit/Save

### Creating New Chart

1. User clicks "Add Chart" → `setIsCreating(true)` (editor view)
2. Fills: name, type, selects rating classes, enters data
3. Clicks Save → `createMutation.mutateAsync()` calls `CreateBuildChart` hook
4. Hook sends to Supabase via `BuildChartService.createBuildChart()`
5. Service:
   - If `isDefault=true`, unsets other defaults first
   - Inserts with: carrier_id, imo_id, name, table_type, build_data (JSON), bmi_data (JSON), notes, is_default
   - Returns created chart
6. Query cache invalidated → list re-fetches
7. Editor reset, list view shown again

### Editing Existing Chart

1. User clicks "Edit" on a chart → loads chart data into state (useEffect at line 144)
2. Modifies data
3. Clicks "Update Chart" → `updateMutation.mutateAsync()`
4. Service updates by id, handles default logic
5. Cache invalidated, list refreshes

### Deleting Chart

1. User clicks Delete → confirmation dialog
2. Confirms → `deleteMutation.mutateAsync()`
3. Service checks if any products reference this chart
4. If yes → error thrown, prevents deletion with message listing products
5. If no → deletes from database

---

## 8. Key Constraints & Validations

- **Min Height**: 54 inches (4'6")
- **Max Height**: 86 inches (7'2")
- **Weight Range**: 0-500 lbs
- **BMI Range**: 0-100
- **At least one rating class must be selected** before save
- **Chart name must not be empty**
- **Cannot delete chart** if products reference it
- **Only one default chart** per carrier (auto-enforced)
- **CSV rows with no weight values are skipped** with warning
- **Duplicate heights in CSV** → later value wins

---

## 9. Integration Points

### Product Assignment
- When creating/editing a product, user selects carrier first
- `ProductBuildChartSelector` loads available charts for that carrier via `useBuildChartOptions()`
- Product stores `build_chart_id` in database
- Product uses that chart for underwriting lookups

### Underwriting Usage
- Charts referenced in underwriting wizard to determine rating class
- `buildTableLookup.ts` performs height/weight → rating class lookups
- BMI calculations use both height/weight and BMI tables as available

---

## 10. Constants & Mappings

**Rating Class Mapping**
```typescript
// UI Keys (camelCase)
"preferredPlus", "preferred", "standardPlus", "standard"

// Database/DB Keys (snake_case)
"preferred_plus", "preferred", "standard_plus", "standard"

// CSV Column Names (snake_case)
"preferred_plus", "preferred", "standard_plus", "standard"
```

**Height Range**
- Min: 54" (4'6")
- Max: 86" (7'2")
- Total: 33 rows in height/weight table

**Build Table Types**
- `height_weight`: Traditional height-indexed table
- `bmi`: BMI-based table (BMI only, no height)

