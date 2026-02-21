# Redesign: Configure UW Wizard Dialog

## Context

The "Configure: UW Wizard and Quoter" dialog (`AddonEditorDialog`) in the admin billing panel's Add-ons tab is unusable at 100% zoom. It stacks all content vertically with no height constraint — header, 4 form fields, pricing grid, Stripe IDs, tier cards (~200px each), active toggle, and save button. With 2-3 tiers configured, the dialog exceeds 1400px tall, requiring 67% zoom to see or click the Save button.

## Approach

Restructure the dialog with a **fixed header + scrollable body + fixed footer** layout, add **tabs** to separate details from tier configuration, and **redesign the tier editor as a compact table** instead of cards.

**Two files modified. No new files.**

## Files to Modify

1. `src/features/billing/components/admin/AddonsManagementPanel.tsx` — `AddonEditorDialog` (lines 215-420)
2. `src/features/billing/components/admin/AddonTierEditor.tsx` — entire file

## Changes

### 1. AddonsManagementPanel.tsx — AddonEditorDialog

**Add imports:** `DialogFooter` from dialog, `Tabs/TabsList/TabsTrigger/TabsContent` from tabs

**Restructure DialogContent to 3-zone flex layout:**

```
DialogContent (size="lg", max-h-[85vh], overflow-hidden, p-0, flex flex-col)
  ├── Header zone (flex-shrink-0, px-4 py-3, border-b)
  │     Title with icon + badge
  │
  ├── Body zone (flex-1, min-h-0, overflow-y-auto, px-4 py-3)
  │     IF supportsTiers:
  │       Tabs: "Details & Pricing" | "Usage Tiers"
  │       - Details tab: name, description, pricing grid, Stripe IDs
  │       - Tiers tab: AddonTierEditor
  │     ELSE:
  │       Just the details form (no tabs)
  │
  └── Footer zone (flex-shrink-0, px-4 py-2.5, border-t)
        Left: Active toggle + label
        Right: Save button
```

Key changes:
- `size="lg"` (max-w-2xl, 672px) — wider for tier table
- `max-h-[85vh]` — viewport constrained
- Save button + Active toggle moved to always-visible footer
- Tighter spacing: `space-y-3` instead of `space-y-4`, `h-7` inputs, `text-[10px]` labels
- Section headers replace `border-t` dividers

### 2. AddonTierEditor.tsx — Card-to-Table Redesign

Replace card-per-tier layout with a compact **editable table**:

| # | ID | Name | Runs/Mo | Monthly | Annual | ✕ |
|---|-----|------|---------|---------|--------|---|

Each tier = one row with inline-editable inputs. ~44px per row vs ~200px per card.

**Stripe Price IDs** moved to a collapsible section below the table (rarely changed, doesn't need to be always visible).

New imports: `ChevronRight` from lucide, `Collapsible` components. Remove `GripVertical`.

### Height Comparison

| State | Before | After |
|-------|--------|-------|
| 0 tiers | ~550px | ~360px (details tab) |
| 2 tiers | ~1000px | ~360px (details tab) / ~300px (tiers tab) |
| 3 tiers | ~1200px+ | ~360px (details tab) / ~340px (tiers tab) |

Worst case: ~400px — well within `85vh` on any reasonable viewport.

## Verification

1. `npm run build` — zero TypeScript errors
2. Open billing page → Admin: Plan Mgmt → Add-ons tab → Configure on UW Wizard
3. Verify dialog fits viewport at 100% zoom
4. Verify Save button and Active toggle are always visible in footer
5. Switch between Details and Tiers tabs
6. Add/remove tiers — confirm table stays compact
7. Expand Stripe Price IDs collapsible — confirm it works
8. Save changes — confirm mutation works as before
9. Test with non-tier addon (e.g., quoter) — verify no tabs shown, just details form
