# Policy Dialog Styling Update

## Status: READY FOR IMPLEMENTATION

## 1. Problem Restatement

**Goal:** Update the Add/Edit Policy dialog (`PolicyDialog.tsx` + `PolicyForm.tsx`) to use CSS variables instead of hardcoded Tailwind colors, matching the established styling patterns used in other dialogs like `EditUserDialog.tsx`.

**Constraints:**
- STYLING ONLY - no functionality changes
- Must use CSS variables from `index.css` (e.g., `--foreground`, `--muted-foreground`, `--border`, `--success`, `--info`, `--destructive`)
- Must follow `ui_style_preferences` memory guidelines
- Must pass `npm run build`

**Scope:** 2 files
- `src/features/policies/components/PolicyDialog.tsx` (minor updates)
- `src/features/policies/PolicyForm.tsx` (main styling updates)

---

## 2. Current Issues Identified

### PolicyForm.tsx Hardcoded Colors

| Line | Current | Should Be |
|------|---------|-----------|
| 354, 548 | `text-zinc-900 dark:text-zinc-100` | `text-foreground` |
| 357, 551 | `bg-zinc-200 dark:bg-zinc-700` (divider) | `bg-border` |
| 362, 386, 418, 444, 476, 530, 554, 580, 600, 625, 649, 681 | `text-zinc-700 dark:text-zinc-300` (labels) | `text-muted-foreground` |
| 372, 398, 429, 455, 488, 566, 590, 611, 636, 665, 693 | `border-zinc-200 dark:border-zinc-700` (inputs/selects) | `border-input` |
| 376, 410, 435, 468, 513, 520, 569, 593, 615, 642 | `text-red-600 dark:text-red-400` (errors) | `text-destructive` |
| 708 | `bg-zinc-50 dark:bg-zinc-800/50` (calc box) | `bg-muted` |
| 708 | `border-zinc-200 dark:border-zinc-700` (calc box) | `border-border` |
| 710, 717, 725 | `text-zinc-500 dark:text-zinc-400` (calc labels) | `text-muted-foreground` |
| 713 | `text-blue-600 dark:text-blue-400` (annual premium) | `text-[hsl(var(--info))]` |
| 721 | `text-zinc-900 dark:text-zinc-100` (commission rate) | `text-foreground` |
| 729 | `text-emerald-600 dark:text-emerald-400` (expected advance) | `text-[hsl(var(--success))]` |
| 737 | `border-zinc-200 dark:border-zinc-800` (footer border) | `border-border` |
| 743 | `text-zinc-600 dark:text-zinc-400` (cancel button) | Remove - ghost variant handles this |

### PolicyDialog.tsx (Minor)

| Line | Current | Should Be |
|------|---------|-----------|
| 39 | `bg-white dark:bg-zinc-900` | `bg-card` |
| 39 | `border-zinc-200 dark:border-zinc-800` | `border-border` |
| 40 | `border-zinc-200 dark:border-zinc-800` | `border-border` |
| 41 | `text-zinc-900 dark:text-zinc-100` | `text-foreground` |
| 44 | `text-zinc-500 dark:text-zinc-400` | `text-muted-foreground` |
| 53 | `text-zinc-500 dark:text-zinc-400` | `text-muted-foreground` |

---

## 3. CSS Variable Reference

From `index.css`:
```css
--foreground         /* Primary text */
--muted-foreground   /* Secondary/subtle text */
--border             /* Default borders */
--input              /* Input borders */
--card               /* Card backgrounds */
--muted              /* Muted backgrounds */
--destructive        /* Error/danger color */
--success            /* Success color (hsl format) */
--info               /* Info color (hsl format) */
```

---

## 4. Implementation Steps

### Step 1: Update PolicyDialog.tsx

```tsx
// Line 39: DialogContent
className="max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-border"

// Line 40: DialogHeader
className="pb-2 border-b border-border"

// Line 41: DialogTitle
className="text-sm font-semibold text-foreground"

// Line 44: DialogDescription
className="text-[11px] text-muted-foreground mt-1"

// Line 53: Loading text
className="flex items-center justify-center p-8 text-muted-foreground text-[11px]"
```

### Step 2: Update PolicyForm.tsx Section Headers

```tsx
// Lines 354, 548: Section header text
className="text-[11px] font-semibold text-foreground uppercase tracking-wider m-0"

// Lines 357, 551: Divider line
className="h-px bg-border mb-1"
```

### Step 3: Update PolicyForm.tsx Labels

All labels should use:
```tsx
className="text-[11px] text-muted-foreground"
```

Files affected: Lines 362, 386, 418, 444, 476, 530, 554, 580, 600, 625, 649, 681

### Step 4: Update PolicyForm.tsx Input/Select Borders

Standard input/select error pattern:
```tsx
// Normal state
className="h-8 text-[11px] border-input"

// Error state (use template literal)
className={`h-8 text-[11px] ${errors.fieldName ? "border-destructive" : "border-input"}`}
```

### Step 5: Update PolicyForm.tsx Error Messages

All error spans should use:
```tsx
className="text-[10px] text-destructive"
```

Lines affected: 376, 410, 435, 468, 513, 520, 569, 593, 615, 642

### Step 6: Update PolicyForm.tsx Calculated Values Box

```tsx
// Line 708: Container
className="flex flex-col gap-1.5 p-2.5 bg-muted rounded border border-border"

// Lines 710, 717, 725: Labels
className="text-muted-foreground"

// Line 713: Annual Premium value (info color)
className="text-[hsl(var(--info))] font-semibold font-mono"

// Line 721: Commission Rate value
className="text-foreground font-semibold"

// Line 729: Expected Advance value (success color)
className="text-[hsl(var(--success))] font-semibold font-mono"
```

### Step 7: Update PolicyForm.tsx Footer

```tsx
// Line 737: Footer container
className="flex justify-end gap-2 p-3 border-t border-border"

// Line 738-746: Cancel button - remove explicit text color, ghost variant handles it
<Button
  type="button"
  onClick={onClose}
  variant="ghost"
  size="sm"
  className="h-7 text-[11px] px-3"
>
  Cancel
</Button>
```

### Step 8: Update Textarea Border

```tsx
// Line 541: Notes textarea
className="text-[11px] resize-vertical min-h-[50px] border-input"
```

---

## 5. Files to Modify

| File | Changes |
|------|---------|
| `src/features/policies/components/PolicyDialog.tsx` | 5 class updates |
| `src/features/policies/PolicyForm.tsx` | ~40 class updates |

---

## 6. Verification Steps

1. Run `npm run build` - must pass with zero errors
2. Visual check in light mode - all colors should use theme
3. Visual check in dark mode - all colors should adapt correctly
4. Verify error states still show red (destructive) colors
5. Verify calculated values box uses correct semantic colors (info blue, success green)

---

## 7. Risk Analysis

**Low Risk:**
- Styling-only changes
- No functionality impact
- No database changes
- No API changes

**Rollback:** Simple git revert if needed

---

## 8. Implementation Checklist

- [ ] Update PolicyDialog.tsx (5 changes)
- [ ] Update PolicyForm.tsx section headers (4 changes)
- [ ] Update PolicyForm.tsx labels (12 changes)
- [ ] Update PolicyForm.tsx input/select borders (11 changes)
- [ ] Update PolicyForm.tsx error messages (10 changes)
- [ ] Update PolicyForm.tsx calculated values box (7 changes)
- [ ] Update PolicyForm.tsx footer (2 changes)
- [ ] Update PolicyForm.tsx textarea (1 change)
- [ ] Run `npm run build`
- [ ] Visual verification in light/dark mode

---

## Start Command

```
Implement styling updates for PolicyDialog and PolicyForm per plans/active/policy-dialog-styling.md

This is a STYLING-ONLY task. Replace all hardcoded zinc/blue/emerald/red Tailwind colors with CSS variables following the patterns in EditUserDialog.tsx.

Key mappings:
- text-zinc-900/100 → text-foreground
- text-zinc-500/400/700/300 → text-muted-foreground
- border-zinc-200/700/800 → border-border or border-input
- text-red-600/400 → text-destructive
- text-blue-600/400 → text-[hsl(var(--info))]
- text-emerald-600/400 → text-[hsl(var(--success))]
- bg-zinc-50/800 → bg-muted or bg-card
- bg-white/zinc-900 → bg-card

Do NOT change any functionality, only CSS classes.
```
