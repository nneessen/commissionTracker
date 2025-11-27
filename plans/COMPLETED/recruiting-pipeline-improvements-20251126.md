# Recruiting Pipeline - Bug Fixes & Admin UI Plan

**Created:** 2025-11-26
**Status:** Ready for Implementation

---

## Summary

Fix critical UI bugs, implement filter functionality, and build admin pipeline management UI. Database schema and services already exist - this work is UI-focused.

**User Decisions:**
- Table Layout: Wider left panel (col-span-8 / col-span-4)
- Admin UI: Full admin UI with drag-and-drop
- Filters: Full filter set (Phase, Status, Recruiter, Upline, Date Range, Referral Source)

---

## Phase 1: Critical Bug Fixes

### 1.1 Table Width Fix
**File:** `src/features/recruiting/RecruitingDashboard.tsx`

Change grid split:
- Left panel: `col-span-5` → `col-span-8`
- Right panel: `col-span-7` → `col-span-4`

### 1.2 Remove Hard Borders

**RecruitListTable.tsx (line 72):**
```tsx
// FROM:
<div className="border border-b-0 overflow-auto max-h-[calc(100vh-200px)]">
// TO:
<div className="overflow-auto max-h-[calc(100vh-200px)] bg-muted/10 rounded-sm">
```

**PhaseTimeline.tsx:**
- Remove `border-b` from phase rows (line 81)
- Replace `border-l-2` in getPhaseColor with subtle backgrounds only

**PhaseChecklist.tsx:**
- Replace `border-b` with `border-b border-muted/20` (very subtle)

### 1.3 Add Status Legend
**New File:** `src/features/recruiting/components/StatusLegend.tsx`

```tsx
export function StatusLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
      <span className="font-medium">Status:</span>
      <span>🟢 On Track</span>
      <span>🟡 Needs Attention</span>
      <span>🔴 Blocked/Stale</span>
      <span>✅ Completed</span>
    </div>
  );
}
```

Add above RecruitListTable in RecruitingDashboard.

### 1.4 TypeScript Verification
Run `npx tsc --noEmit` after changes.

---

## Phase 2: Filter Functionality

### 2.1 Create FilterDialog Component
**New File:** `src/features/recruiting/components/FilterDialog.tsx`

**Filters to implement:**
| Filter | Type | Source |
|--------|------|--------|
| Phase | Multi-select | PHASE_DISPLAY_NAMES (8 phases) |
| Status | Multi-select | lead, active, completed, dropped |
| Recruiter | Dropdown | Extract from recruits |
| Upline | Dropdown | Extract from recruits |
| Referral Source | Dropdown | Extract from recruits |
| Date Range | DateRangePicker | created_at |

### 2.2 Filter State in RecruitingDashboard
```tsx
const [filters, setFilters] = useState<RecruitFilters>({});
const [filterDialogOpen, setFilterDialogOpen] = useState(false);

// Extract unique values for dropdowns
const recruiters = useMemo(() => [...new Set(recruits?.map(r => r.recruiter))].filter(Boolean), [recruits]);
const uplines = useMemo(() => [...new Set(recruits?.map(r => r.upline))].filter(Boolean), [recruits]);
const referralSources = useMemo(() => [...new Set(recruits?.map(r => r.referral_source))].filter(Boolean), [recruits]);

// Apply filters
const filteredRecruits = useMemo(() => {
  if (!recruits) return [];
  return recruits.filter(recruit => {
    if (filters.phases?.length && !filters.phases.includes(recruit.current_onboarding_phase)) return false;
    if (filters.statuses?.length && !filters.statuses.includes(recruit.onboarding_status)) return false;
    if (filters.recruiterId && recruit.recruiter_id !== filters.recruiterId) return false;
    if (filters.uplineId && recruit.assigned_upline_id !== filters.uplineId) return false;
    if (filters.referralSource && recruit.referral_source !== filters.referralSource) return false;
    if (filters.dateRange?.start && new Date(recruit.created_at) < filters.dateRange.start) return false;
    if (filters.dateRange?.end && new Date(recruit.created_at) > filters.dateRange.end) return false;
    return true;
  });
}, [recruits, filters]);
```

### 2.3 Active Filter Badge
Show count of active filters on button.

---

## Phase 3: Admin Pipeline Management UI

### 3.1 Route Setup
**File:** `src/router.tsx`

Add route: `/recruiting/admin/pipelines` → `PipelineAdminPage`

### 3.2 Component Structure
```
src/features/recruiting/admin/
├── PipelineAdminPage.tsx        # Main page container
├── PipelineTemplatesList.tsx    # Template table with CRUD
├── PipelineTemplateEditor.tsx   # Edit single template
├── PhaseEditor.tsx              # Manage phases (drag-and-drop)
└── ChecklistItemEditor.tsx      # Manage checklist items
```

### 3.3 PipelineTemplatesList
- Table: Name, Description, Active, Default, Actions
- Actions: Edit, Clone, Delete, Set Default
- Uses: `useTemplates`, `useDeleteTemplate`, `useSetDefaultTemplate`

### 3.4 PipelineTemplateEditor
- Form: name, description, is_active toggle
- Embedded PhaseEditor below
- Uses: `useTemplate`, `useUpdateTemplate`

### 3.5 PhaseEditor
- Sortable table of phases
- Columns: Handle, Order, Name, Est. Days, Auto-Advance, Items, Actions
- Expand row to show ChecklistItemEditor
- Uses: `usePhases`, `useCreatePhase`, `useUpdatePipelinePhase`, `useDeletePhase`, `useReorderPhases`

### 3.6 ChecklistItemEditor
- Inline table when phase expanded
- Columns: Handle, Order, Name, Type, Required, Completed By, Actions
- Item types: document_upload, task_completion, training_module, manual_approval, automated_check, signature_required
- Uses: `useChecklistItems`, `useCreateChecklistItem`, `useUpdateChecklistItem`, `useDeleteChecklistItem`, `useReorderChecklistItems`

---

## Phase 4: Additional Features

### 4.1 Export CSV
Add to RecruitingDashboard:
```tsx
const handleExport = () => {
  const headers = ['Name', 'Email', 'Phone', 'Phase', 'Status', 'Recruiter', 'Upline', 'Days', 'Referral', 'Created'];
  const rows = filteredRecruits.map(r => [
    `${r.first_name} ${r.last_name}`,
    r.email, r.phone, r.current_onboarding_phase, r.onboarding_status,
    r.recruiter?.first_name, r.upline?.first_name,
    calculateDaysInPhase(r), r.referral_source, r.created_at
  ]);
  // Generate and download CSV
};
```

### 4.2 Bulk Email
Show placeholder toast: "Bulk email feature coming soon!"

---

## Existing Infrastructure (No Changes Needed)

### Database Tables (EXIST)
- `pipeline_templates`
- `pipeline_phases`
- `phase_checklist_items`
- `recruit_phase_progress`
- `recruit_checklist_progress`

### Services (EXIST)
- `pipelineService.ts` - Full CRUD
- `checklistService.ts` - Progress tracking

### Hooks (EXIST in usePipeline.ts)
19 hooks ready to use for templates, phases, and checklist items.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/features/recruiting/RecruitingDashboard.tsx` | Layout (col-span), filter state, CSV export |
| `src/features/recruiting/components/RecruitListTable.tsx` | Remove `border border-b-0` |
| `src/features/recruiting/components/PhaseTimeline.tsx` | Remove `border-b`, `border-l-2` |
| `src/features/recruiting/components/PhaseChecklist.tsx` | Soften borders to `border-muted/20` |
| `src/router.tsx` | Add admin route |

## Files to Create

| File | Purpose |
|------|---------|
| `src/features/recruiting/components/StatusLegend.tsx` | Legend component |
| `src/features/recruiting/components/FilterDialog.tsx` | Filter dialog |
| `src/features/recruiting/admin/PipelineAdminPage.tsx` | Admin container |
| `src/features/recruiting/admin/PipelineTemplatesList.tsx` | Template list |
| `src/features/recruiting/admin/PipelineTemplateEditor.tsx` | Template editor |
| `src/features/recruiting/admin/PhaseEditor.tsx` | Phase management |
| `src/features/recruiting/admin/ChecklistItemEditor.tsx` | Checklist management |

---

## Design Rules (MUST FOLLOW)

- Row height: `h-6` (24px)
- Text: `text-xs font-mono`
- Padding: `p-1` max
- **NO hard borders** - use `bg-muted/20` or `border-muted/20` max
- Muted colors only: `bg-muted/30`, `text-muted-foreground`
- No gradients, no bright colors

---

## Testing Checklist

- [ ] Table displays 8/4 column split correctly
- [ ] No visible hard borders
- [ ] Status legend displays above table
- [ ] All 6 filters work correctly
- [ ] Filter badge shows active count
- [ ] Admin route loads at `/recruiting/admin/pipelines`
- [ ] Template CRUD works
- [ ] Phase CRUD + reordering works
- [ ] Checklist item CRUD works
- [ ] CSV export downloads file
- [ ] TypeScript compiles with 0 errors
- [ ] App loads without console errors
