# Training Hub Styling Continuation

## Context
Continue the UI modernization by restyling the Training Hub feature with the zinc palette and compact layout patterns established in the admin pages.

## Reference Files (already styled - use as patterns)
- `src/features/admin/components/AdminControlCenter.tsx` - Inline stats header, table layout
- `src/features/admin/components/RoleManagementPage.tsx` - Table with compact dialogs
- `src/features/admin/components/EditUserDialog.tsx` - Compact tabbed dialog

## Style Memory
Read the `ui_style_preferences` memory for complete styling guidelines.

## Files to Restyle (15 components)

### Priority 1 - Main Page & Tabs
1. **TrainingHubPage.tsx** - Main container with tab navigation
2. **ActivityTab.tsx** - Activity feed/list
3. **AutomationTab.tsx** - Workflow automation list
4. **EmailTemplatesTab.tsx** - Email template management
5. **RecruitingTab.tsx** - Recruiting-related training content

### Priority 2 - Workflow Components
6. **WorkflowWizard.tsx** - Multi-step workflow creator
7. **WorkflowDialog.tsx** - Workflow edit/create dialog
8. **WorkflowBasicInfo.tsx** - Workflow name/description form
9. **WorkflowTriggerSetup.tsx** - Trigger configuration
10. **WorkflowActionsBuilder.tsx** - Action sequence builder
11. **WorkflowReview.tsx** - Final review before save

### Priority 3 - Supporting Components
12. **ActionConfigPanel.tsx** - Action configuration panel
13. **EventSelectionDialog.tsx** - Event picker dialog
14. **EventTypeManager.tsx** - Event type CRUD
15. **WorkflowDiagnostic.tsx** - Debug/diagnostic view

## Styling Patterns to Apply

### Page Layout
```tsx
<div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
```

### Inline Stats Header
```tsx
<div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
  <div className="flex items-center gap-5">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
      <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Page Title</h1>
    </div>
    <div className="flex items-center gap-3 text-[11px]">
      <div className="flex items-center gap-1">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{count}</span>
        <span className="text-zinc-500 dark:text-zinc-400">label</span>
      </div>
      <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
      <!-- more stats -->
    </div>
  </div>
  <Button size="sm" className="h-6 text-[10px] px-2">
    <Plus className="h-3 w-3 mr-1" />
    Action
  </Button>
</div>
```

### Table Layout
```tsx
<Table>
  <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
    <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
        Column
      </TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50">
      <TableCell className="py-1.5">
        <span className="text-[11px] text-zinc-900 dark:text-zinc-100">Content</span>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Compact Dialog
```tsx
<DialogContent className="max-w-md p-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
  <DialogHeader className="space-y-1">
    <DialogTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Title</DialogTitle>
    <DialogDescription className="text-[10px] text-zinc-500 dark:text-zinc-400">Description</DialogDescription>
  </DialogHeader>
  <div className="space-y-3 py-2">
    <!-- Form fields -->
  </div>
  <DialogFooter className="gap-1 pt-2">
    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]">Cancel</Button>
    <Button size="sm" className="h-6 px-2 text-[10px]">Save</Button>
  </DialogFooter>
</DialogContent>
```

### Form Elements
```tsx
<Label className="text-[11px] text-zinc-500 dark:text-zinc-400">Label</Label>
<Input className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700" />
<Textarea className="text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 resize-none" rows={2} />
<Select>
  <SelectTrigger className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
    <SelectValue />
  </SelectTrigger>
</Select>
<Checkbox className="h-3 w-3" />
```

### Badges
```tsx
<Badge variant="outline" className="text-[10px] h-4 px-1 border-zinc-300 dark:border-zinc-600">Label</Badge>
<Badge variant="secondary" className="text-[10px] h-4 px-1 bg-zinc-100 dark:bg-zinc-800">Label</Badge>
```

### Action Buttons
```tsx
<Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
  <Edit className="h-2.5 w-2.5 mr-0.5" />
  Edit
</Button>
```

### Info Boxes
```tsx
<div className="bg-zinc-100 dark:bg-zinc-800/50 rounded p-2 border border-zinc-200 dark:border-zinc-700/50">
  <span className="text-[11px] text-zinc-700 dark:text-zinc-300">Content</span>
</div>
```

### Search Input
```tsx
<div className="relative w-64">
  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
  <Input
    placeholder="Search..."
    className="pl-7 h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
  />
</div>
```

## Key Rules
- Text sizes: `text-[11px]` body, `text-[10px]` secondary/buttons, `text-[9px]` tiny labels
- Heights: `h-6` buttons, `h-7` inputs, `h-8` table headers, `h-5` icon buttons
- Spacing: `p-3` containers, `space-y-2.5` sections, `gap-1` button groups
- Colors: Always use explicit `zinc-*` values, not `muted-foreground`
- Icons: `h-3 w-3` in buttons, `h-4 w-4` in headers, `h-2.5 w-2.5` in tiny buttons
- Convert card grids to tables where displaying lists of items
- Use inline stats in header instead of stat cards

## Command to Start
```
Continue the UI modernization. Read the ui_style_preferences memory and reference AdminControlCenter.tsx, then restyle all Training Hub components with zinc palette and compact layout. Start with TrainingHubPage.tsx and work through the tabs first.
```
