# Agent Carrier Contract Management — Implementation Review Doc

**Date:** 2026-02-23
**Purpose:** Track which carriers each agent is actively contracted with, and constrain the recruiting contracting workflow so only carriers the upline has are assignable to recruits.

---

## Problem Statement

Contracting managers had no way to know which carriers an agent's upline is contracted with. When a recruit enters the contracting phase, the system showed ALL active carriers — allowing accidental assignment of carrier contracts to recruits whose upline doesn't carry that carrier. Since downlines cannot request contracts their upline doesn't have, this creates real operational errors.

---

## Changes Made

### Migration 1: `20260223115515_agent_carrier_contract_management.sql`

**1A. RLS Policy Fix — IMO Isolation**

| Policy | Scope | Operation |
|--------|-------|-----------|
| `Staff can view contracts in IMO` | Same-IMO staff (trainer/contracting_manager/admin) | SELECT |
| `Staff can manage contracts in IMO` | Same-IMO staff | ALL (with IMO check in USING + WITH CHECK) |
| `Agents can view own contracts` | `agent_id = auth.uid()` | SELECT |

Agents have **read-only** RLS access. All writes go through a server-side RPC (see migration 2).

**1B. Updated `get_available_carriers_for_recruit` RPC**

Added `upline_has_contract BOOLEAN` to the return type. If upline exists, checks `carrier_contracts` for `agent_id = v_upline_id AND status = 'approved'`. If no upline, returns `TRUE` for all.

**1C. `get_agent_carrier_contracts` RPC**

Returns all carrier contracts for an agent, filtered to carriers in the agent's IMO. Security: caller must be the agent OR same-IMO staff/admin.

### Migration 2: `20260223121512_harden_carrier_contract_security.sql`

This migration was created in response to security review findings.

**Fix #1: BEFORE INSERT trigger on `carrier_contract_requests`** (Critical finding)

The `enforce_upline_carrier_contract` trigger runs on every INSERT to `carrier_contract_requests`. It checks:
- If the recruit has no `upline_id`: allows all carriers (RETURN NEW)
- If upline exists: verifies `carrier_contracts` has a row with `agent_id = upline_id AND carrier_id = NEW.carrier_id AND status = 'approved'`
- If check fails: raises exception with `check_violation` error code

This is the **database-level enforcement** of the upline contract rule. The UI disable is now a convenience; the trigger is the actual guard.

**Fix #2: `toggle_agent_carrier_contract` RPC** (Critical finding)

Replaced direct agent INSERT/UPDATE RLS policies with a narrow SECURITY DEFINER RPC that:
- Validates caller is authenticated (`auth.uid()`)
- Validates carrier belongs to agent's IMO (cross-tenant protection)
- Only allows `approved` or `terminated` status (no arbitrary status injection)
- Stamps `approved_date` server-side using `CURRENT_DATE` (timezone-safe)
- Preserves `approved_date` when deactivating (audit trail)
- Uses `ON CONFLICT (agent_id, carrier_id) DO UPDATE` for atomic upsert

Agent INSERT/UPDATE RLS policies were dropped. Agents can only read their own contracts via RLS.

**Fix #3: Hardened `get_agent_carrier_contracts`** (Moderate finding)

Added `AND c.imo_id = v_agent_imo_id` to the carrier JOIN, preventing cross-tenant data leaks if mixed-tenant `carrier_contracts` rows exist.

### Service Layer

**`contractingService.ts`** — key methods:
- `getContractsByAgentId(agentId)` — fetches all contracts with carrier join (uses RLS)
- `toggleContract(carrierId, active)` — calls `toggle_agent_carrier_contract` RPC
- `getActiveCarrierIds(agentId)` — lightweight query for carrier IDs where `status = 'approved'`

**`carrierContractRequestService.ts`** — `getAvailableCarriers` return type includes `upline_has_contract: boolean`

### Hooks

- `useAgentContracts(agentId)` — query for agent's carrier contracts
- `useToggleAgentContract(agentId)` — mutation calling the server-side RPC, invalidates both `agent-contracts` and `upline-carrier-contracts` caches
- `useUplineCarrierContracts(uplineId)` — fetches upline's approved carrier IDs

### UI Components

**`MyCarrierContractsCard`** — self-service carrier toggle card in agent profile
- Toggle calls `toggle_agent_carrier_contract` RPC (server-validated)
- Shows writing numbers from existing contracts
- Only visible for non-staff-only users (inside `!isStaffOnly` conditional)

**`AddCarrierDialog`** — upline-aware carrier selection
- Carriers where `upline_has_contract === false` are hard blocked (disabled, "Upline not contracted")
- Even if UI is bypassed, the `enforce_upline_carrier_contract` trigger blocks the insert

**`ContractingTab`** — upline context banner
- Shows upline name and active carrier count
- Passes upline context to `AddCarrierDialog`

---

## Security Architecture

```
UI Layer (advisory)          DB Layer (enforcement)
─────────────────           ─────────────────────
AddCarrierDialog             enforce_upline_carrier_contract trigger
  disables checkbox    →       BEFORE INSERT on carrier_contract_requests
  "Upline not contracted"     RAISE EXCEPTION if upline lacks carrier

MyCarrierContractsCard       toggle_agent_carrier_contract RPC
  toggle switch         →       validates carrier in agent's IMO
                               only allows approved/terminated
                               stamps dates server-side

RLS on carrier_contracts     Staff: IMO-scoped ALL
                             Agents: SELECT only (no direct writes)
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| Recruit has no `upline_id` | Trigger allows all. RPC returns `upline_has_contract = TRUE`. UI: "No upline — all carriers available" |
| Upline has zero carrier contracts | Trigger blocks all inserts. UI: all carriers disabled with amber alert |
| Upline contract terminated after recruit's request | Existing requests remain. Trigger only blocks NEW inserts |
| Agent toggles carrier off | `approved_date` preserved in DB (audit trail) |
| Agent tries carrier from different IMO | RPC raises "Carrier does not belong to your organization" |
| Modified client bypasses UI disable | Trigger raises "upline does not have an approved contract" |
| Direct API call to insert carrier_contract for agent | Blocked: agent INSERT RLS policy was removed. Must use RPC. |

---

## Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/20260223115515_agent_carrier_contract_management.sql` | Created |
| `supabase/migrations/20260223121512_harden_carrier_contract_security.sql` | Created |
| `src/types/database.types.ts` | Edited (3 RPC type definitions) |
| `src/features/contracting/services/contractingService.ts` | Extended (toggleContract, getContractsByAgentId, getActiveCarrierIds) |
| `src/features/contracting/hooks/useContracts.ts` | Extended (useAgentContracts, useToggleAgentContract) |
| `src/services/recruiting/carrierContractRequestService.ts` | Updated return type |
| `src/features/contracting/components/MyCarrierContractsCard.tsx` | Created |
| `src/features/settings/components/UserProfile.tsx` | Added card integration |
| `src/features/recruiting/components/contracting/AddCarrierDialog.tsx` | Rewritten with upline awareness |
| `src/features/recruiting/components/ContractingTab.tsx` | Rewritten with upline context |
| `src/features/recruiting/hooks/useUplineCarrierContracts.ts` | Created |

---

## Verification

- [x] Migrations applied via `run-migration.sh`
- [x] RLS policies verified: 3 policies on carrier_contracts (1 agent SELECT, 2 staff)
- [x] `enforce_upline_carrier_contract` trigger confirmed on `carrier_contract_requests`
- [x] `npm run build` — zero TypeScript errors
- [x] `./scripts/validate-app.sh` — all checks pass
