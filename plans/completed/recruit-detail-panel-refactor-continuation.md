# Continuation Prompt: RecruitDetailPanel Refactor + Phone Column

## What Was Done (Previous Session)

### Step 1 (COMPLETE): Extracted `useRecruitCarrierContracts` hook
- **Created:** `src/features/recruiting/hooks/useRecruitCarrierContracts.ts`
- Exports: `useRecruitCarrierContracts`, `useUpdateCarrierContract`, `useAddCarrierContract`, `useDeleteCarrierContract`
- Unified query key: `["recruit-carrier-contracts", recruitId]` (fixes cache mismatch with `CarrierContractingItem.tsx` which was using a different key than the panel)
- **Updated:** `src/features/recruiting/hooks/index.ts` — added `export * from "./useRecruitCarrierContracts"`
- **NOT YET APPLIED to RecruitDetailPanel.tsx** — the panel still has inline `useQuery`/`useMutation` blocks and imports `carrierContractRequestService` directly

### Step 2 (COMPLETE): Created types + permissions
- **Created:** `src/features/recruiting/types/recruit-detail.types.ts`
  - `RecruitEntity` discriminated union: `{ kind: "registered"; recruit; recruitId }` | `{ kind: "invitation"; recruit; invitationId; invitationStatus }`
  - `RecruitPermissions` interface: `{ canManage, canInitialize, canDelete, isStaff }`
- **NOT YET APPLIED to RecruitDetailPanel.tsx** — the panel still uses `as any` casts and scattered permission checks

### Step 3 (IN PROGRESS): Split into subcomponents
- **Created:** `src/features/recruiting/components/RecruitDetailHeader.tsx` — avatar, name, status badge, email/phone display
- **Remaining subcomponents NOT created yet:**
  - `RecruitActionBar.tsx` — quick actions, invitation actions, Slack notifications, advance/block/revert buttons
  - `PhaseStepper.tsx` — horizontal phase visualization
  - `ContractingTab.tsx` — carrier contracts list, add carrier
  - `ActivityTab.tsx` — activity log display

### Steps 4-6 (NOT STARTED)
- Step 4: Add `key={selectedRecruit.id}` in 3 parent sites to fix state leakage
- Step 5: Enable queries only for active tab (pass `undefined` to inactive tab hooks)
- Step 6: Error states + replace `confirm()`/`prompt()` with AlertDialog

---

## What Remains To Do

### 1. Wire Steps 1-2 into RecruitDetailPanel.tsx
In `src/features/recruiting/components/RecruitDetailPanel.tsx`:
- **Remove** imports: `useQuery`, `useMutation`, `useQueryClient`, `carrierContractRequestService` (lines 74-75)
- **Remove** inline query/mutation blocks (lines 175-224)
- **Remove** wrapper handlers: `handleUpdateContractRequest`, `handleAddCarrier`, `handleDeleteContractRequest` (lines 367-377)
- **Import** `useRecruitCarrierContracts`, `useUpdateCarrierContract`, `useAddCarrierContract`, `useDeleteCarrierContract` from `../hooks/useRecruitCarrierContracts`
- **Import** `RecruitEntity`, `RecruitPermissions` from `../types/recruit-detail.types`
- **Derive** `entity: RecruitEntity` at top of component (replaces `isInvitation`, `invitationId`, `invitationStatus` vars + `as any` casts)
- **Derive** `permissions: RecruitPermissions` (replaces 5 inline role checks using `STAFF_ONLY_ROLES`)
- Remove unused `useRouter` import (line 52)

### 2. Finish extracting subcomponents (Step 3)
Create these files, extracting JSX from RecruitDetailPanel:
- `RecruitActionBar.tsx` (lines 487-784): Quick actions bar, invitation/registered actions, Slack notifications, advance/block/revert
- `PhaseStepper.tsx` (lines 788-882): Horizontal phase visualization with tooltips
- `ContractingTab.tsx` (lines 1005-1052): Carrier contracts list + AddCarrierDialog
- `ActivityTab.tsx` (lines 1074-1100): Activity log display

Each receives `entity` + `permissions` props. The panel becomes a ~250-line orchestrator.

### 3. Steps 4-6: Fixes
- **Step 4** — Add `key={selectedRecruit.id}` in:
  - `src/features/recruiting/RecruitingDashboard.tsx` lines 453, 647
  - `src/features/training-hub/components/RecruitingTab.tsx` line 484
- **Step 5** — Pass `undefined` to inactive tab hooks:
  ```tsx
  const { data: documents } = useRecruitDocuments(activeTab === "documents" ? recruitIdForQueries : undefined);
  const { data: emails } = useRecruitEmails(activeTab === "emails" ? recruitIdForQueries : undefined);
  const { data: activityLog } = useRecruitActivityLog(activeTab === "activity" ? recruitIdForQueries : undefined);
  ```
- **Step 6** — Replace `confirm()`/`prompt()` (lines 245, 254, 264, 290, 314, 529) with AlertDialog components; add error states for `progressError || currentPhaseError`

### 4. NEW TASK: Add Phone Number Column to RecruitListTable
**File:** `src/features/recruiting/components/RecruitListTable.tsx`

The table currently has these columns: Status dot | Name | Email | Progress | Recruiter | Days | Updated

Add a **Phone** column between Email and Progress:
- Header: `<TableHead>Phone</TableHead>` with same styling as other headers
- Cell: `recruit.phone` display — the `UserProfile` type already includes `phone: string | null`
- Update `colSpan` on the empty-state row from 7 to 8
- Keep the compact styling: `text-[11px]`, truncate if needed

### 5. Validation
After all changes:
```bash
npx tsc --noEmit
./scripts/validate-app.sh
```

---

## Critical File Reference

| File | Current State | Role |
|------|--------------|------|
| `src/features/recruiting/components/RecruitDetailPanel.tsx` | 1165 lines, UNMODIFIED from original | The file being refactored |
| `src/features/recruiting/hooks/useRecruitCarrierContracts.ts` | NEW, complete | Extracted hook (Step 1) |
| `src/features/recruiting/types/recruit-detail.types.ts` | NEW, complete | Types (Step 2) |
| `src/features/recruiting/components/RecruitDetailHeader.tsx` | NEW, complete | Extracted header (Step 3 partial) |
| `src/features/recruiting/hooks/index.ts` | MODIFIED, has new export | Hook barrel exports |
| `src/features/recruiting/components/interactive/CarrierContractingItem.tsx` | Uses `["recruit-carrier-contracts", recruitId]` key at line 78 — now matches new hook |
| `src/features/recruiting/components/RecruitListTable.tsx` | UNMODIFIED | Where phone column gets added |
| `src/services/recruiting/carrierContractRequestService.ts` | UNMODIFIED | Service wrapped by new hook |
| `src/features/recruiting/RecruitingDashboard.tsx` | UNMODIFIED | Parent — needs `key` prop (lines 453, 647) |
| `src/features/training-hub/components/RecruitingTab.tsx` | UNMODIFIED | Parent — needs `key` prop (line 484) |
| `src/types/recruiting.types.ts` | UNMODIFIED | InvitationStatus, TERMINAL_STATUS_COLORS, INVITATION_STATUS_LABELS |
| `src/constants/roles.ts` | UNMODIFIED | STAFF_ONLY_ROLES constant |

## Key Patterns & Rules
- **React 19**: NO `useMemo`/`useCallback` — React Compiler handles memoization
- **Naming**: PascalCase components, kebab-case files, camelCase functions
- **Query keys**: Always `["recruit-carrier-contracts", recruitId]` for carrier contracts
- **Permissions**: Unified via `RecruitPermissions` — `canManage = isUpline || is_admin || STAFF_ONLY_ROLES.some()`
- **Validation**: Always run `./scripts/validate-app.sh` after code changes
- **Migrations**: NEVER use psql directly, always `./scripts/migrations/run-migration.sh`
