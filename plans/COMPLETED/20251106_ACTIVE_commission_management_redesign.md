# Complete Redesign: Commission Management System

**Status:** ACTIVE
**Created:** 2025-11-06
**Type:** Feature Redesign - Settings / Commission Management

## Executive Summary
Complete architectural redesign of Carriers, Products, and Commission Rates management using proper shadcn/ui components, better UX patterns, and clear separation of concerns.

## Problems with Current Implementation
1. ❌ Using native `alert()` and `confirm()` instead of shadcn AlertDialog
2. ❌ Poor UX: "+ Add Carrier" buried in dropdown
3. ❌ Horizontal cramped grid with 14+ columns (unreadable)
4. ❌ Mixing 3 different entities in one view
5. ❌ Not leveraging shadcn/ui component library properly
6. ❌ No proper forms, validation, or user feedback

## New Architecture

### Tab Structure (in SettingsDashboard.tsx)
Replace single "Commission Management" tab with three tabs:

1. **Carriers Tab** - Manage insurance carriers
2. **Products Tab** - Manage products (with carrier relationships)
3. **Commission Rates Tab** - Configure rates per product/contract level
4. Constants (existing)
5. Agents (existing)

### Required shadcn Components to Install

```bash
npx shadcn@latest add form
npx shadcn@latest add alert-dialog
npx shadcn@latest add sheet
npx shadcn@latest add badge
npx shadcn@latest add separator
npx shadcn@latest add scroll-area
npx shadcn@latest add command
npx shadcn@latest add sonner
npx shadcn@latest add dropdown-menu
npx shadcn@latest add textarea
```

## Detailed Design

### 1. Carriers Tab (`CarriersManagement.tsx`)

**Layout:**
- Header with title, description, and "+ New Carrier" Button (shadcn)
- Search bar (Input component with Command for fuzzy search)
- DataTable showing: Carrier Name, # Products, Status, Actions
- Actions: Edit (Sheet), Delete (AlertDialog)

**Add/Edit Carrier (Sheet component):**
- Form with react-hook-form
- Fields: Carrier Name, Short Name (optional), Active toggle
- Save button, Cancel button
- Toast notification on success

**Delete Confirmation (AlertDialog):**
- Warning message
- Shows count of products that will be affected
- Destructive action button styling

### 2. Products Tab (`ProductsManagement.tsx`)

**Layout:**
- Header with "+ New Product" Button
- Filter bar: Select Carrier (Command component), Product Type (Select)
- DataTable: Product Name, Carrier, Type, # Rates Set, Status, Actions
- Bulk actions: Upload CSV (Dialog with Textarea), Download Template

**Add/Edit Product (Dialog component):**
- Form with validation
- Fields:
  - Carrier (Command/Select for existing or "+ Create New")
  - Product Name
  - Product Type (Select with badges)
  - Active toggle
- Proper shadcn Form components
- Toast on success

**Bulk Import (Dialog):**
- Instructions
- Download Template button
- Textarea for CSV paste or file upload
- Preview table before import
- Progress indicator during import

### 3. Commission Rates Tab (`CommissionRatesManagement.tsx`)

**NEW APPROACH - Product-Centric View:**

**Layout:**
- Header with search/filter
- Filter: Carrier (Select), Product Type (badges), Show Empty Rates (toggle)
- DataTable: Carrier, Product, Rate Coverage (e.g., "8/14 levels"), Actions
- Action: "Edit Rates" button (opens Dialog)

**Edit Rates Dialog:**
- Product name and carrier at top
- Scrollable grid showing ALL 14 contract levels (80-145 in 5% increments)
- Each level: Label (e.g., "80%") + Input for commission rate
- Visual indicators: Empty (red), Filled (green)
- Buttons: "Fill All" (bulk set), "Clear All", Save, Cancel
- Toast on save

**Bulk Rate Import (separate Dialog):**
- CSV format: Product Name, Contract Level, Commission %
- Download template
- Upload/paste CSV
- Preview + Import

## File Structure

```
src/features/settings/
├── SettingsDashboard.tsx (update tabs)
├── carriers/
│   ├── CarriersManagement.tsx
│   ├── components/
│   │   ├── CarrierForm.tsx (Sheet)
│   │   ├── CarrierDeleteDialog.tsx (AlertDialog)
│   │   └── CarriersDataTable.tsx
│   └── hooks/
│       └── useCarriers.ts
├── products/
│   ├── ProductsManagement.tsx
│   ├── components/
│   │   ├── ProductForm.tsx (Dialog)
│   │   ├── ProductBulkImport.tsx (Dialog)
│   │   └── ProductsDataTable.tsx
│   └── hooks/
│       └── useProducts.ts
├── commission-rates/
│   ├── CommissionRatesManagement.tsx
│   ├── components/
│   │   ├── RateEditDialog.tsx (Dialog with form)
│   │   ├── RateBulkImport.tsx (Dialog)
│   │   └── RatesDataTable.tsx
│   └── hooks/
│       └── useCommissionRates.ts
└── components/ (shared)
    ├── UserProfile.tsx (existing)
    └── SettingsComponents.tsx (existing)
```

## Key UX Improvements

1. ✅ **Proper shadcn components throughout** - Dialog, AlertDialog, Sheet, Form, Command, Toast
2. ✅ **Clear entity separation** - Each tab focuses on one thing
3. ✅ **Better data entry** - Proper forms with validation
4. ✅ **Bulk operations** - CSV import/export for efficiency
5. ✅ **Visual feedback** - Toasts, loading states, validation errors
6. ✅ **Searchable dropdowns** - Command component for carrier/product selection
7. ✅ **Responsive** - Vertical layouts, scrollable areas
8. ✅ **Accessible** - Keyboard navigation, ARIA labels

## Implementation Order

1. Install all required shadcn components
2. Create Carriers tab (simplest)
3. Create Products tab (moderate - has carrier relationship)
4. Create Commission Rates tab (most complex)
5. Update SettingsDashboard to use new tabs
6. Delete old CommissionManagement.tsx
7. Add Toast provider to app root
8. Test all CRUD operations
9. Add CSV import/export functionality

## Success Criteria

- All operations use shadcn components (no native alerts)
- Clean, vertical-focused layouts (no horizontal scroll hell)
- Fast bulk operations via CSV
- Proper error handling and user feedback
- Mobile-friendly responsive design

## Technical Notes

- Using react-hook-form for all forms
- Zod for validation schemas
- TanStack Query for data fetching/mutations
- Sonner for toast notifications
- shadcn DataTable pattern for all tables
