# Continuation Prompt: Policies Page Redesign with Zinc Palette

## Task
Redesign the Policies page to match the consistent zinc palette styling used across Admin, Settings, Training Hub, Messages, Recruiting, and Team pages.

## Context
We've been systematically updating all pages to use a consistent compact design pattern with the zinc color palette. The following pages have been completed:
- Admin pages
- Settings pages
- Training Hub
- Messages page
- Recruiting page
- Team/Hierarchy page (just completed)

## Design Patterns to Follow

### Container
```tsx
className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950"
```

### Header Card
```tsx
className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800"
```

### Header Title
```tsx
<Icon className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
<h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Page Title</h1>
```

### Inline Stats with Dividers
```tsx
<div className="flex items-center gap-3 text-[11px]">
  <div className="flex items-center gap-1">
    <span className="font-medium text-zinc-900 dark:text-zinc-100">{value}</span>
    <span className="text-zinc-500 dark:text-zinc-400">label</span>
  </div>
  <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
  <!-- more stats -->
</div>
```

### Custom Tab Bar (if needed)
```tsx
<div className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5">
  <button className={cn(
    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all",
    isActive
      ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
  )}>
    <Icon className="h-3.5 w-3.5" />
    {label}
  </button>
</div>
```

### Content Container
```tsx
className="flex-1 overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
```

### Compact Buttons
```tsx
// Primary action
className="h-6 text-[10px] px-2"

// Ghost/secondary
className="h-6 text-[10px] px-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"

// Icon only
className="h-6 w-6 p-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
```

### Table Styling
```tsx
// Header row
<TableRow className="h-8 border-b border-zinc-200 dark:border-zinc-800">
  <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">

// Body row
<TableRow className={cn(
  "h-9 cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800/50",
  isSelected ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
)}>
  <TableCell className="text-[11px] text-zinc-900 dark:text-zinc-100 py-1.5">
```

### Filter Row
```tsx
className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800"

// Select triggers
className="h-6 w-[110px] text-[10px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
```

### Empty States
```tsx
<div className="flex flex-col items-center justify-center p-4">
  <Icon className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Message</p>
  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Subtitle</p>
</div>
```

### Skeleton Loading
```tsx
<Skeleton className="h-8 w-full bg-zinc-200 dark:bg-zinc-700" />
```

### Status Badges
```tsx
// Success/Active
className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded"

// Warning/Pending
className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded"

// Error/Cancelled
className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded"

// Info/Processing
className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded"
```

## Color Mapping Reference
| Old (Semantic) | New (Zinc) |
|----------------|------------|
| `text-foreground` | `text-zinc-900 dark:text-zinc-100` |
| `text-muted-foreground` | `text-zinc-500 dark:text-zinc-400` |
| `bg-card` | `bg-white dark:bg-zinc-900` |
| `bg-muted` | `bg-zinc-100 dark:bg-zinc-800` |
| `bg-muted/20` | `bg-zinc-50 dark:bg-zinc-800/50` |
| `border-border` | `border-zinc-200 dark:border-zinc-800` |
| `hover:bg-muted/50` | `hover:bg-zinc-50 dark:hover:bg-zinc-800/50` |
| `text-success` | `text-emerald-600 dark:text-emerald-400` |
| `text-error` | `text-red-600 dark:text-red-400` |
| `text-warning` | `text-amber-600 dark:text-amber-400` |
| `text-info` | `text-blue-600 dark:text-blue-400` |

## Files to Update
The policies feature is located at `src/features/policies/`. Key files:
- `PolicyDashboard.tsx` - Main dashboard container
- `PolicyList.tsx` - Policy table/list component
- `PolicyDashboardHeader.tsx` - Header with stats and actions
- `PolicyDialog.tsx` - Dialog for viewing/editing policies
- `PolicyForm.tsx` - Form for creating/editing policies

## Instructions
1. First explore `src/features/policies/` to understand the current structure
2. Read the main page components to understand current styling
3. Update container, header, and content areas to match zinc patterns
4. Update any tables, lists, or cards with zinc styling
5. Update form inputs, dialogs, and modals with zinc styling
6. Update status badges and empty states
7. Remove unused Card/semantic color imports
8. Run `npm run typecheck` to verify no errors
9. Use `/autocommit` when complete

## Reference Files (already updated)
- `src/features/hierarchy/HierarchyDashboardCompact.tsx`
- `src/features/hierarchy/components/TeamMetricsCard.tsx`
- `src/features/hierarchy/components/AgentTable.tsx`
- `src/features/messages/MessagesPage.tsx`
- `src/features/recruiting/RecruitingDashboard.tsx`
- `src/features/admin/components/AdminControlCenter.tsx`
- `src/features/settings/SettingsDashboard.tsx`
