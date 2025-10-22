# UI Components Shadow-Based Design System Refactor

**Created:** 2025-10-22
**Status:** Planning
**Priority:** Medium

## Overview

Refactor all shadcn UI components in `src/components/ui/` to follow a consistent shadow-based design system, eliminating hard borders and using elevation/depth through shadows instead.

## Design Principles (Based on User Preferences)

### Core Rules
- **No transparent backgrounds** - All components have solid backgrounds
- **No hard borders** - Use shadows to simulate borders and create depth
- **Light/Dark mode compatible** - All shadows have both light and dark variants
- **Consistent with Button component** - Follow the pattern established in button.tsx

### User-Selected Design Choices

**Form Inputs (Input, Textarea, Select):**
- Style: **Hybrid approach**
  - Inset shadows when inactive (recessed appearance)
  - Outset shadows when focused (elevated appearance)
  - Creates dynamic depth change on interaction

**Cards:**
- Style: **Floating panels**
  - Medium shadows creating clear separation from background
  - Visible elevation without being too dramatic
  - Subtle hover effects for interactive cards

**Dialogs/Modals:**
- Style: **Dramatic shadows**
  - Strong shadows emphasizing modal is above content
  - Clear visual hierarchy
  - Combines with backdrop overlay for maximum separation

**Interactive States (Global):**
- Style: **Context-aware**
  - Different components have different interactions
  - Cards lift on hover
  - Inputs glow/shift on focus
  - Buttons shift (already implemented)
  - Each component type has appropriate interaction for its purpose

**Badges:**
- Style: **Subtle shadows**
  - Small shadows give badges slight elevation
  - Not flat, but not prominent
  - Helps distinguish from background without drawing too much attention

**Tabs:**
- Style: **Elevated active tab**
  - Active tab rises with shadow
  - Inactive tabs are flat or minimal shadow
  - Clear visual indicator of active state

**Tables:**
- Style: **Flat with shadows**
  - Whole table has container shadow (like a card)
  - Rows use color changes only on hover
  - Keeps tables clean and scannable

**Alerts:**
- Style: **Floating**
  - Medium elevation to draw attention
  - Not aggressive, but noticeable
  - Balances urgency with aesthetics

---

## Component Implementation Plan

### Priority 1: Core Interactive Components (Do First)

#### 1. Input (`input.tsx`)
**Current:** Hard border (`border border-input`)
**Changes:**
- Remove `border` class
- Add inset shadow at rest: `shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]`
- Add outset shadow on focus: `focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.1)]`
- Ensure solid background (already has `bg-background`)
- Dark mode variants for all shadows

#### 2. Textarea (`textarea.tsx`)
**Current:** Hard border (`border border-input`)
**Changes:**
- Same pattern as Input
- Inset at rest, outset on focus
- Match Input's shadow values for consistency

#### 3. Select (`select.tsx`)
**Current:** Hard border on trigger (`border border-input`)
**Changes:**
- **SelectTrigger**: Hybrid shadow (inset at rest, outset on focus)
- **SelectContent**: Floating panel with medium shadow (no border)
- **SelectItem**: Subtle shadow on focus/hover
- Dark mode support throughout

#### 4. Card (`card.tsx`)
**Current:** Border + minimal shadow (`border bg-card shadow`)
**Changes:**
- Remove `border` class
- Add floating panel shadow: `shadow-[0_4px_12px_rgba(0,0,0,0.08)]`
- Add hover state (if interactive): `hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] hover:-translate-y-1`
- Dark mode: `dark:shadow-[0_4px_12px_rgba(0,0,0,0.25)]`

---

### Priority 2: Overlay Components

#### 5. Dialog (`dialog.tsx`)
**Current:** Border on content (`border bg-background shadow-lg`)
**Changes:**
- **DialogContent**: Remove `border`, add dramatic shadow
  - `shadow-[0_8px_24px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1)]`
  - Dark mode: `dark:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.3)]`
- **DialogOverlay**: Keep as-is (backdrop)
- Close button: Match button component style

#### 6. Alert Dialog (`alert-dialog.tsx`)
**Current:** (Need to read if has borders)
**Changes:**
- Same pattern as Dialog
- Dramatic shadows for overlay content
- Ensure solid backgrounds

#### 7. Sheet (`sheet.tsx`)
**Current:** (Need to read if has borders)
**Changes:**
- Remove borders from sheet content
- Add edge shadow based on slide direction
  - Right sheet: `shadow-[-4px_0_12px_rgba(0,0,0,0.1)]`
  - Left sheet: `shadow-[4px_0_12px_rgba(0,0,0,0.1)]`

#### 8. Popover (`popover.tsx`)
**Current:** (Need to read if has borders)
**Changes:**
- Remove border from popover content
- Add floating shadow: `shadow-[0_4px_12px_rgba(0,0,0,0.12)]`
- Dark mode support

---

### Priority 3: Status & Navigation Components

#### 9. Badge (`badge.tsx`)
**Current:** Has border in some variants (`border-transparent` or `border`)
**Changes:**
- Remove all `border` classes
- Add subtle shadow to all variants: `shadow-[0_1px_3px_rgba(0,0,0,0.08)]`
- Solid backgrounds for all variants
- Dark mode shadows

#### 10. Alert (`alert.tsx`)
**Current:** Has border (`border`)
**Changes:**
- Remove `border` class
- Add floating shadow: `shadow-[0_3px_10px_rgba(0,0,0,0.1)]`
- Destructive variant gets colored shadow: `shadow-[0_3px_10px_rgba(220,38,38,0.2)]`
- Dark mode variants

#### 11. Tabs (`tabs.tsx`)
**Current:** Active tab has shadow (`data-[state=active]:shadow`)
**Changes:**
- **TabsList**: Remove hard styling, add container shadow if needed
- **TabsTrigger** (inactive): Flat or minimal shadow
- **TabsTrigger** (active): Elevated with shadow
  - `data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.1)]`
  - `data-[state=active]:-translate-y-0.5`
- Smooth transitions

---

### Priority 4: Layout & Data Display

#### 12. Table (`table.tsx`)
**Current:** Borders on rows (`border-b`, `border-t`)
**Changes:**
- Wrap entire table in card-like container with shadow
- Remove row borders OR convert to shadow-based dividers
- Keep hover color changes: `hover:bg-muted/50`
- No individual row shadows (flat within container)

#### 13. Dropdown Menu (`dropdown-menu.tsx`)
**Current:** (Need to read if has borders)
**Changes:**
- Similar to Popover and Select
- Floating shadow for menu content
- No borders on items
- Hover states use background color only

#### 14. Command (`command.tsx`)
**Current:** (Need to read if has borders)
**Changes:**
- Container gets floating shadow
- Remove borders between groups/items
- Focus states use shadows or colors

---

### Priority 5: Specialty Components (Lower Priority)

#### 15. Calendar (`calendar.tsx`)
**Current:** (Need to read)
**Changes:**
- Container shadow (like card)
- Remove day cell borders
- Selected days get subtle elevation

#### 16. Chart (`chart.tsx`)
**Current:** (Need to read)
**Changes:**
- Chart container shadow
- May not need many changes (data viz focused)

#### 17. Scroll Area (`scroll-area.tsx`)
**Current:** (Need to read)
**Changes:**
- Minimal - likely just shadow on scrollbar thumb if needed

#### 18. Separator (`separator.tsx`)
**Current:** (Probably a line)
**Changes:**
- Instead of solid line, use subtle shadow to create division
- `shadow-[0_1px_0_rgba(0,0,0,0.08)]` or similar

#### 19. Label (`label.tsx`)
**Current:** (Probably text-only)
**Changes:**
- Likely none needed (pure typography)

#### 20. Empty (`empty.tsx`)
**Current:** (Custom component)
**Changes:**
- Review and apply card-like styling if it's a container

#### 21. Sonner (`sonner.tsx`)
**Current:** (Toast library)
**Changes:**
- Apply floating shadows to toast notifications
- Follow Alert styling pattern

#### 22. Form (`form.tsx`)
**Current:** (Form wrapper/context)
**Changes:**
- Likely none needed (structural component)

---

## Implementation Checklist

### Before Starting
- [ ] Review all component files to confirm current styling
- [ ] Create backup branch: `git checkout -b ui-shadow-refactor`
- [ ] Test current app to establish baseline

### Implementation Order
**Session 1: Core Forms**
- [ ] Input component
- [ ] Textarea component
- [ ] Select component
- [ ] Test forms throughout app

**Session 2: Cards & Containers**
- [ ] Card component
- [ ] Dialog component
- [ ] Alert Dialog component
- [ ] Test modals and cards

**Session 3: Status Components**
- [ ] Badge component
- [ ] Alert component
- [ ] Tabs component
- [ ] Test dashboard and status displays

**Session 4: Data Display**
- [ ] Table component
- [ ] Dropdown Menu component
- [ ] Popover component
- [ ] Test all data grids and menus

**Session 5: Specialty & Polish**
- [ ] Sheet component
- [ ] Command component
- [ ] Calendar component
- [ ] Separator component
- [ ] Sonner (toasts)
- [ ] Final testing across entire app

### After Each Session
- [ ] Run typecheck: `npm run typecheck`
- [ ] Test in browser (light mode)
- [ ] Test in browser (dark mode)
- [ ] Check for visual regressions
- [ ] Commit changes: `git commit -m "refactor(ui): apply shadow system to [components]"`

### Final Steps
- [ ] Comprehensive visual regression testing
- [ ] Test all interactive states (hover, focus, active, disabled)
- [ ] Test accessibility (focus rings still visible)
- [ ] Update any component documentation
- [ ] Merge to main branch
- [ ] Move this plan to `plans/COMPLETED/`

---

## Technical Implementation Notes

### Shadow Utility Pattern

**Inset Shadows (Recessed):**
```css
shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]
dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]
```

**Outset Shadows (Elevated):**
```css
/* Subtle */
shadow-[0_1px_3px_rgba(0,0,0,0.08)]
dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]

/* Medium (Floating) */
shadow-[0_4px_12px_rgba(0,0,0,0.1)]
dark:shadow-[0_4px_12px_rgba(0,0,0,0.25)]

/* Strong (Dramatic) */
shadow-[0_8px_24px_rgba(0,0,0,0.15)]
dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]
```

**Border Simulation:**
```css
shadow-[0_0_0_1px_rgba(0,0,0,0.1)]
dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]
```

**Colored Shadows (Alerts, Destructive):**
```css
shadow-[0_3px_10px_rgba(220,38,38,0.2)]
dark:shadow-[0_3px_10px_rgba(220,38,38,0.3)]
```

### Transition Classes
Always use `transition-all` or specific transitions for smooth animations:
```css
transition-all duration-200
```

### File Path Comments
Add to every modified file:
```typescript
// src/components/ui/[component-name].tsx
// [Brief description of component purpose]
```

---

## Testing Checklist

### Visual Testing
- [ ] All components render correctly in light mode
- [ ] All components render correctly in dark mode
- [ ] Shadows are visible but not overwhelming
- [ ] No hard borders remain (except where specifically noted)
- [ ] All backgrounds are solid (no transparency issues)

### Interactive Testing
- [ ] Hover states work smoothly
- [ ] Focus states are visible and accessible
- [ ] Active/pressed states feel responsive
- [ ] Disabled states are clearly distinguishable
- [ ] Transitions are smooth (no jarring changes)

### Accessibility Testing
- [ ] Focus rings are visible in all contexts
- [ ] Color contrast meets WCAG standards
- [ ] Screen readers work correctly
- [ ] Keyboard navigation still functions

### Cross-Component Testing
- [ ] Forms (login, policy creation, etc.)
- [ ] Dashboard cards and KPIs
- [ ] Tables and data grids
- [ ] Modals and dialogs
- [ ] Dropdowns and selects
- [ ] Navigation tabs
- [ ] Toast notifications
- [ ] Badges and status indicators

---

## Notes & Considerations

### Performance
- Shadows can impact performance if overused
- Use simple shadow definitions where possible
- Avoid excessive shadow layers (max 2-3 layers per shadow)

### Browser Compatibility
- Box-shadow is well supported across all modern browsers
- Tailwind's arbitrary values work in all target browsers

### Design System Evolution
- This creates a consistent design language
- Future components should follow this pattern
- Document patterns for new team members

### Fallback Strategy
- If shadows don't render well in a specific context:
  - Option 1: Adjust shadow opacity
  - Option 2: Add subtle background color change
  - Option 3: Revert specific component (document why)

---

## Success Criteria

✅ **Complete when:**
1. All UI components use shadow-based elevation instead of hard borders
2. Light and dark modes both look cohesive
3. No TypeScript errors introduced
4. All interactive states work smoothly
5. App feels more modern and cohesive
6. No visual regressions in existing features

---

## Reference

**Completed Example:** `src/components/ui/button.tsx`
- Shows shadow implementation pattern
- Demonstrates light/dark mode handling
- Includes interactive state transitions
- Uses context-aware styling (shift on hover)

**Related Documentation:**
- Tailwind CSS v4 documentation
- shadcn/ui component patterns
- Project CLAUDE.md design principles
