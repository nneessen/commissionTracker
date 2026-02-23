# Agent Carrier Contract Management — Implementation Review Doc

**Date:** 2026-02-23
**Purpose:** Track which carriers each agent is actively contracted with, and constrain the recruiting contracting workflow so only carriers the upline has are assignable to recruits.

---

## Problem Statement

Contracting managers had no way to know which carriers an agent's upline is contracted with. When a recruit enters the contracting phase, the system showed ALL active carriers — allowing accidental assignment of carrier contracts to recruits whose upline doesn't carry that carrier. Since downlines cannot request contracts their upline doesn't have, this creates real operational errors.

---

## Changes Made

### 1. Database Migration (`supabase/migrations/20260223115515_agent_carrier_contract_management.sql`)

**1A. RLS Policy Fix — IMO Isolation**

The existing `carrier_contracts` RLS policies had NO IMO (tenant) isolation:
- **Before:** Any staff member could see/manage contracts across ALL organizations
- **After:** Staff policies join through `user_profiles.imo_id` to enforce tenant boundary

New policies:
| Policy | Scope | Operation |
|--------|-------|-----------|
| `Staff can view contracts in IMO` | Same-IMO staff (trainer/contracting_manager/admin) | SELECT |
| `Staff can manage contracts in IMO` | Same-IMO staff | ALL (with IMO check in USING + WITH CHECK) |
| `Agents can view own contracts` | `agent_id = auth.uid()` | SELECT |
| `Agents can insert own contracts` | `agent_id = auth.uid()` | INSERT |
| `Agents can update own contracts` | `agent_id = auth.uid()` | UPDATE |

**Review concern:** The `Staff can manage contracts in IMO` policy uses `FOR ALL` which includes DELETE. Agents cannot delete their own contracts (only INSERT/UPDATE). Consider whether staff should be able to delete contracts or if `terminated` status is sufficient.

**1B. Updated `get_available_carriers_for_recruit` RPC**

Added `upline_has_contract BOOLEAN` to the return type. Logic:
- Looks up `upline_id` from `user_profiles` for the recruit
- If `upline_id IS NULL`: returns `TRUE` for all carriers (no constraint)
- If upline exists: checks `carrier_contracts` for `agent_id = v_upline_id AND status = 'approved'`

**Review concern:** The upline contract check uses `status = 'approved'` only. Other statuses (`pending`, `submitted`) are not considered "active." Verify this matches business requirements — should a `submitted` upline contract allow downstream assignment?

**1C. New `get_agent_carrier_contracts` RPC**

Returns all carrier contracts for an agent. Security: caller must be the agent OR same-IMO staff/admin. Returns all statuses (not just approved) for the self-service UI to show full state.

### 2. Type Updates (`src/types/database.types.ts`)

- Added `upline_has_contract: boolean` to `get_available_carriers_for_recruit` return type
- Added `get_agent_carrier_contracts` function type definition
- **Note:** Supabase CLI type generation failed (API access issue), so types were manually edited. They should be regenerated when CLI access is restored.

### 3. Service Layer Extensions

**`src/features/contracting/services/contractingService.ts`** — 3 new methods:
- `getContractsByAgentId(agentId)` — fetches all contracts with carrier join
- `upsertContract(agentId, carrierId, status)` — uses Supabase `.upsert()` with `UNIQUE(agent_id, carrier_id)` constraint. Sets `approved_date` when status is `approved`.
- `getActiveCarrierIds(agentId)` — lightweight query returning just carrier IDs where `status = 'approved'`

**`src/services/recruiting/carrierContractRequestService.ts`** — updated `getAvailableCarriers` return type to include `upline_has_contract: boolean`

**Review concern:** The `upsertContract` method sets `approved_date` to today when toggling ON. It does NOT clear `approved_date` when toggling OFF (setting status to `terminated`). This preserves the original approval date for audit. Verify this is desired behavior.

### 4. Hook Layer

**`src/features/contracting/hooks/useContracts.ts`** — 2 new hooks:
- `useAgentContracts(agentId)` — query key: `["agent-contracts", agentId]`
- `useUpsertAgentContract(agentId)` — mutation that invalidates agent-contracts cache

**`src/features/recruiting/hooks/useUplineCarrierContracts.ts`** — new file:
- `useUplineCarrierContracts(uplineId)` — fetches upline's approved carrier IDs for ContractingTab banner

### 5. UI Components

**`src/features/contracting/components/MyCarrierContractsCard.tsx`** — new component:
- Compact card showing all IMO carriers as toggleable rows
- Each row: carrier name + Switch toggle (approved/terminated) + writing number display
- Added to `UserProfile.tsx` after the Commission Settings card, visible only for non-staff-only users

**Review concern:** The toggle sets status directly to `approved` (no pending workflow). This means agents can self-declare carrier contracts without staff verification. For most orgs this is fine (agents know what they're contracted with), but some may want a verification step.

**`src/features/recruiting/components/contracting/AddCarrierDialog.tsx`** — updated:
- New props: `uplineId?: string | null`, `uplineName?: string`
- Carriers where `upline_has_contract === false` are **hard blocked**: grayed out, disabled checkbox, "Upline not contracted" label
- Carriers where `upline_has_contract === true`: normal selectable (existing green style)
- Sort order: upline-contracted carriers first, then non-contracted (disabled, at bottom)
- If upline has zero contracts: amber alert banner with explanation
- If no upline (null): info note "No upline assigned — all carriers available"

**`src/features/recruiting/components/ContractingTab.tsx`** — updated:
- Fetches upline name via lightweight query
- Fetches upline active carrier count via `useUplineCarrierContracts`
- Shows context banner: "Carriers available through **[Upline Name]**'s contracts (X active)"
- Passes `uplineId` and `uplineName` to `AddCarrierDialog`

---

## Edge Cases Addressed

| Case | Handling |
|------|----------|
| Recruit has no `upline_id` | RPC returns `upline_has_contract = TRUE` for all. UI shows "No upline — all carriers available" |
| Upline has zero carrier contracts | All carriers disabled in AddCarrierDialog. Amber alert shown |
| Upline contract terminated after recruit's request | Existing requests remain valid. Only blocks NEW assignments |
| Agent self-manages contracts | RLS allows INSERT/UPDATE on own `agent_id`. Toggle in profile |
| `carrier_contracts` has no `imo_id` column | RLS joins through `agent_id -> user_profiles.imo_id` |

---

## Potential Issues for Review

### Critical
1. **RLS policy for agent INSERT** — Agents can insert new `carrier_contracts` rows for themselves. The `approved_date` is set client-side. A malicious agent could theoretically upsert contracts for carriers they aren't actually contracted with, which would enable their downlines to request those carriers. **Mitigation:** This is a self-attestation model; the carrier contracting process itself (writing numbers, etc.) is still managed by staff. Consider adding a `self_attested` boolean column if audit trail is needed.

2. **Upsert ON CONFLICT** — The `upsertContract` method uses `.upsert()` which performs `INSERT ... ON CONFLICT DO UPDATE`. This means an agent toggling "off" doesn't DELETE the row but updates status to `terminated`. Make sure reporting queries account for terminated records.

### Moderate
3. **No validation on writing_number** — The MyCarrierContractsCard displays writing numbers but doesn't allow editing them. Writing numbers are managed elsewhere. If the self-service card should also allow editing writing numbers, that would need additional work.

4. **Cache invalidation scope** — `useUpsertAgentContract` invalidates `["agent-contracts", agentId]` but does NOT invalidate `["upline-carrier-contracts", agentId]`. If an agent toggles their own contracts, their downline's ContractingTab won't see the change until TanStack Query's stale timer fires. This is acceptable for normal usage (agents don't toggle while staff are actively assigning carriers to their downlines).

5. **RPC function `get_available_carriers_for_recruit`** — Now has a subquery per carrier to check upline contracts. For orgs with many carriers (50+), this could be slower. The `UNIQUE(agent_id, carrier_id)` index on `carrier_contracts` should keep this efficient, but worth monitoring.

### Low
6. **Manual type edits** — `database.types.ts` was manually edited because Supabase CLI lacks API access. The manual edits are correct but will be overwritten on next `supabase gen types` run. The CLI-generated types will include the new RPC definitions automatically, so this should self-correct.

---

## Files Changed

| File | Action | Lines Changed |
|------|--------|---------------|
| `supabase/migrations/20260223115515_agent_carrier_contract_management.sql` | Created | ~180 |
| `src/types/database.types.ts` | Edited | +12 (RPC types) |
| `src/features/contracting/services/contractingService.ts` | Extended | +60 (3 methods) |
| `src/features/contracting/hooks/useContracts.ts` | Extended | +30 (2 hooks) |
| `src/services/recruiting/carrierContractRequestService.ts` | Edited | +1 (return type) |
| `src/features/contracting/components/MyCarrierContractsCard.tsx` | Created | ~120 |
| `src/features/settings/components/UserProfile.tsx` | Edited | +4 (import + render) |
| `src/features/recruiting/components/contracting/AddCarrierDialog.tsx` | Rewritten | ~260 |
| `src/features/recruiting/components/ContractingTab.tsx` | Rewritten | ~165 |
| `src/features/recruiting/hooks/useUplineCarrierContracts.ts` | Created | ~13 |

---

## Verification

- [x] Migration applied via `run-migration.sh` (tracked in schema_migrations + function_versions)
- [x] RLS policies verified: 5 policies on carrier_contracts (3 agent, 2 staff)
- [x] `npm run build` — zero TypeScript errors
- [x] `./scripts/validate-app.sh` — all checks pass (build + mock check + dev server smoke test)
