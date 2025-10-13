# REDESIGN: Unified Commission Management Spreadsheet

**Status**: ACTIVE
**Date**: 2025-10-05
**Priority**: HIGH
**Replaces**: Previous multi-tab design (Carriers, Products, Commission Rates)

---

## 🎯 Design Philosophy

**ONE VIEW, ONE GRID, ALL DATA**

Instead of 3 separate tabs, build a **single Excel-like spreadsheet** where users can:
- See all carriers, products, and commission rates in one table
- Edit ANY cell inline (carrier name, product name, commission rates)
- Add new rows for carriers/products
- Filter, search, sort instantly
- Auto-save changes

---

## 📐 New Interface Design

### Single Tab: "Commission Management"

**Table Structure:**
```
┌────────────────┬──────────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────────┐
│ Carrier        │ Product      │ 80  │ 85  │ 90  │ 95  │ 100 │ 105 │ 110 │ 115 │ 120 │ 125 │ 130 │ 135 │ 140 │ 145 │ Actions │
├────────────────┼──────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────────┤
│ 📝 UHL         │ 📝 Express WL│ 70% │ 75% │ 80% │ 85% │ 90% │ 95% │100% │105% │110% │115% │120% │125% │130% │135% │ 🗑️     │
│ 📝 SBLI        │ 📝 Silver FE │ 60% │ 65% │ 70% │ 75% │ 80% │ 85% │ 90% │ 95% │100% │105% │110% │115% │120% │125% │ 🗑️     │
│ ...            │ ...          │ ... │ ... │ ... │ ... │ ... │ ... │ ... │ ... │ ... │ ... │ ... │ ... │ ... │ ... │ ...     │
└────────────────┴──────────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────────┘
```

📝 = Click to edit inline
🗑️ = Delete row

---

## 🔧 Features

### Core Functionality
1. **Inline Editing**
   - Click any cell to edit
   - Tab to next cell
   - Auto-save on blur (debounced 500ms)
   - Visual feedback (highlight edited cell)

2. **Add New Row**
   - "+ Add Product" button at top
   - Inserts editable row
   - Select carrier (dropdown or type new)
   - Type product name
   - Fill commission rates
   - Auto-creates carrier if new

3. **Filter & Search**
   - Search box: filters by carrier or product name
   - Carrier filter dropdown
   - "Show incomplete only" toggle (rows missing any of 14 rates)

4. **Sorting**
   - Click column header to sort
   - Carrier (A-Z)
   - Product (A-Z)
   - Any commission level (low-high, high-low)

5. **Bulk Operations**
   - Select multiple rows (checkbox)
   - Actions: Delete, Copy rates, Apply % change

6. **Visual Indicators**
   - 🔴 Red cell = missing rate (null/undefined)
   - 🟡 Yellow fade = recently edited (3sec)
   - ✅ Green check = complete row (all 14 rates filled)

---

## 🗂️ Data Model

**Single Query:**
```sql
SELECT
  c.id as carrier_id,
  c.name as carrier_name,
  p.id as product_id,
  p.name as product_name,
  p.product_type,
  json_object_agg(cg.contract_level, cg.commission_percentage) as rates
FROM carriers c
LEFT JOIN products p ON p.carrier_id = c.id
LEFT JOIN comp_guide cg ON cg.product_id = p.id
GROUP BY c.id, c.name, p.id, p.name, p.product_type
ORDER BY c.name, p.name;
```

**Frontend Structure:**
```typescript
interface CommissionRow {
  carrierId: string;
  carrierName: string;
  productId: string;
  productName: string;
  productType: ProductType;
  rates: {
    80: number | null;
    85: number | null;
    // ... 90-145
    145: number | null;
  };
}
```

---

## 🎨 Component Architecture

### Single Component: `CommissionManagement.tsx`

```typescript
// State
const [data, setData] = useState<CommissionRow[]>([]);
const [editingCell, setEditingCell] = useState<{rowId: string, field: string} | null>(null);
const [searchTerm, setSearchTerm] = useState('');
const [carrierFilter, setCarrierFilter] = useState('');

// Inline edit handlers
const handleCellClick = (rowId, field) => setEditingCell({rowId, field});
const handleCellBlur = async (rowId, field, newValue) => {
  await updateCell(rowId, field, newValue); // Auto-save
  setEditingCell(null);
};

// Render
<Table>
  <TableHeader>
    <TableRow>
      <TableHead onClick={() => sort('carrier')}>Carrier ⬍</TableHead>
      <TableHead onClick={() => sort('product')}>Product ⬍</TableHead>
      {CONTRACT_LEVELS.map(level => (
        <TableHead key={level} onClick={() => sort(`rate_${level}`)}>{level}%</TableHead>
      ))}
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {filteredData.map(row => (
      <TableRow key={row.productId}>
        <TableCell onClick={() => handleCellClick(row.productId, 'carrier')}>
          {editingCell?.rowId === row.productId && editingCell?.field === 'carrier'
            ? <Input value={row.carrierName} onBlur={...} autoFocus />
            : row.carrierName
          }
        </TableCell>
        <TableCell onClick={() => handleCellClick(row.productId, 'product')}>
          {editingCell?.rowId === row.productId && editingCell?.field === 'product'
            ? <Input value={row.productName} onBlur={...} autoFocus />
            : row.productName
          }
        </TableCell>
        {CONTRACT_LEVELS.map(level => (
          <TableCell
            key={level}
            className={row.rates[level] === null ? 'bg-red-50' : ''}
            onClick={() => handleCellClick(row.productId, `rate_${level}`)}
          >
            {editingCell?.rowId === row.productId && editingCell?.field === `rate_${level}`
              ? <Input type="number" value={row.rates[level]} onBlur={...} autoFocus />
              : row.rates[level] ? `${(row.rates[level] * 100).toFixed(0)}%` : '—'
            }
          </TableCell>
        ))}
        <TableCell>
          <Button onClick={() => deleteRow(row.productId)} variant="ghost" size="sm">🗑️</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 📁 Implementation Plan

### Step 1: Remove Old Structure
- Delete `CarrierManager.tsx`
- Delete `ProductManager.tsx`
- Delete `CompRatesManager.tsx`
- Keep only ONE tab in Settings: "Commission Management"

### Step 2: Create New Component
- `src/features/settings/CommissionManagement.tsx`
- Fetch all data in one query
- Render spreadsheet table
- Implement inline editing

### Step 3: Inline Editing
- Click cell → show input
- Tab navigation
- Auto-save on blur
- Keyboard shortcuts (Escape to cancel, Enter to save)

### Step 4: Add Row Functionality
- "+ Add Product" button
- New row with empty cells
- Carrier dropdown OR type new
- Auto-create carrier if doesn't exist
- Save creates product + 14 comp_guide entries

### Step 5: Polish
- Filter/search/sort
- Visual indicators
- Loading states
- Error handling
- Toast notifications

---

## ✅ Success Criteria

- [ ] Single table shows ALL carriers, products, and 602 commission rates
- [ ] Click any cell to edit inline
- [ ] Tab navigates between cells
- [ ] Auto-saves on blur (debounced)
- [ ] Can add new carrier/product inline
- [ ] Can filter by carrier
- [ ] Can search by product name
- [ ] Can sort by any column
- [ ] Missing rates highlighted in red
- [ ] Complete rows show green check
- [ ] No modals, no extra tabs, no clicking "Edit"

---

## 🚀 Next Steps

1. Delete old components (Carriers, Products, CompRates tabs)
2. Create unified `CommissionManagement.tsx`
3. Build spreadsheet-style table
4. Implement inline editing with auto-save
5. Add row creation
6. Test complete workflow

---

**Last Updated**: 2025-10-05
**Status**: Ready to implement
