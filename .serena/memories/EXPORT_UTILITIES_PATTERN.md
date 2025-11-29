# Export Utilities Pattern

**Created**: 2025-11-29  
**Status**: ENFORCED - All export functionality must use these utilities

## The Problem (Solved)

We had **massive code duplication** for CSV/Excel/PDF export functionality across the app:

- **RecruitingDashboard**: Custom CSV conversion + custom download logic (47 lines)
- **ExpenseDashboard**: Custom CSV conversion via expenseService + custom Blob/download logic (17 lines)
- **ExpenseService**: Custom CSV conversion implementation (42 lines)

All were duplicating the same logic already centralized in `src/utils/exportHelpers.ts`.

## The Solution - Centralized Export Utilities

**Location**: `src/utils/exportHelpers.ts`

### Core Functions

#### 1. `convertToCSV(data, headers?)`
Converts array of objects to CSV string.

**Parameters**:
- `data: Record<string, any>[]` - Array of objects to convert
- `headers?: string[]` - Optional custom headers (defaults to object keys)

**Returns**: CSV string with proper escaping

**Example**:
```typescript
const data = [
  { Name: 'John', Email: 'john@example.com', Amount: 100.50 },
  { Name: 'Jane', Email: 'jane@example.com', Amount: 250.75 }
];
const csv = convertToCSV(data);
// Result: "Name,Email,Amount\nJohn,john@example.com,100.50\nJane,jane@example.com,250.75"
```

#### 2. `downloadCSV(data, filename, headers?)`
Converts data to CSV and triggers browser download.

**Parameters**:
- `data: Record<string, any>[]` - Array of objects to export
- `filename: string` - Base filename (date suffix added automatically)
- `headers?: string[]` - Optional custom headers

**Returns**: `void` (triggers download)

**Example**:
```typescript
const exportData = expenses.map(e => ({
  Date: e.date,
  Name: e.name,
  Amount: e.amount.toFixed(2),
  Category: e.category
}));

downloadCSV(exportData, 'expenses');
// Downloads: "expenses_2025-11-29.csv"
```

#### 3. `printAnalyticsToPDF(title, sections)`
Generates PDF-ready HTML and triggers browser print dialog.

**Parameters**:
- `title: string` - Report title
- `sections: { title: string; content: string }[]` - Report sections

**Returns**: `void` (opens print dialog)

**Used by**: `ReportExportService`

## How to Use - Step-by-Step

### For CSV Export

**BAD** (Duplicated Logic):
```typescript
const handleExportCSV = () => {
  const headers = ['Name', 'Email', 'Amount'];
  const rows = data.map(d => [d.name, d.email, d.amount]);
  const csvContent = 'data:text/csv;charset=utf-8,' + 
    [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\\n');
  
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `export-${new Date().toISOString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

**GOOD** (Use Utility):
```typescript
import { downloadCSV } from '@/utils/exportHelpers';

const handleExportCSV = () => {
  const exportData = data.map(d => ({
    Name: d.name,
    Email: d.email,
    Amount: d.amount.toFixed(2)
  }));
  
  downloadCSV(exportData, 'export');
};
```

### For PDF Export

**Use the centralized service:**
```typescript
import { ReportExportService } from '@/services/reports/reportExportService';

const handleExportPDF = () => {
  if (!report) return;
  ReportExportService.exportReport(report, {
    format: 'pdf',
    includeCharts: true,
    includeSummary: true,
    includeInsights: true,
  });
};
```

## Files Modified (2025-11-29)

### Fixed Files:

1. **src/features/recruiting/RecruitingDashboard.tsx**
   - **Before**: 47 lines of custom CSV export logic
   - **After**: 3 lines using `downloadCSV()`
   - **Saved**: 44 lines, eliminated duplication

2. **src/features/expenses/ExpenseDashboard.tsx**
   - **Before**: Called `expenseService.exportToCSV()` + 15 lines of custom Blob/link logic
   - **After**: 3 lines using `downloadCSV()`
   - **Saved**: 15 lines, eliminated duplication

3. **src/services/expenses/expenseService.ts**
   - **Before**: 42 lines implementing custom CSV conversion
   - **After**: Method removed entirely (no longer needed)
   - **Saved**: 42 lines, eliminated duplication

### Already Correct:

- `src/features/analytics/AnalyticsDashboard.tsx` - Uses `downloadCSV()` ✅
- `src/features/reports/ReportsPage.tsx` - Uses `ReportExportService` ✅

## Rules Going Forward

### MUST Rules:

1. **ALWAYS use `downloadCSV()` for CSV exports** - Never implement custom CSV conversion or download logic
2. **ALWAYS use `ReportExportService` for PDF/Excel reports** - Never use `printAnalyticsToPDF()` directly
3. **ALWAYS format data as array of objects with descriptive keys** - Keys become CSV headers

### NEVER Rules:

1. **NEVER create custom CSV conversion logic** - Use `convertToCSV()` or `downloadCSV()`
2. **NEVER create custom Blob/link download logic** - Use `downloadCSV()`
3. **NEVER add `exportToCSV()` methods to services** - Export logic belongs in `exportHelpers.ts`
4. **NEVER use `data:text/csv` URIs** - Use proper Blob approach in `downloadCSV()`

## Benefits of Centralization

✅ **No duplication** - Single source of truth for export logic  
✅ **Consistent behavior** - All exports work the same way  
✅ **Easy to maintain** - Fix bugs/add features in one place  
✅ **Type-safe** - TypeScript catches misuse  
✅ **Tested** - Utility functions can be unit tested  
✅ **Smaller bundle** - Less duplicate code  

## Migration Checklist

When adding new export functionality:

- [ ] Import `downloadCSV` from `@/utils/exportHelpers`
- [ ] Format data as array of objects (keys = headers)
- [ ] Call `downloadCSV(data, filename)`
- [ ] Handle errors (try/catch with toast)
- [ ] DO NOT write custom CSV conversion
- [ ] DO NOT write custom Blob/link logic

## Example: Adding Export to New Page

```typescript
// 1. Import the utility
import { downloadCSV } from '@/utils/exportHelpers';
import { showToast } from '@/utils/toast';

// 2. Create handler
const handleExport = () => {
  try {
    // 3. Format data as array of objects
    const exportData = items.map(item => ({
      'Item Name': item.name,
      'Description': item.description || '',
      'Amount': item.amount.toFixed(2),
      'Date': formatDate(item.date),
      'Status': item.status
    }));
    
    // 4. Call utility
    downloadCSV(exportData, 'items');
    
    // 5. Show success
    showToast.success('Exported successfully!');
  } catch (error) {
    showToast.error('Export failed. Please try again.');
  }
};

// 6. Add button
<Button onClick={handleExport} variant="outline">
  <Download className="h-4 w-4 mr-2" />
  Export CSV
</Button>
```

## Summary

**Location**: `src/utils/exportHelpers.ts`  
**Core Functions**: `downloadCSV()`, `convertToCSV()`, `printAnalyticsToPDF()`  
**Usage**: Import and use directly, never duplicate  
**Modified**: 2025-11-29 - Eliminated all duplicate export logic  

If you see duplicate export code anywhere, consolidate it using these utilities immediately.
