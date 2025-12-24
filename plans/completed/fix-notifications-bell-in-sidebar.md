# Fix Notification Bell Popover Hidden Behind Sidebar

## Problem Summary

When clicking the notification bell icon in the sidebar, the popover that opens is hidden behind the sidebar and cannot be seen or interacted with.

**Root Cause:** Z-index layering conflict
- Sidebar container: `z-[100]`
- PopoverContent: `z-50`
- Since 50 < 100, the popover renders behind the sidebar

## Component Analysis

### Sidebar (`src/components/layout/Sidebar.tsx`)
- **Z-index values:**
  - Mobile menu button: `z-[101]` (line 306)
  - Sidebar container: `z-[100]` (line 326)
  - Mobile overlay: `z-[99]` (line 316)
- **NotificationDropdown location:** Line 379, rendered inside sidebar header

### NotificationDropdown (`src/components/notifications/NotificationDropdown.tsx`)
- Uses Radix UI `Popover` primitive (lines 37-107)
- Trigger: Bell icon button with unread badge
- Content: Notification list in dropdown
- **Props:** `align="end"`, `sideOffset={8}`, `className="w-80 p-0"`

### Popover UI Primitive (`src/components/ui/popover.tsx`)
- **Current z-index:** `z-50` (line 22) ← **PROBLEM**
- Uses `PopoverPrimitive.Portal` for rendering outside DOM hierarchy
- Portal rendering means content is detached from sidebar, but z-index still matters

## Solution Approach

**Strategy:** Increase the Popover component's z-index to render above the sidebar.

### Option 1: Global Popover Fix (Recommended)
Update `src/components/ui/popover.tsx` line 22:
- Change `z-50` to `z-[150]`
- Ensures ALL popovers in the app render above the sidebar
- Consistent with other UI components (Select uses `z-[150]`)

### Option 2: Specific NotificationDropdown Override
Update `src/components/notifications/NotificationDropdown.tsx` line 54:
- Add `z-[150]` to PopoverContent className
- Only fixes notification dropdown, not other popovers

### Option 3: Comprehensive Z-Index Standardization
Create a consistent z-index scale across the entire application.

**Current z-index values in codebase:**
- Tooltip: `z-[9999]` (`src/components/ui/tooltip.tsx:23`)
- Select dropdown: `z-[150]` (`src/components/ui/select.tsx:88`)
- Dialog content: `z-[100]` (`src/components/ui/dialog.tsx:37`)
- Dropdown menu: `z-50` (`src/components/ui/dropdown-menu.tsx:59`)
- Sidebar: `z-[100]` (`src/components/layout/Sidebar.tsx:326`)
- Custom popovers (Messages): `z-[200]` (`src/features/messages/components/compose/ContactPicker.tsx:194`)

## Recommended Implementation

**Use Option 1 (Global Popover Fix)** for the following reasons:
1. **Minimal changes** - Single line edit
2. **Fixes all popovers** - Prevents similar issues elsewhere
3. **Consistency** - Aligns with Select component (`z-[150]`)
4. **Future-proof** - Any new popovers will work correctly

### Implementation Steps

**Step 1: Update Popover Z-Index**

**File:** `src/components/ui/popover.tsx`

**Change line 22:**
```tsx
// BEFORE
"z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]",

// AFTER
"z-[150] w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]",
```

**Step 2: Verify No Regressions**

Check that the z-index change doesn't cause issues with other components:
- Search for all uses of `Popover` component in the codebase
- Ensure no popovers should render BELOW the sidebar (none expected)
- Verify popovers still render below dialogs/modals if needed

**Step 3: Test**

- [ ] Click notification bell in sidebar → popover should be visible
- [ ] Test on desktop and mobile views
- [ ] Test with collapsed and expanded sidebar states
- [ ] Check other popovers in the app still work correctly

## Z-Index Hierarchy (After Fix)

```
Layer 5: Tooltips                   z-[9999]
Layer 4: Dialogs/Modals            z-[200-300]  (if needed in future)
Layer 3: Dropdowns/Popovers        z-[150]      ← NEW VALUE
Layer 2: Sidebar/Chrome            z-[100-101]
Layer 1: Main Content              z-10 or lower
```

## Files to Modify

### Files to MODIFY (1)
- `src/components/ui/popover.tsx` - Change `z-50` to `z-[150]` on line 22

### Files to VERIFY (for regressions)
- `src/components/notifications/NotificationDropdown.tsx` - Primary beneficiary
- Any other components using `Popover` primitive (search codebase)

## Testing Checklist

- [ ] Build passes: `npm run build`
- [ ] Notification bell popover visible in sidebar (desktop)
- [ ] Notification bell popover visible in sidebar (mobile)
- [ ] Popover renders correctly in collapsed sidebar mode
- [ ] Popover renders correctly in expanded sidebar mode
- [ ] Other popovers in app still function (if any exist)
- [ ] Popover doesn't cover critical UI elements inappropriately
- [ ] Animation and positioning still work correctly

## Edge Cases

1. **Mobile sidebar overlay:** Sidebar has `z-[100]`, mobile overlay has `z-[99]`. Popover at `z-[150]` will render above both. ✓
2. **Dialogs/Modals:** If dialogs need to render above popovers, they should use `z-[200]` or higher.
3. **Other popovers:** Any existing popovers will also be raised to `z-[150]`. This is desired behavior.

## Rollback Plan

If the z-index increase causes unexpected issues:
1. Revert `src/components/ui/popover.tsx` line 22 back to `z-50`
2. Implement Option 2 instead (specific NotificationDropdown override)
3. Add `className="z-[150]"` to NotificationDropdown's PopoverContent

## Expected Outcome

- ✅ Notification bell popover renders above sidebar
- ✅ Popover is fully visible and interactive
- ✅ All other popovers in app also benefit from fix
- ✅ Consistent z-index hierarchy across UI components
