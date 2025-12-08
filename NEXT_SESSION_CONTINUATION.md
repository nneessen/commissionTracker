# Session Continuation Prompt - Email Template Builder Fixes

## Immediate Context
We are fixing the Email Template Builder in the Training Hub. The previous implementation had critical bugs and the current fix is incomplete.

## Critical Issues Still Present

### 1. isActive State NOT BEING SAVED
In `EditTemplateDialog.tsx`, the `isActive` toggle is displayed but **NOT included in the update mutation**:
```typescript
// Line 73-82 - isActive is MISSING from updates
await updateTemplate.mutateAsync({
  id: templateId,
  updates: {
    name: name.trim(),
    subject: subject.trim(),
    category,
    is_global: isGlobal,
    blocks,
    is_block_template: true,
    // MISSING: is_active: isActive  <-- MUST ADD THIS
  },
})
```

### 2. Styles Don't Match Project Design System
The user has repeatedly specified these design requirements:
- **Compact, professional, data-dense UI**
- **Minimal padding/margins** - maximize information density
- **Small, readable text sizes** - don't waste vertical space
- **Muted color palette** - professional, not flashy
- **Subtle borders and shadows** - clean separation without visual noise
- **Consistent spacing scale** - use Tailwind's smaller values (1, 2, 3, not 6, 8, 10)
- **No unnecessary animations or transitions**

Current components use too much padding, oversized elements, and don't match the compact style of the rest of the app.

### 3. Block Style Panel (BlockStylePanel.tsx)
- Uses `w-48` (192px) - too wide
- Padding of `p-3` - should be `p-2`
- Font sizes need to be smaller
- Should match AdminControlCenter sidebar patterns

### 4. Block Palette (BlockPalette.tsx)
- Uses `w-44` (176px) - too wide
- Should be more compact like 140px or less
- Block items have too much padding

### 5. Dialog Headers
- Header height `h-12` is too tall
- Should be `h-10` or `h-9` to match rest of app

## Files That Need Style Fixes

| File | Issues |
|------|--------|
| `src/features/email/components/block-builder/EmailBlockBuilder.tsx` | Toolbar too tall, spacing too generous |
| `src/features/email/components/block-builder/BlockPalette.tsx` | Too wide, items too padded |
| `src/features/email/components/block-builder/BlockCanvas.tsx` | Canvas padding too large |
| `src/features/email/components/block-builder/BlockStylePanel.tsx` | Too wide, too much padding |
| `src/features/email/components/block-builder/blocks/TextBlock.tsx` | Editor styling needs refinement |
| `src/features/training-hub/components/templates/CreateTemplateDialog.tsx` | Header too tall, sidebar too wide |
| `src/features/training-hub/components/templates/EditTemplateDialog.tsx` | Same + isActive not saving |

## Reference Files for Correct Styling

Look at these for proper compact styling:
- `src/features/admin/components/AdminControlCenter.tsx`
- `src/features/policies/components/PolicyTable.tsx`
- Any sidebar in the app for proper widths

## What Was Completed in Previous Session

1. **Fixed nested DndContext** - Single DndContext now in EmailBlockBuilder
2. **Fixed drag architecture** - useDroppable in BlockCanvas, proper SortableContext
3. **Added click-to-add** - Palette blocks have + button
4. **Added empty canvas drop zone** - canvas-drop-zone droppable
5. **Fixed TipTap sync** - useEffect syncs content on block change
6. **Made dialogs full-page** - fixed inset-0 positioning

## Start Command
```
Fix the Email Template Builder:
1. Add `is_active: isActive` to the update mutation in EditTemplateDialog.tsx
2. Apply compact design system to ALL block-builder components:
   - Reduce widths: palette 140px, style panel 160px
   - Reduce padding: use p-2, py-1.5, px-2 instead of p-3, p-4
   - Reduce heights: use h-8, h-9, h-10 not h-12
   - Match font sizes and spacing to AdminControlCenter patterns
3. Read AdminControlCenter.tsx first to understand the design patterns
4. Test with `npm run build` after changes
```

## Database Schema Reference
```sql
-- email_templates table has these columns:
id, name, subject, body_html, body_text, variables, category,
is_global, created_by, is_active, usage_count, created_at, updated_at,
blocks (JSONB), is_block_template (BOOLEAN)
```

## Key File Paths
- Block Builder: `src/features/email/components/block-builder/`
- Dialogs: `src/features/training-hub/components/templates/`
- Reference: `src/features/admin/components/AdminControlCenter.tsx`
- Types: `src/types/email.types.ts`
