# Component Styling Continuation Prompt

## Context
We are redesigning shadcn/ui components to be more original with a modern, high-end, luxury aesthetic. Working on branch `feature/recruiting-page-redesign`.

## Design Principles
- **Monochrome zinc palette** - Using zinc-900 through zinc-50 for consistency
- **Visible hover states** - Actual color shifts (e.g., zinc-900 → zinc-700), not just opacity
- **Active/click states** - Scale down (0.98) + darker color
- **Focus states** - Ring with offset (ring-2 ring-zinc-900 ring-offset-2)
- **Dark mode support** - Every component has dark: variants
- **Variants** - Each component has multiple variants (default, secondary, ghost, outline, etc.)
- **No easter colors** - Avoid blue-500, emerald-500, etc. Use theme colors or zinc palette

## Completed Components ✅

1. **Button** (`src/components/ui/button.tsx`)
   - Variants: default, primary, secondary, success, warning, destructive, outline, ghost, muted, link
   - Sizes: default, sm, lg, icon, xs
   - Hover: bg-zinc-700, scale-[1.02], shadow-lg
   - Active: bg-zinc-950, scale-[0.98], shadow-sm

2. **Card** (`src/components/ui/card.tsx`)
   - Variants: default, glass (backdrop-blur), elevated, interactive (hover lift), outlined, ghost
   - Interactive variant has hover:-translate-y-1 lift effect

3. **Badge** (`src/components/ui/badge.tsx`)
   - Variants: default, secondary, success, warning, destructive, info, outline, ghost, premium
   - Sizes: default, sm, lg
   - Rounded-full pill style

4. **Input** (`src/components/ui/input.tsx`)
   - Variants: default, minimal (underline), filled, ghost, outlined
   - Sizes: default, sm, lg (via inputSize prop)
   - Clean focus ring with offset

5. **Select** (`src/components/ui/select.tsx`)
   - Trigger with zinc-100 bg, zinc-200 hover
   - Dropdown with shadow-xl and border
   - Items with visible hover (zinc-100)

6. **Tabs** (`src/components/ui/tabs.tsx`)
   - List with zinc-100 background
   - Active trigger: white bg, shadow-sm
   - Hover on inactive: zinc-200/50 bg
   - Content fade animations

7. **Table** (`src/components/ui/table.tsx`)
   - Header: zinc-50 bg, uppercase tracking
   - Rows: subtle zinc-100 border, hover zinc-50
   - Clean, minimal styling

## Components To Do (User to specify)

Likely candidates:
- Dialog / AlertDialog
- Sheet (already updated for recruiting)
- Popover
- Tooltip
- Dropdown Menu
- Checkbox / Radio / Switch
- Textarea
- Alert
- Avatar
- Progress
- Skeleton
- Toast/Sonner

---

## How to Continue

Copy this prompt to continue the styling work:

```
Continue the component styling work from the previous session.

Branch: feature/recruiting-page-redesign

Design principles:
- Zinc palette (zinc-900 to zinc-50)
- Visible hover states with actual color shifts
- Active states with scale-[0.98] + darker
- Focus rings with offset
- Full dark mode support
- Multiple variants per component

Already completed:
- Button, Card, Badge, Input, Select, Tabs, Table

Please update the following components with the same modern styling approach:
[LIST THE COMPONENTS YOU WANT]

Reference docs/COMPONENT_STYLING_GUIDE.md for variant naming conventions.
```

---

## Files Changed This Session

- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/table.tsx`
- `src/features/recruiting/RecruitingDashboard.tsx`
- `src/features/recruiting/components/RecruitListTable.tsx`
- `docs/COMPONENT_STYLING_GUIDE.md`
