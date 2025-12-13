# Type Architecture Audit

**Audit Date**: 2024-12-12
**Auditor**: Automated via Claude Code
**Branch**: type-consolidation-phase1

---

## Summary

| Metric | Value |
|--------|-------|
| Total Type Files | 31 |
| Total Lines | 9,875 |
| Files Using database.types.ts | 5 (16%) |
| Duplicate Type Definitions | 8+ |
| Critical Issues | 3 |

---

## Type File Inventory

| Type File | Lines | DB Table | Uses DB Types? | Duplicates? | Imports | Notes |
|-----------|-------|----------|----------------|-------------|---------|-------|
| `database.types.ts` | 5,126 | * (all tables) | N/A (source) | N/A | 17 | Auto-generated, underutilized |
| `database.ts` | 74 | - | No | - | 0 | Generic DB helpers, NOT auto-generated |
| `hierarchy.types.ts` | 244 | user_profiles | No | UserProfile! | 29 | Most imported, has UserProfile dup |
| `user.types.ts` | 102 | auth.users | No | User (manual) | 6 | Manual User, Chargeback, NavigationItem |
| `policy.types.ts` | 142 | policies | No | PolicyClient | 21 | Manual Policy interface |
| `commission.types.ts` | 159 | commissions | No | Client (dup!) | 19 | Inline Client definition |
| `carrier.types.ts` | 112 | carriers | No | Carrier | 6 | Manual Carrier + DEFAULT_CARRIERS |
| `client.types.ts` | 290 | clients | Yes (partial) | - | 1 | Uses ClientRow from DB, good pattern |
| `product.types.ts` | 143 | products | Yes (enums) | - | 17+ | Uses ProductType from DB enum |
| `comp.types.ts` | 67 | comp_guide | Yes | - | 8 | Uses DB types correctly |
| `expense.types.ts` | 286 | expenses | Yes | - | - | Uses DB types correctly |
| `recruiting.types.ts` | 121 | pipeline_* | Yes (enums) | - | 3 | Uses AgentStatus from DB enum |
| `recruiting.ts` | 486 | - | No | Duplicate! | - | DUPLICATE of recruiting.types.ts |
| `messaging.types.ts` | 99 | - | No | UserProfile! | 3 | Minimal UserProfile (6 fields) |
| `agent.types.ts` | 93 | - | No | AgentSettings | 2 | Should merge into user.types.ts |
| `agent-detail.types.ts` | 116 | - | No | - | 1 | Agent UI types, could merge |
| `permissions.types.ts` | 170 | roles, permissions | No | - | - | RBAC types |
| `targets.types.ts` | 160 | - | No | - | - | Target/goal types |
| `metrics.types.ts` | 203 | - | No | CarrierPerformance (2x) | - | KPI metrics |
| `dashboard.types.ts` | 224 | - | No | - | - | Dashboard UI types |
| `reports.types.ts` | 226 | - | No | - | - | Report types |
| `workflow.types.ts` | 220 | workflow_events | No | - | - | Workflow system |
| `workflow-recipients.types.ts` | 128 | - | No | - | - | Workflow notification types |
| `notification.types.ts` | 107 | notifications | No | - | - | Notification types |
| `invitation.types.ts` | 107 | invitations | No | - | - | Invitation types |
| `email.types.ts` | 449 | email_* | No | - | - | Email system types |
| `monitoring.types.ts` | 99 | - | No | - | - | System monitoring |
| `ui.types.ts` | 84 | - | No | - | - | Generic UI types |
| `hooks.ts` | 29 | - | No | - | - | Hook utility types |
| `index.ts` | 9 | - | No | - | - | Barrel exports (incomplete) |
| `TODO.md` | - | - | - | - | - | Should be removed |

---

## Import Counts by Type File

| Type File | Import Count | Notes |
|-----------|-------------|-------|
| `database.types.ts` | 17 | Should be 50+ |
| `hierarchy.types.ts` | 29 | Most used (for UserProfile) |
| `policy.types.ts` | 21 | High usage |
| `commission.types.ts` | 19 | High usage |
| `product.types.ts` | 17 | Uses DB enums correctly |
| `comp.types.ts` | 8 | Uses DB types correctly |
| `user.types.ts` | 6 | Low usage |
| `carrier.types.ts` | 6 | Low usage |
| `messaging.types.ts` | 3 | Low usage |
| `recruiting.types.ts` | 3 | Low usage |
| `agent.types.ts` | 2 | Very low |
| `agent-detail.types.ts` | 1 | Minimal |
| `client.types.ts` | 1 | Underutilized |

---

## Files Using Database-First Pattern (CORRECT)

These files correctly derive types from `database.types.ts`:

1. **`client.types.ts`** (partial)
   ```typescript
   import {Database} from './database.types';
   export type ClientRow = Database['public']['Tables']['clients']['Row'];
   ```

2. **`product.types.ts`** (enums only)
   ```typescript
   import {Database} from './database.types';
   export type ProductType = Database["public"]["Enums"]["product_type"];
   ```

3. **`recruiting.types.ts`** (enums only)
   ```typescript
   import type {Database} from './database.types';
   export type AgentStatus = Database['public']['Enums']['agent_status'];
   ```

4. **`comp.types.ts`**
   ```typescript
   import {Database} from "./database.types";
   ```

5. **`expense.types.ts`**
   ```typescript
   import type {Database} from './database.types';
   ```

---

## Critical Duplicate Types

### 1. UserProfile (CRITICAL - 3 definitions)

| Location | Fields | Nullable? | Timestamp Type |
|----------|--------|-----------|----------------|
| `hierarchy.types.ts:11` | 40 | Mixed | Date |
| `messaging.types.ts:48` | 6 | Yes | - |
| `userService.ts:10` | 62 | Mixed | string |
| **Database truth** | 53 | Yes | string |

### 2. Client (2 definitions)

| Location | Fields | Notes |
|----------|--------|-------|
| `client.types.ts:15` | 10 | Proper, uses snake_case |
| `commission.types.ts:4` | 3 | Minimal: name, age, state |

### 3. Carrier (3 definitions)

| Location | Fields | Notes |
|----------|--------|-------|
| `carrier.types.ts:1` | 8 | Manual with contact_info object |
| `carrierService.ts:14` | extends CarrierRow | Correct pattern! |
| `useCarriers.ts:5` | 6 | Simplified, missing fields |

### 4. NewCarrierForm (2 definitions)

| Location | Notes |
|----------|-------|
| `carrier.types.ts:30` | With contact_info |
| `carrierService.ts:16` | Duplicate |

---

## Files to Merge/Delete

### DELETE (Duplicates)
- [ ] `recruiting.ts` - Merge into `recruiting.types.ts`
- [ ] `database.ts` - Rename or clarify purpose (not auto-generated)
- [ ] `TODO.md` - Remove from types directory

### MERGE
- [ ] `agent.types.ts` + `agent-detail.types.ts` → `user.types.ts`
- [ ] `comp.types.ts` → `commission.types.ts`

### CONSOLIDATE UserProfile
- [ ] Remove from `hierarchy.types.ts` (import from user.types)
- [ ] Remove from `messaging.types.ts` (import from user.types)
- [ ] Remove from `userService.ts` (import from user.types)
- [ ] Create canonical `UserProfile` in `user.types.ts` using DB-first pattern

---

## Target State

| Metric | Current | Target |
|--------|---------|--------|
| Type Files | 31 | ~18 |
| Lines | 9,875 | ~6,000 |
| DB Types Usage | 17 | 50+ |
| Duplicate Definitions | 8+ | 0 |
| Files Using DB-First | 5 | 15+ |

---

## Next Steps (Phase 2)

1. Create canonical `UserProfile` using database-first pattern
2. Update all imports to use single source
3. Delete duplicate files
4. Add type validation tests
