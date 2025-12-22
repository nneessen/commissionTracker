# Plan: Remove Duplicate Recruiting Pipeline from Dashboard

## Problem
The dashboard shows the recruiting pipeline twice:
1. In Row 3 (OrgMetricsSection) - for IMO/Agency admins
2. In Row 4 (TeamRecruitingSection) - the detailed infographic at the bottom

## Solution
Remove the recruiting pipeline panels from OrgMetricsSection since the more detailed version is already shown in TeamRecruitingSection.

## Changes Required

### 1. Update OrgMetricsSection.tsx
- Remove `ImoRecruitingSummaryPanel` from IMO admin view (line 745)
- Remove `AgencyRecruitingSummaryPanel` from Agency owner view (line 758)
- Adjust grid layouts to accommodate fewer columns
- Remove unused components and imports

### Files to Modify
- `src/features/dashboard/components/OrgMetricsSection.tsx`

## Layout Changes

**Before (IMO Admin):**
- Grid: `[300px_300px_300px_1fr]` (4 columns)
- ImoMetricsPanel | ImoOverrideSummaryPanel | ImoRecruitingSummaryPanel | ProductionBreakdownPanel

**After (IMO Admin):**
- Grid: `[300px_300px_1fr]` (3 columns)
- ImoMetricsPanel | ImoOverrideSummaryPanel | ProductionBreakdownPanel

**Before (Agency Owner):**
- Grid: `[300px_300px_300px]` (3 columns)
- AgencyMetricsPanel | AgencyOverrideSummaryPanel | AgencyRecruitingSummaryPanel

**After (Agency Owner):**
- Grid: `[300px_300px]` (2 columns)
- AgencyMetricsPanel | AgencyOverrideSummaryPanel
