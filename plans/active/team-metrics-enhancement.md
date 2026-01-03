# Team Metrics Enhancement Plan

## Status: Ready for Implementation

## Goal
Add two new metrics to the Team Page → Team Metrics Section:
1. **Total AP Submit (Pending)** - Sum of AP for all pending policies across team
2. **Team Pace Metric** - Team goal progress based on aggregated individual targets

---

## Implementation Overview

### Files to Modify
| File | Change |
|------|--------|
| `src/types/hierarchy.types.ts` | Add 5 new fields to HierarchyStats |
| `src/services/hierarchy/hierarchyService.ts` | Add pending AP + pace calculations |
| `src/features/hierarchy/components/TeamMetricsCard.tsx` | Display new metrics |

---

## Step 1: Update HierarchyStats Interface

**File:** `src/types/hierarchy.types.ts` (lines 180-206)

Add these fields after `pending_invitations`:

```typescript
export interface HierarchyStats {
  // ... existing fields ...

  // NEW: Pending AP Submission (policies not yet active)
  team_pending_ap_total: number;        // Sum of AP for status='pending' across owner + all downlines
  team_pending_policies_count: number;  // Count of pending policies

  // NEW: Team Pace Metrics (AP-based)
  team_monthly_ap_target: number;       // Sum of all team members' monthly AP targets
  team_pace_percentage: number;         // (actual AP MTD / expected AP at this point) * 100
  team_pace_status: 'ahead' | 'on_pace' | 'behind';
}
```

---

## Step 2: Update hierarchyService.getMyHierarchyStats()

**File:** `src/services/hierarchy/hierarchyService.ts` (lines 416-642)

### 2a. Add Pending AP Calculation

In the policy aggregation loop (around line 507), also track pending policies:

```typescript
// Add alongside existing teamAPTotal/teamPoliciesCount
let teamPendingAPTotal = 0;
let teamPendingPoliciesCount = 0;

// In the loop for each downline + ALSO for myProfile.id:
const allUserIds = [myProfile.id, ...downlineIds];

for (const userId of allUserIds) {
  const policyData = await this.getAgentPolicies(userId);
  const policies = policyData.policies || [];

  // Filter PENDING policies (no date filter - all pending)
  const pendingPolicies = policies.filter(
    (p: { status?: string }) => p.status === "pending"
  );

  const pendingAP = pendingPolicies.reduce(
    (sum: number, p: { annualPremium?: number | string }) =>
      sum + parseFloat(String(p.annualPremium) || "0"),
    0,
  );

  teamPendingAPTotal += pendingAP;
  teamPendingPoliciesCount += pendingPolicies.length;
}
```

### 2b. Add Team Pace Calculation (AP-based)

After the policy loop, fetch targets and calculate pace based on Team AP vs Team AP Target:

```typescript
import { userTargetsRepository } from "../targets/UserTargetsRepository";

// Fetch targets for all team members
const [downlineTargets, myTargets] = await Promise.all([
  userTargetsRepository.findDownlineWithOwner(),
  userTargetsRepository.findByUserId(myProfile.id)
]);

// Calculate monthly AP target for each team member
// Formula: (annual_policies_target * avg_premium_target) / 12
const calcMonthlyAPTarget = (t: { annualPoliciesTarget?: number; avgPremiumTarget?: number } | null) => {
  if (!t) return 0;
  const annualAP = (t.annualPoliciesTarget || 0) * (t.avgPremiumTarget || 0);
  return annualAP / 12;
};

// Sum team monthly AP targets
const downlineAPTargetSum = downlineTargets.reduce(
  (sum, t) => sum + calcMonthlyAPTarget({
    annualPoliciesTarget: t.annualPoliciesTarget,
    avgPremiumTarget: t.avgPremiumTarget
  }),
  0
);
const myMonthlyAPTarget = calcMonthlyAPTarget({
  annualPoliciesTarget: myTargets?.annual_policies_target,
  avgPremiumTarget: myTargets?.avg_premium_target
});
const teamMonthlyAPTarget = myMonthlyAPTarget + downlineAPTargetSum;

// Calculate expected pace based on day of month
const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
const dayOfMonth = now.getDate();
const expectedAPAtThisPoint = (dayOfMonth / daysInMonth) * teamMonthlyAPTarget;

// Use teamAPTotal (active policies AP) + teamPendingAPTotal for total production
// Or just teamAPTotal for "placed" AP vs teamAPTotal + pending for "submitted" AP
const teamAPProduction = teamAPTotal; // Active AP written this period

// Calculate pace percentage and status
const teamPacePercentage = expectedAPAtThisPoint > 0
  ? (teamAPProduction / expectedAPAtThisPoint) * 100
  : teamMonthlyAPTarget > 0 ? 0 : 100;

const teamPaceStatus: 'ahead' | 'on_pace' | 'behind' =
  teamPacePercentage >= 105 ? 'ahead' :
  teamPacePercentage >= 95 ? 'on_pace' : 'behind';
```

### 2c. Update Return Object

Add new fields to the result object:

```typescript
const result: HierarchyStats = {
  // ... existing fields ...

  // NEW: Pending AP
  team_pending_ap_total: teamPendingAPTotal,
  team_pending_policies_count: teamPendingPoliciesCount,

  // NEW: Team Pace (AP-based)
  team_monthly_ap_target: teamMonthlyAPTarget,
  team_pace_percentage: teamPacePercentage,
  team_pace_status: teamPaceStatus,
};
```

---

## Step 3: Update TeamMetricsCard UI

**File:** `src/features/hierarchy/components/TeamMetricsCard.tsx`

### 3a. Extract New Values

After existing value extractions (around line 54):

```typescript
// NEW: Pending AP
const teamPendingAP = stats?.team_pending_ap_total || 0;
const teamPendingCount = stats?.team_pending_policies_count || 0;

// NEW: Team Pace (AP-based)
const teamMonthlyAPTarget = stats?.team_monthly_ap_target || 0;
const teamPacePercentage = stats?.team_pace_percentage || 0;
const teamPaceStatus = stats?.team_pace_status || 'on_pace';
```

### 3b. Add Pending AP to Team Performance Column

Insert before the divider (around line 211):

```tsx
<div className="flex justify-between text-[11px]">
  <span className="text-zinc-500 dark:text-zinc-400">
    Pending AP
  </span>
  <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
    {formatCurrency(teamPendingAP)}
  </span>
</div>
<div className="flex justify-between text-[11px]">
  <span className="text-zinc-500 dark:text-zinc-400">
    Pending Policies
  </span>
  <span className="font-mono text-amber-600 dark:text-amber-400">
    {teamPendingCount}
  </span>
</div>
```

### 3c. Add Team Pace Section

Add new section after the 4-column grid (after line 299):

```tsx
{/* Team Pace Section - AP Based */}
{teamMonthlyAPTarget > 0 && (
  <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-6 text-[11px]">
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Monthly AP Target: </span>
          <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(teamMonthlyAPTarget)}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Team AP MTD: </span>
          <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(teamAPTotal)}
          </span>
        </div>
      </div>
      <div className={cn(
        "px-2 py-0.5 rounded text-[10px] font-semibold",
        teamPaceStatus === 'ahead'
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : teamPaceStatus === 'on_pace'
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      )}>
        {teamPaceStatus === 'ahead' ? '↑ Ahead' :
         teamPaceStatus === 'on_pace' ? '→ On Pace' : '↓ Behind'}
        {' '}({teamPacePercentage.toFixed(0)}%)
      </div>
    </div>
  </div>
)}
```

---

## Edge Cases to Handle

1. **No targets set**: Only show pace section if `teamMonthlyTarget > 0`
2. **Start of month (day 1)**: Calculate pace carefully to avoid division issues
3. **No pending policies**: Display $0 gracefully
4. **No downlines**: Include owner's own policies/targets in calculations
5. **Missing downline targets**: Only aggregate targets that exist

---

## Testing Checklist

- [ ] Pending AP sums correctly for owner + all downlines
- [ ] Pending count matches actual pending policies
- [ ] Team target aggregates all team member targets correctly
- [ ] Pace percentage calculates correctly based on day of month
- [ ] Pace status thresholds work (ahead ≥105%, on_pace ≥95%, behind <95%)
- [ ] UI displays correctly when no targets set
- [ ] UI displays correctly when no pending policies
- [ ] Typecheck passes: `npm run typecheck`
- [ ] Build passes: `npm run build`

---

## Implementation Order

1. Update `src/types/hierarchy.types.ts` - add 5 new fields
2. Update `src/services/hierarchy/hierarchyService.ts` - add calculations
3. Update `src/features/hierarchy/components/TeamMetricsCard.tsx` - display new metrics
4. Run typecheck and build
5. Test in browser
