# Settings Page UI Modernization

Settings page has 12 components to restyle with zinc palette:

## Priority 1 - Main Dashboard & Core (4)
- SettingsDashboard.tsx - Main settings page with tabs
- UserProfile.tsx - User profile component
- GoalsManagement.tsx - Goals settings
- ConstantsManagement.tsx - Constants/variables management

## Priority 2 - Carriers (3)
- CarriersManagement.tsx - Main carriers table
- CarrierForm.tsx - Add/edit carrier form
- CarrierDeleteDialog.tsx - Delete confirmation

## Priority 3 - Products (3)
- ProductsManagement.tsx - Main products table
- ProductForm.tsx - Add/edit product form
- ProductBulkImport.tsx - Bulk import interface

## Priority 4 - Commission Rates (2)
- CommissionRatesManagement.tsx - Main rates table
- RateEditDialog.tsx - Edit rate dialog
- RateBulkImport.tsx - Bulk import rates

## Start Command

Continue the UI modernization. Read the ui_style_preferences memory and reference AdminControlCenter.tsx for the zinc palette styling pattern, then restyle all Settings components with:

1. Background: `bg-zinc-50 dark:bg-zinc-950` for main containers
2. Cards/panels: `bg-white dark:bg-zinc-900` with `border-zinc-200 dark:border-zinc-800`
3. Text: `text-zinc-900 dark:text-zinc-100` for main, `text-zinc-500 dark:text-zinc-400` for muted
4. Tables: Header `bg-zinc-50 dark:bg-zinc-800/50`, rows `border-zinc-100 dark:border-zinc-800`
5. Compact styling: `text-[10px]` to `text-[11px]` fonts, `h-6` to `h-7` buttons
6. Stats inline rows with dividers: `bg-zinc-200 dark:bg-zinc-700`

Start with SettingsDashboard.tsx and work through each priority group.
