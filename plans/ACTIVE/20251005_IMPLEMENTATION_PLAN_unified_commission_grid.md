# IMPLEMENTATION PLAN: Unified Commission Grid

**Status**: ACTIVE - READY TO EXECUTE
**Date**: 2025-10-05
**Estimated Time**: 2-3 hours

---

## 📋 PHASE 1: CLEANUP (DELETE UNUSED CODE)

### Files to DELETE:
```bash
# Old components we're replacing
rm src/features/settings/carriers/CarrierManager.tsx
rm src/features/settings/products/ProductManager.tsx
rm src/features/settings/comp-rates/CompRatesManager.tsx
rm src/features/settings/comp-rates/index.ts
rm -rf src/features/settings/comp-rates/__tests__/

# Shadcn component we don't need (using custom Input)
rm src/components/ui/input-base.tsx
```

### Files to KEEP:
- ✅ `src/hooks/comps/useCompRates.ts` - React Query hooks (NEEDED)
- ✅ `src/services/settings/compGuideService.ts` - Service layer (NEEDED)
- ✅ `src/components/ui/Input.tsx` - Original custom input (NEEDED)
- ✅ `src/components/ui/button.tsx` - Shadcn button (NEEDED)
- ✅ `src/components/ui/table.tsx` - Shadcn table (NEEDED)
- ✅ Tests - Keep all passing tests

---

## 📋 PHASE 2: BUILD NEW COMPONENT

### Single File to CREATE:
`src/features/settings/CommissionManagement.tsx`

**Features:**
1. Fetch all carriers, products, comp_guide in ONE query
2. Spreadsheet-style table: Carrier | Product | 80-145 (14 columns) | Actions
3. Inline editing: click cell → edit → blur to save
4. Add row: "+ Add Product" button
5. Filter/search/sort
6. Visual indicators (red = missing, green = complete)

**Data Structure:**
```typescript
interface CommissionGridRow {
  carrierId: string;
  carrierName: string;
  productId: string;
  productName: string;
  rates: Record<number, number | null>; // {80: 0.70, 85: 0.75, ...}
}
```

---

## 📋 PHASE 3: UPDATE SETTINGS DASHBOARD

### Modify: `src/features/settings/SettingsDashboard.tsx`

**Remove:**
- "Carriers" tab
- "Products" tab
- "Commission Rates" tab

**Keep:**
- "Commission Management" tab (new)
- "Constants" tab
- "Agents" tab

**New tabs structure:**
```typescript
<Tabs defaultValue="commissions">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="commissions">Commission Management</TabsTrigger>
    <TabsTrigger value="constants">Constants</TabsTrigger>
    <TabsTrigger value="agents">Agents</TabsTrigger>
  </TabsList>

  <TabsContent value="commissions">
    <CommissionManagement />
  </TabsContent>
  ...
</Tabs>
```

---

## 📋 PHASE 4: SERVICE ENHANCEMENTS

### Modify: `src/services/settings/compGuideService.ts`

**Add new method:**
```typescript
async getAllCommissionData() {
  // Fetch carriers with products and all comp_guide entries
  // Returns: { carrier, products: [{ product, rates: {...} }] }
}
```

**Update hooks to use this new method**

---

## 📋 PHASE 5: TESTING

### Update Tests:
1. Delete: `src/features/settings/comp-rates/__tests__/CompRatesManager.test.tsx`
2. Create: `src/features/settings/__tests__/CommissionManagement.test.tsx`
3. Keep: `src/hooks/comps/__tests__/useCompRates.test.tsx` (still valid)
4. Keep: `src/services/settings/__tests__/compGuideService.test.ts` (still valid)

---

## 🗂️ FINAL FILE STRUCTURE

```
src/
├── features/
│   └── settings/
│       ├── CommissionManagement.tsx         [NEW - main component]
│       ├── SettingsDashboard.tsx            [MODIFIED - 3 tabs instead of 5]
│       ├── components/
│       │   └── SettingsComponents.tsx       [KEEP]
│       └── __tests__/
│           └── CommissionManagement.test.tsx [NEW]
├── hooks/
│   └── comps/
│       ├── useCompRates.ts                  [KEEP]
│       └── __tests__/
│           └── useCompRates.test.tsx        [KEEP - 16 tests]
├── services/
│   └── settings/
│       ├── compGuideService.ts              [MODIFIED - add getAllCommissionData]
│       └── __tests__/
│           └── compGuideService.test.ts     [KEEP - 9 tests]
└── components/
    └── ui/
        ├── Input.tsx                        [KEEP - original]
        ├── button.tsx                       [KEEP - shadcn]
        ├── table.tsx                        [KEEP - shadcn]
        ├── tabs.tsx                         [KEEP - shadcn]
        ├── card.tsx                         [KEEP - shadcn]
        └── ...other shadcn components
```

---

## 📝 EXECUTION CHECKLIST

### Phase 1: Cleanup (5 min)
- [ ] Delete CarrierManager.tsx
- [ ] Delete ProductManager.tsx
- [ ] Delete comp-rates/ directory
- [ ] Delete input-base.tsx
- [ ] Archive old plan: `plans/ACTIVE/20251005_ACTIVE_commission_rates_management_dashboard.md` → move to COMPLETED

### Phase 2: Build Component (60 min)
- [ ] Create CommissionManagement.tsx
- [ ] Implement spreadsheet table
- [ ] Add inline editing (click cell → edit → auto-save)
- [ ] Add "+ Add Product" row functionality
- [ ] Add filter/search/sort

### Phase 3: Integration (15 min)
- [ ] Update SettingsDashboard.tsx (remove 2 tabs, add 1 new)
- [ ] Update imports
- [ ] Test tab switching

### Phase 4: Service Layer (20 min)
- [ ] Add getAllCommissionData() to compGuideService
- [ ] Create hook useAllCommissionData()
- [ ] Update existing hooks if needed

### Phase 5: Testing (30 min)
- [ ] Write tests for CommissionManagement
- [ ] Update integration tests
- [ ] Run all tests: `npm run test:run`
- [ ] Manual testing in browser

### Phase 6: Documentation (10 min)
- [ ] Update plan with completion status
- [ ] Document new API/component usage
- [ ] Update README if needed

---

## 🚨 CRITICAL RULES

1. **Do NOT modify:**
   - Tests that are passing
   - Services that work
   - Original Input component
   - Auth components

2. **Do NOT create:**
   - Unnecessary abstractions
   - Multiple files when one will do
   - Modals or dialogs
   - Separate forms

3. **DO create:**
   - ONE unified component
   - Inline editing everywhere
   - Auto-save on blur
   - Simple, fast UX

---

## 🎯 SUCCESS CRITERIA

When done:
- ✅ Login works (original Input component)
- ✅ Settings has 3 tabs (Commission Management, Constants, Agents)
- ✅ Commission Management shows ONE spreadsheet
- ✅ Can edit carrier name inline
- ✅ Can edit product name inline
- ✅ Can edit any of 14 commission rates inline
- ✅ Can add new product row
- ✅ All changes auto-save
- ✅ All tests pass
- ✅ No console errors

---

**Next Action**: Execute Phase 1 (Cleanup) - Delete unused files

