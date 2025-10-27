# Comprehensive UI Refactoring Plan

**Project:** Commission Tracker
**Objective:** Refactor all components across 8 feature directories to use shadcn components exclusively, eliminate hardcoded colors, ensure dark/light mode compatibility
**Status:** In Progress (Phase 2 of 9 Complete)
**Started:** October 23, 2025

---

## Requirements

### Core Requirements

1. **Shadcn Components Only** - Replace ALL manual HTML elements with shadcn components
2. **No Hardcoded Colors** - Use only CSS variables from index.css (semantic tokens)
3. **Dark/Light Mode Compatible** - All components must work in both themes
4. **No Transparent Backgrounds** - Every component must have proper background
5. **Component Customization** - Shadcn components must be customized for this app
6. **Proper Props** - All reusable components must have necessary props

### Manual HTML → Shadcn Replacements

- `<input>` → `Input` + `Label`
- `<select>` → `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`
- `<textarea>` → `Textarea` + `Label`
- `<label>` → `Label`
- Manual card divs → `Card`, `CardContent`, `CardHeader`, `CardTitle`
- Manual alert divs → `Alert`, `AlertDescription`
- Manual badge spans → `Badge`
- Manual dividers → `Separator`
- Manual buttons → `Button`

### Color Variable Mappings

**Semantic Colors:**

- `bg-white` → `bg-card` or implicit
- `bg-gray-50` → `bg-muted`
- `text-gray-900` → `text-foreground`
- `text-gray-600` → `text-muted-foreground`
- `text-gray-700` → `text-foreground`
- `text-gray-500` → `text-muted-foreground`
- `border-gray-200` → `border-border`
- `border-gray-300` → `border-input`

**Status Colors:**

- `text-green-600`, `bg-green-50` → `text-status-active`, `bg-status-active-bg`
- `text-red-600`, `bg-red-50` → `text-destructive`, `bg-destructive` or Alert variant
- `text-blue-600`, `bg-blue-50` → `text-primary`, `bg-primary`
- `text-yellow-600`, `bg-yellow-50` → `text-status-pending`, `bg-status-pending-bg`
- `text-orange-600`, `bg-orange-50` → `text-status-earned`, `bg-status-earned-bg`

**Gradients → Semantic:**

- `bg-gradient-to-br from-blue-50 via-white to-indigo-50` → `bg-background`
- `bg-gradient-to-br from-blue-600 to-indigo-600` → `bg-primary text-primary-foreground`

### Common Pitfalls to Avoid

1. **Button `loading` prop** - NOT supported. Use manual text like `{loading ? "Saving..." : "Save"}`
2. **Input `label` prop** - NOT supported. Use separate `<Label>` component
3. **Input `error` prop** - NOT supported. Display errors manually with conditional rendering
4. **Select onChange** - Use `onValueChange={(value) => ...}` NOT `onChange={(e) => ...}`
5. **Focus styles** - Remove all manual focus styles, shadcn handles automatically

---

## Phase Summary

### ✅ Phase 1: Tier 1 Critical Files (COMPLETED)

**Files:** 5 | **Lines:** ~800 | **Colors Fixed:** 50+

1. ✅ `src/features/policies/PolicyForm.tsx` (620 lines)
   - Replaced 15+ manual inputs with shadcn Input
   - Replaced 10+ manual selects with shadcn Select
   - Added Label components for accessibility
   - Created handleSelectChange for shadcn API compatibility
   - Eliminated all hardcoded colors

2. ✅ `src/features/auth/Login.tsx` (297 lines)
   - Replaced manual card divs with Card + CardContent
   - Added Separator component
   - All gradients → semantic colors

3. ✅ `src/features/analytics/components/SegmentCard.tsx` (59 lines)
   - Wrapped in shadcn Card
   - Tier colors → status CSS variables

4. ✅ `src/features/settings/ConstantsManagement.tsx` (257 lines)
   - Manual cards → Card + CardContent
   - Success/info boxes → Alert + AlertDescription
   - Added Label components

5. ✅ `src/features/comps/CompFilters.tsx` (210 lines)
   - 4 manual selects → shadcn Select
   - 1 manual input → shadcn Input
   - Manual badge → shadcn Badge

### ✅ Phase 2: Auth Feature (COMPLETED)

**Files:** 8 | **Lines:** ~1,000 | **Colors Fixed:** 50+

1. ✅ `src/features/auth/components/SignInForm.tsx` (95 lines)
   - Removed Input `label` and `error` props
   - Added Label components + manual error display
   - Removed Button `loading` prop

2. ✅ `src/features/auth/components/SignUpForm.tsx` (105 lines)
   - Same refactoring as SignInForm
   - Removed hardcoded gradient from Button

3. ✅ `src/features/auth/components/ResetPasswordForm.tsx` (57 lines)
   - Same refactoring as SignInForm
   - Removed hardcoded gradient from Button

4. ✅ `src/features/auth/components/AuthErrorDisplay.tsx` (48 lines)
   - Manual alert div → Alert variant="destructive"
   - Manual SVG → AlertCircle from lucide-react

5. ✅ `src/features/auth/components/AuthSuccessMessage.tsx` (25 lines)
   - Manual alert div → Alert with status-active colors
   - Manual SVG → CheckCircle from lucide-react

6. ✅ `src/features/auth/AuthCallback.tsx` (214 lines)
   - All gradients → semantic colors
   - Loading spinner color → border-primary
   - Status icons → semantic colors

7. ✅ `src/features/auth/EmailVerificationPending.tsx` (111 lines)
   - Manual cards → Card + CardContent
   - Alert with `type` prop → AuthErrorDisplay/AuthSuccessMessage
   - Manual divider → Separator
   - Removed Button `loading` prop

8. ✅ `src/features/auth/ResetPassword.tsx` (184 lines)
   - Manual cards → Card + CardContent
   - Manual alerts → AuthErrorDisplay/AuthSuccessMessage
   - Input with `label` → separate Label components

**Progress:** 13/77 files complete (17%)

---

## ⏳ Phase 3: Analytics Feature (PENDING)

**Files:** 13 | **Estimated Lines:** ~1,500

### Components to Refactor:

1. `src/features/analytics/components/ClientSegmentationCard.tsx`
   - [ ] Replace manual card divs with Card components
   - [ ] Replace hardcoded segment colors with status variables
   - [ ] Check for manual badges → Badge component

2. `src/features/analytics/components/GeographicHeatmap.tsx`
   - [ ] Replace manual card wrapper with Card
   - [ ] Replace hardcoded map colors with CSS variables
   - [ ] Check for manual tooltips → shadcn Tooltip if needed

3. `src/features/analytics/components/PersistencyAnalysis.tsx`
   - [ ] Replace manual card with Card
   - [ ] Replace chart hardcoded colors with CSS variables
   - [ ] Check for manual selects/filters → shadcn Select

4. `src/features/analytics/components/ProductMixChart.tsx`
   - [ ] Replace manual card with Card
   - [ ] Product type colors → status variables
   - [ ] Check for legend with manual HTML → proper components

5. `src/features/analytics/components/RevenueGrowthChart.tsx`
   - [ ] Replace manual card with Card
   - [ ] Chart colors → CSS variables
   - [ ] Check for time period selectors → shadcn Select

6. `src/features/analytics/components/StatePerformanceTable.tsx`
   - [ ] Replace manual table with proper shadcn Table components
   - [ ] Replace manual sort indicators with lucide-react icons
   - [ ] Status badges → Badge component with variants

7. `src/features/analytics/AnalyticsPage.tsx`
   - [ ] Check page wrapper for hardcoded backgrounds
   - [ ] Replace manual cards with Card
   - [ ] Check for manual tabs → shadcn Tabs if needed

8. `src/features/analytics/visualizations/CarrierComparisonChart.tsx`
   - [ ] Chart colors → CSS variables
   - [ ] Manual card → Card

9. `src/features/analytics/visualizations/ForecastChart.tsx`
   - [ ] Chart colors → CSS variables
   - [ ] Manual card → Card
   - [ ] Check for TypeScript null errors (seen in typecheck)

10. `src/features/analytics/visualizations/ProductPerformanceChart.tsx`
    - [ ] Chart colors → CSS variables
    - [ ] Manual card → Card

11. `src/features/analytics/visualizations/TrendChart.tsx`
    - [ ] Chart colors → CSS variables
    - [ ] Manual card → Card

12. `src/features/analytics/components/AnalyticsFilters.tsx`
    - [ ] Manual selects → shadcn Select
    - [ ] Manual date inputs → shadcn date picker if available
    - [ ] Filter container → Card

13. `src/features/analytics/components/MetricCard.tsx`
    - [ ] Manual card → Card + CardHeader + CardContent
    - [ ] Metric colors → status variables
    - [ ] Icons should use lucide-react

**Key Patterns for Analytics:**

- Chart libraries (recharts/visx) colors should use `var(--primary)`, `var(--status-active)`, etc.
- Table components should use shadcn Table, TableHeader, TableBody, TableRow, TableCell
- All metric cards should use consistent Card structure
- Filter dropdowns MUST use shadcn Select

---

## ⏳ Phase 4: Dashboard Feature (PENDING)

**Files:** 13 | **Estimated Lines:** ~2,000

### Components to Refactor:

1. `src/features/dashboard/DashboardPage.tsx`
   - [ ] Page wrapper background colors
   - [ ] Grid layout cards → Card
   - [ ] Quick action buttons styling

2. `src/features/dashboard/components/QuickActions.tsx`
   - [ ] Action buttons → Button with proper variants
   - [ ] Container → Card if needed
   - [ ] Icons from lucide-react

3. `src/features/dashboard/components/KPIGrid.tsx`
   - [ ] Grid container styling
   - [ ] KPI cards → MetricCard or Card
   - [ ] Status colors → CSS variables

4. `src/features/dashboard/components/DetailedKPIGrid_Columns.tsx`
   - [ ] Column header styling
   - [ ] Sort indicators → lucide-react icons
   - [ ] Cell colors → semantic variables

5. `src/features/dashboard/components/DetailedKPIGrid_List.tsx`
   - [ ] List items → proper Card or list components
   - [ ] Status badges → Badge
   - [ ] Manual dividers → Separator

6. `src/features/dashboard/components/DetailedKPIGridWithSwitcher.tsx`
   - [ ] View switcher buttons → Button group
   - [ ] Container → Card
   - [ ] Active state colors → semantic

7. `src/features/dashboard/components/RecentPolicies.tsx`
   - [ ] Table → shadcn Table components
   - [ ] Status badges → Badge with variants
   - [ ] Container → Card

8. `src/features/dashboard/components/UpcomingRenewals.tsx`
   - [ ] List items styling
   - [ ] Date displays → consistent formatting
   - [ ] Container → Card

9. `src/features/dashboard/components/CommissionSummary.tsx`
   - [ ] Summary cards → Card
   - [ ] Currency colors → status variables
   - [ ] Icons → lucide-react

10. `src/components/dashboard/ActionableInsights.tsx`
    - [ ] Insight cards → Card + Alert if warnings
    - [ ] Priority colors → status variables
    - [ ] Fix TypeScript style jsx errors (seen in typecheck)

11. `src/components/dashboard/CommissionPipeline.tsx`
    - [ ] Pipeline stages → Card components
    - [ ] Stage colors → status variables
    - [ ] Fix TypeScript style jsx errors

12. `src/components/dashboard/PerformanceMetricCard.tsx`
    - [ ] Manual card → Card structure
    - [ ] Metric colors → status variables
    - [ ] Fix TypeScript style jsx errors

13. `src/features/dashboard/components/PaceMetrics.tsx`
    - [ ] Pace cards → Card
    - [ ] Target colors → status variables
    - [ ] Progress indicators → proper styling

**Key Patterns for Dashboard:**

- Consistent Card structure across all widgets
- Status badges should use Badge with semantic variants
- All tables should use shadcn Table
- Metric displays need consistent color coding

---

## ⏳ Phase 5: Expenses Feature (PENDING)

**Files:** 11 | **Estimated Lines:** ~1,200

### Components to Refactor:

1. `src/features/expenses/ExpenseManagement.tsx`
   - [ ] Page wrapper styling
   - [ ] Filter section → Card with Select components
   - [ ] Add expense button → Button

2. `src/features/expenses/components/ExpenseForm.tsx`
   - [ ] Form inputs → Input + Label
   - [ ] Category select → shadcn Select
   - [ ] Date input → proper date picker
   - [ ] Deductible checkbox → Checkbox component
   - [ ] Manual validation errors → proper display

3. `src/features/expenses/components/ExpenseList.tsx`
   - [ ] Table → shadcn Table
   - [ ] Status badges → Badge
   - [ ] Action buttons → Button with icons

4. `src/features/expenses/components/ExpenseFilters.tsx`
   - [ ] Manual selects → shadcn Select
   - [ ] Date range inputs → date picker
   - [ ] Filter container → Card

5. `src/features/expenses/components/ExpenseSummary.tsx`
   - [ ] Summary cards → Card
   - [ ] Total amounts styling → semantic colors
   - [ ] Category breakdown → proper list

6. `src/features/expenses/components/CategoryManager.tsx`
   - [ ] Category list → Card with proper structure
   - [ ] Add category form → Input + Button
   - [ ] Category badges → Badge

7. `src/features/expenses/components/ExpenseChart.tsx`
   - [ ] Chart container → Card
   - [ ] Chart colors → CSS variables
   - [ ] Legend styling

8. `src/features/expenses/components/MonthlyBreakdown.tsx`
   - [ ] Month cards → Card
   - [ ] Total displays → consistent styling
   - [ ] Category colors → status variables

9. `src/features/expenses/components/DeductibleReport.tsx`
   - [ ] Report container → Card
   - [ ] Deductible amounts → highlight with status colors
   - [ ] Table → shadcn Table

10. `src/features/expenses/components/ExpenseStats.tsx`
    - [ ] Stat cards → Card
    - [ ] Comparison colors → status variables
    - [ ] Icons → lucide-react

11. `src/features/expenses/components/ReceiptUpload.tsx`
    - [ ] Upload area styling → proper button/input
    - [ ] Preview cards → Card
    - [ ] Status messages → Alert

**Key Patterns for Expenses:**

- Category badges need consistent Badge usage with colors
- All forms must use Input + Label pattern
- Deductible indicators should use status-earned color
- Tables need shadcn Table components

---

## ⏳ Phase 6: Policies Feature (PENDING)

**Files:** 6 remaining | **Estimated Lines:** ~800

### Components to Refactor:

1. `src/features/policies/PolicyList.tsx`
   - [x] Commission status dropdown → shadcn Select (COMPLETED 2025-10-27)
   - [x] Fixed critical bug: commission status updates now properly trigger amount recalculations
   - [ ] Table → shadcn Table (PENDING)
   - [ ] Status badges → Badge with variants (PENDING)
   - [ ] Filter section → shadcn Select (PENDING)
   - [ ] Action buttons → Button (PENDING)
   - [ ] Fix TypeScript Date errors (seen in typecheck)

2. `src/features/policies/PolicyListInfinite.tsx`
   - [ ] Similar to PolicyList
   - [ ] Infinite scroll styling
   - [ ] Fix TypeScript 'other' product type error

3. `src/features/policies/PolicyFormUpdated.tsx`
   - [ ] Form inputs → Input + Label
   - [ ] Selects → shadcn Select
   - [ ] Fix TypeScript 'other' product type error
   - [ ] Fix boolean to string type errors

4. `src/features/policies/components/PolicyCard.tsx`
   - [ ] Manual card → Card structure
   - [ ] Status display → Badge
   - [ ] Action buttons → Button group

5. `src/features/policies/components/PolicyFilters.tsx`
   - [ ] Manual selects → shadcn Select
   - [ ] Date range → date picker
   - [ ] Search input → Input with search icon

6. `src/features/policies/components/PolicyStatusBadge.tsx`
   - [ ] Manual badge → Badge component
   - [ ] Status colors → status CSS variables
   - [ ] Ensure all policy statuses have mappings

**Key Patterns for Policies:**

- Policy status badges critical for visual clarity
- Large forms need careful Input + Label refactoring
- Tables need shadcn Table for consistency
- Fix product_type TypeScript errors

---

## ⏳ Phase 7: Settings Feature (PENDING)

**Files:** 15 | **Estimated Lines:** ~2,000

### Components to Refactor:

1. `src/features/settings/SettingsPage.tsx`
   - [ ] Settings nav → Tabs or proper navigation
   - [ ] Page sections → Card
   - [ ] Background colors → semantic

2. `src/features/settings/UserProfile.tsx`
   - [ ] Profile form → Input + Label
   - [ ] Save button → Button
   - [ ] Avatar upload → proper styling

3. `src/features/settings/carriers/CarriersManagement.tsx`
   - [ ] Carrier list → Table or Card list
   - [ ] Add button → Button
   - [ ] Search → Input with icon

4. `src/features/settings/carriers/components/CarrierForm.tsx`
   - [ ] Form inputs → Input + Label
   - [ ] Active toggle → Switch component
   - [ ] Fix TypeScript form resolver errors (seen in typecheck)

5. `src/features/settings/products/ProductsManagement.tsx`
   - [ ] Product list → Table
   - [ ] Category filters → Select
   - [ ] Fix TypeScript is_active null errors

6. `src/features/settings/products/components/ProductForm.tsx`
   - [ ] Form inputs → Input + Label
   - [ ] Product type select → Select
   - [ ] Carrier select → Select
   - [ ] Fix TypeScript form resolver errors

7. `src/features/settings/commission-rates/CommissionRatesManagement.tsx`
   - [ ] Rates table → shadcn Table
   - [ ] Edit forms → proper form components
   - [ ] Contract level inputs → Input

8. `src/features/settings/commission-rates/components/CommissionRateForm.tsx`
   - [ ] Form inputs → Input + Label
   - [ ] Percentage inputs → Input with validation
   - [ ] Date inputs → date picker

9. `src/features/settings/targets/TargetsManagement.tsx`
   - [ ] Target cards → Card
   - [ ] Edit buttons → Button
   - [ ] Currency inputs → Input with formatting

10. `src/features/settings/AgentManagement.tsx`
    - [ ] Agent list → Table
    - [ ] Status badges → Badge
    - [ ] Action buttons → Button

11. `src/features/settings/components/SettingsSection.tsx`
    - [ ] Section wrapper → Card
    - [ ] Section headers → CardHeader
    - [ ] Dividers → Separator

12. `src/features/settings/components/SettingsNav.tsx`
    - [ ] Nav items → proper navigation
    - [ ] Active states → semantic colors
    - [ ] Icons → lucide-react

13. `src/features/settings/ThemeSettings.tsx`
    - [ ] Theme toggle → proper switch/radio
    - [ ] Preview cards → Card
    - [ ] Color pickers if any

14. `src/features/settings/NotificationSettings.tsx`
    - [ ] Notification toggles → Switch
    - [ ] Settings groups → Card
    - [ ] Save button → Button

15. `src/features/settings/SecuritySettings.tsx`
    - [ ] Password form → Input + Label
    - [ ] 2FA toggle → Switch
    - [ ] Security options → Card

**Key Patterns for Settings:**

- Forms are critical - must use Input + Label
- Toggle switches should use shadcn Switch
- Tables need shadcn Table
- Fix TypeScript form resolver errors
- Ensure all active/inactive states use consistent Badge

---

## ⏳ Phase 8: Comps Feature (PENDING)

**Files:** 6 | **Estimated Lines:** ~600

### Components to Refactor:

1. `src/features/comps/CompManagement.tsx`
   - [ ] Page wrapper → proper layout
   - [ ] Comp grid → Card layout
   - [ ] Filters → shadcn Select

2. `src/features/comps/components/CompCard.tsx`
   - [ ] Manual card → Card structure
   - [ ] Contract level display → Badge
   - [ ] Percentage displays → consistent styling

3. `src/features/comps/components/CompTable.tsx`
   - [ ] Manual table → shadcn Table
   - [ ] Sort headers → proper icons
   - [ ] Status cells → Badge
   - [ ] Remove useMemo (per CLAUDE.md in comps/)

4. `src/features/comps/components/ActiveFilterBadges.tsx`
   - [ ] Manual badges → Badge component
   - [ ] Clear buttons → Button with X icon
   - [ ] Container styling → proper layout

5. `src/features/comps/UserContractSettings.tsx`
   - [ ] Settings form → Input + Label
   - [ ] Contract level select → Select
   - [ ] Save button → Button
   - [ ] Fix Button `loading` prop error (seen in typecheck)

6. `src/features/comps/components/CommissionGuide.tsx`
   - [ ] Guide cards → Card
   - [ ] Rate displays → consistent styling
   - [ ] Carrier/product info → Badge

**Key Patterns for Comps:**

- Contract levels need Badge with consistent colors
- Percentage displays should be standardized
- Remove useMemo from CompTable.tsx
- Tables use shadcn Table

---

## ⏳ Phase 9: Final Testing & Validation (PENDING)

### Tasks:

1. **TypeScript Type Check**
   - [ ] Run `npm run typecheck`
   - [ ] Verify zero NEW errors introduced
   - [ ] Document any pre-existing errors

2. **Dark Mode Testing**
   - [ ] Test all pages in dark mode
   - [ ] Verify no transparent backgrounds
   - [ ] Check text contrast ratios
   - [ ] Verify status colors work in both themes
   - [ ] Test all interactive states (hover, focus, active)

3. **Light Mode Testing**
   - [ ] Test all pages in light mode
   - [ ] Verify consistent styling
   - [ ] Check readability
   - [ ] Test all interactive states

4. **Component Consistency Audit**
   - [ ] All forms use Input + Label pattern
   - [ ] All selects use shadcn Select
   - [ ] All tables use shadcn Table
   - [ ] All cards use shadcn Card
   - [ ] All alerts use shadcn Alert
   - [ ] All badges use shadcn Badge
   - [ ] All buttons use shadcn Button

5. **Color Variable Audit**
   - [ ] Search for remaining hardcoded colors: `text-gray-`, `bg-blue-`, etc.
   - [ ] Verify all status colors use CSS variables
   - [ ] Check chart library colors use var() syntax
   - [ ] Verify no gradients remain (except in index.css)

6. **Accessibility Check**
   - [ ] All inputs have associated labels
   - [ ] All buttons have descriptive text or aria-labels
   - [ ] Focus indicators visible in both themes
   - [ ] Color contrast meets WCAG AA standards

7. **Documentation**
   - [ ] Update component usage docs if needed
   - [ ] Document new shadcn component patterns
   - [ ] Note any custom variants added
   - [ ] Update CLAUDE.md if patterns changed

8. **Move Plan to Completed**
   - [ ] Move this file to `plans/COMPLETED/ui-refactoring-comprehensive-plan-YYYYMMDD.md`
   - [ ] Create summary document with before/after stats
   - [ ] Archive old `current.md` to `ARCHIVED/`

---

## Refactoring Checklist (Per Component)

Use this checklist for each component:

### HTML Elements

- [ ] All `<input>` replaced with `Input` + `Label`
- [ ] All `<select>` replaced with shadcn `Select` components
- [ ] All `<textarea>` replaced with `Textarea` + `Label`
- [ ] All `<label>` replaced with `Label`
- [ ] All manual card divs replaced with `Card` components
- [ ] All manual alert divs replaced with `Alert` components
- [ ] All manual badge spans replaced with `Badge`
- [ ] All manual dividers replaced with `Separator`

### Colors

- [ ] No `text-gray-*` classes remain
- [ ] No `bg-gray-*` classes remain (except in index.css)
- [ ] No `border-gray-*` classes remain
- [ ] No `text-[color]-*` classes remain (red, blue, green, yellow, etc.)
- [ ] No `bg-[color]-*` classes remain
- [ ] No gradient classes remain (except in index.css)
- [ ] All colors use CSS variables or semantic classes

### Props & APIs

- [ ] No `loading` prop on Button (use manual text)
- [ ] No `label` prop on Input (use separate Label)
- [ ] No `error` prop on Input (use manual error display)
- [ ] Select uses `onValueChange` not `onChange`
- [ ] All form fields have proper `id` attributes for labels

### Styling

- [ ] No manual focus styles (let shadcn handle)
- [ ] No transparent backgrounds
- [ ] Component works in both dark and light mode
- [ ] Proper spacing using Tailwind utilities

### Testing

- [ ] Component renders without errors
- [ ] TypeScript errors resolved
- [ ] Visual appearance matches design in both themes
- [ ] Interactive elements work correctly

---

## Progress Tracking

**Total Files:** 77
**Files Completed:** 13 (17%)
**Files Remaining:** 64 (83%)

**By Phase:**

- ✅ Phase 1 (Tier 1): 5/5 files (100%)
- ✅ Phase 2 (Auth): 8/8 files (100%)
- ⏳ Phase 3 (Analytics): 0/13 files (0%)
- ⏳ Phase 4 (Dashboard): 0/13 files (0%)
- ⏳ Phase 5 (Expenses): 0/11 files (0%)
- ⏳ Phase 6 (Policies): 0/6 files (0%)
- ⏳ Phase 7 (Settings): 0/15 files (0%)
- ⏳ Phase 8 (Comps): 0/6 files (0%)
- ⏳ Phase 9 (Testing): 0/8 tasks (0%)

**Estimated Total Lines to Refactor:** ~10,000 lines
**Lines Refactored:** ~1,800 lines (18%)

**Estimated Completion:**

- Phase 3-4: 2-3 hours
- Phase 5-6: 1-2 hours
- Phase 7-8: 2-3 hours
- Phase 9: 1 hour
- **Total Remaining:** 6-9 hours

---

## Notes & Learnings

### Key Patterns Established

1. **Input Pattern:** Always wrap Input with separate Label, display errors manually below
2. **Select Pattern:** Use onValueChange handler, not onChange
3. **Button Pattern:** No loading prop, use conditional text
4. **Error Display:** Use flex with AlertCircle icon and destructive color
5. **Card Pattern:** Card → CardContent for most cases, add CardHeader when needed

### Common Issues Fixed

1. Button `loading` prop removed (not in shadcn API)
2. Input `label` and `error` props removed (not in shadcn API)
3. Select onChange → onValueChange API change
4. Manual focus styles removed (shadcn handles)
5. Gradient backgrounds → semantic color variables

### TypeScript Notes

- All refactoring maintained type safety
- Zero new errors introduced through Phase 2
- Pre-existing errors documented in typecheck output
- Form resolver errors in Settings feature need attention

### Performance Notes

- Removed useMemo from some components (React 19 best practice)
- No performance regressions expected
- Bundle size may decrease slightly (fewer custom styles)

---

## End of Plan

**Last Updated:** October 23, 2025
**Next Phase:** Phase 3 - Analytics Feature (13 files)
