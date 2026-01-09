# Phase 6B: Build Guide Enhancements

## Continuation Prompt

Enhance the carrier build table system with CSV import, PDF parsing integration, and weight-to-rating helper messages.

---

## Context: What's Complete (Phase 6A)

### Database
- `carrier_build_tables` table with RLS policies
- Stores build data as JSON array: `[{ heightInches: 60, maxWeights: { preferredPlus: 130, preferred: 145, ... } }]`

### Code Files
- `src/features/underwriting/types/build-table.types.ts` - Types and utilities
- `src/features/underwriting/utils/buildTableLookup.ts` - Rating lookup logic
- `src/features/underwriting/hooks/useBuildTables.ts` - Query hooks
- `src/features/settings/carriers/components/BuildTableEditor.tsx` - Manual grid editor
- `src/features/underwriting/components/WizardSteps/RecommendationsStep.tsx` - Shows build ratings

### Current Behavior
- Manual grid entry of height/weight data (21 rows × 4 columns)
- Rating class lookup from build table
- Shows AI rating vs build table rating comparison in recommendations

---

## Enhancement 1: CSV Import for Bulk Data Entry

### Problem
Manual grid entry is tedious for 21 heights × 4 rating classes = 84 data points per carrier.

### Solution
Add CSV upload to BuildTableEditor.

### CSV Format
```csv
height,preferred_plus,preferred,standard_plus,standard
4'10",119,132,145,174
4'11",124,137,151,181
5'0",128,142,156,187
5'1",132,146,161,193
...
```

### Implementation

#### 1. CSV Parser Utility
Create `src/features/underwriting/utils/buildTableCsvParser.ts`:

```typescript
interface CsvParseResult {
  success: boolean;
  data?: BuildTableData;
  errors?: string[];
}

export function parseBuildTableCsv(csvContent: string): CsvParseResult {
  // Parse CSV
  // Validate headers: height, preferred_plus, preferred, standard_plus, standard
  // Convert height strings to inches (e.g., "5'10\"" → 70)
  // Validate weights are positive numbers
  // Return BuildTableData array or errors
}

export function exportBuildTableToCsv(data: BuildTableData): string {
  // Convert BuildTableData to CSV string for download
}
```

#### 2. UI Changes to BuildTableEditor
Add to `BuildTableEditor.tsx`:
- File upload input (accepts .csv)
- "Download Template" button
- "Export Current" button
- Error display for invalid CSVs

```tsx
// In BuildTableEditor.tsx header section
<div className="flex gap-2">
  <input
    type="file"
    accept=".csv"
    onChange={handleCsvUpload}
    className="hidden"
    ref={fileInputRef}
  />
  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
    <Upload className="h-3 w-3 mr-1" />
    Import CSV
  </Button>
  <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
    <Download className="h-3 w-3 mr-1" />
    Template
  </Button>
  {hasAnyData && (
    <Button variant="outline" size="sm" onClick={handleExportCsv}>
      <Download className="h-3 w-3 mr-1" />
      Export
    </Button>
  )}
</div>
```

### Files to Create/Modify
- Create: `src/features/underwriting/utils/buildTableCsvParser.ts`
- Modify: `src/features/settings/carriers/components/BuildTableEditor.tsx`

---

## Enhancement 2: Parse Build Tables from Uploaded PDF Guides

### Problem
Users already upload carrier underwriting guides as PDFs. These guides contain build tables that could be extracted automatically.

### Solution
Extend the existing guide parsing infrastructure to extract build tables.

### Current Guide Infrastructure
- `underwriting_guides` table stores uploaded PDFs
- `parse-underwriting-guide` edge function parses PDF content
- `GuideUploader.tsx` and `GuideList.tsx` manage guides

### Implementation

#### 1. Extend Edge Function
Modify `supabase/functions/parse-underwriting-guide/index.ts`:

```typescript
interface ParsedGuideContent {
  // Existing fields...
  buildTable?: {
    detected: boolean;
    data?: BuildTableRow[];
    confidence: number;
    sourcePages?: number[];
  };
}

// Add build table extraction logic
function extractBuildTable(pdfText: string): BuildTableExtraction {
  // Look for height/weight table patterns
  // Common patterns:
  //   - "Height" column followed by weight columns
  //   - "Build Chart" or "Height and Weight" section headers
  //   - Table with 4'10" to 6'6" height values
  // Use regex or AI to extract structured data
}
```

#### 2. UI for Importing Parsed Build Table
Add to GuideList.tsx or create new component:

```tsx
// When viewing a parsed guide, show option to import build table
{guide.parsed_content?.buildTable?.detected && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => handleImportBuildTable(guide)}
  >
    <Ruler className="h-3 w-3 mr-1" />
    Import Build Table
  </Button>
)}
```

#### 3. Import Flow
1. User uploads carrier guide PDF
2. Edge function parses and extracts build table (if detected)
3. Guide shows "Build table detected" indicator
4. User clicks "Import Build Table"
5. Opens BuildTableEditor pre-populated with extracted data
6. User reviews/adjusts and saves

### Files to Create/Modify
- Modify: `supabase/functions/parse-underwriting-guide/index.ts`
- Modify: `src/features/underwriting/components/GuideManager/GuideList.tsx`
- Create: `src/features/underwriting/utils/buildTableExtractor.ts` (if doing client-side regex)

### Considerations
- Build table extraction is complex; may need AI assistance
- Should show confidence score and allow manual correction
- Some carriers may not have parseable build tables in their guides

---

## Enhancement 3: Weight-to-Rating Helper Messages

### Problem
When a client's weight exceeds Preferred limits, it would be helpful to show:
- "Lose X lbs to qualify for Preferred"
- "Currently Y lbs over Standard Plus threshold"

### Solution
Add helper messages to RecommendationsStep showing weight distance to better ratings.

### Implementation

#### 1. Extend buildTableLookup.ts

Add new utility functions:

```typescript
interface WeightGuidance {
  currentRating: BuildRatingClass;
  nextBetterRating: BuildRatingClass | null;
  weightToNextRating: number | null; // lbs to lose
  currentWeightOverThreshold: number | null; // how much over the current class limit
}

export function getWeightGuidance(
  heightFeet: number,
  heightInches: number,
  weightLbs: number,
  buildTable: BuildTableData | null | undefined
): WeightGuidance | null {
  // Get current rating
  // Find next better rating class
  // Calculate weight difference to reach next class
  // Return guidance object
}
```

#### 2. Update RecommendationsStep

In `RecommendationCard`, add weight guidance display:

```tsx
// After build rating display
{buildRatingResult.hasTable && buildRatingResult.ratingClass !== "preferred_plus" && (
  <WeightGuidanceMessage
    heightFeet={clientHeight.feet}
    heightInches={clientHeight.inches}
    weight={clientWeight}
    buildTable={buildTable}
    currentRating={buildRatingResult.ratingClass}
  />
)}
```

#### 3. WeightGuidanceMessage Component

```tsx
function WeightGuidanceMessage({ ... }) {
  const guidance = getWeightGuidance(heightFeet, heightInches, weight, buildTable);

  if (!guidance || !guidance.nextBetterRating) return null;

  return (
    <div className="mt-1 text-[9px] text-zinc-500 flex items-center gap-1">
      <TrendingDown className="h-2.5 w-2.5" />
      <span>
        {guidance.weightToNextRating} lbs to reach {BUILD_RATING_CLASS_LABELS[guidance.nextBetterRating]}
      </span>
    </div>
  );
}
```

### Display Rules
- Only show if build table exists
- Only show if not already at best rating (Preferred Plus)
- Show weight to next rating class, not multiple classes ahead
- Use encouraging language ("X lbs to reach" not "X lbs overweight")

### Files to Modify
- `src/features/underwriting/utils/buildTableLookup.ts` - Add `getWeightGuidance()`
- `src/features/underwriting/components/WizardSteps/RecommendationsStep.tsx` - Add guidance display

---

## Implementation Priority

1. **Weight-to-Rating Helper Messages** (Easiest, highest value)
   - Small code changes
   - Immediately useful feedback for agents

2. **CSV Import** (Medium effort)
   - New utility + UI changes
   - Saves significant time for initial data entry

3. **PDF Parsing** (Most complex)
   - Requires edge function changes
   - Build table extraction is non-trivial
   - Consider as stretch goal

---

## Estimated Effort

| Enhancement | Effort | Files Changed |
|-------------|--------|---------------|
| Weight guidance messages | 1-2 hours | 2 files |
| CSV import/export | 2-3 hours | 2 files |
| PDF build table extraction | 4-8 hours | 3+ files |

---

## Testing Checklist

### Weight Guidance
- [ ] Shows correct weight to next rating
- [ ] Doesn't show when already at Preferred Plus
- [ ] Handles edge cases (at exact threshold)
- [ ] Only shows when build table exists

### CSV Import
- [ ] Accepts valid CSV format
- [ ] Rejects invalid CSV with clear errors
- [ ] Height string parsing (5'10" → 70 inches)
- [ ] Template download works
- [ ] Export current data works

### PDF Parsing
- [ ] Detects build tables in sample PDFs
- [ ] Extracts data with reasonable accuracy
- [ ] Shows confidence score
- [ ] Allows manual correction after import
- [ ] Handles guides without build tables gracefully

---

## Do NOT

- Overcomplicate the CSV format (keep it simple)
- Auto-save parsed PDF data without user review
- Show weight guidance in a judgmental way
- Break existing manual entry functionality
