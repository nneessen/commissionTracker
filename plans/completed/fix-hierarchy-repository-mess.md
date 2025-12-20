# URGENT: Fix HierarchyRepository Architectural Violations

## Problem Summary

A careless refactoring of `hierarchyService` created severe architectural violations:

1. **HierarchyRepository** was polluted with queries for `policies`, `commissions`, and `override_commissions` tables
2. These queries duplicate functionality that belongs in domain-specific repositories
3. Violates SRP, DRY, and domain boundaries

**This MUST be fixed before any further service refactoring.**

---

## Current State (BROKEN)

### HierarchyRepository contains methods it should NOT have:

**Policy queries (WRONG - belong in PolicyRepository):**
```
- findPoliciesByUserId
- findPoliciesByUserIds
- findPoliciesWithRelationsByUserId
- findRecentPoliciesByUserId
```

**Commission queries (WRONG - belong in CommissionRepository):**
```
- findCommissionsByUserId
- findCommissionsByUserIds
- findCommissionsWithPolicyByUserId
```

**Override queries (WRONG - belong in OverrideRepository):**
```
- findOverridesByBaseAgentIds
- findOverridesByBaseAgentId
- findOverridesByOverrideAgentId
- findOverridesForAgentInRange
- findOverridesByBaseAgentIdInRange
```

### HierarchyRepository should ONLY contain:
```
- findDownlinesByHierarchyPath (hierarchy query on user_profiles)
- findByIds (batch user_profiles lookup)
- findDirectReportsByUplineId (hierarchy query on user_profiles)
- updateUpline (hierarchy mutation on user_profiles)
- transformFromDB / transformToDB
```

---

## Existing Repositories to Extend

### PolicyRepository (src/services/policies/PolicyRepository.ts)

**Already has:**
- findByAgent(userId: string) - finds policies for single user

**Needs added:**
- findByAgents(userIds: string[]) - batch version
- findMetricsByUserIds(userIds: string[]) - returns {user_id, status, annual_premium}
- findWithRelationsByUserId(userId: string) - with client/carrier joins
- findRecentByUserId(userId: string, limit: number)

### CommissionRepository (src/services/commissions/CommissionRepository.ts)

**Already has:**
- findByAgent exists? Need to verify

**Needs added:**
- findByAgents(userIds: string[]) - batch version
- findMetricsByUserIds(userIds: string[]) - returns {user_id, amount, status, earned_amount}
- findWithPolicyByUserId(userId: string) - with policy join

### OverrideRepository (DOES NOT EXIST - must create)

**Location:** src/services/overrides/OverrideRepository.ts

**Methods needed:**
- findByBaseAgentId(baseAgentId: string)
- findByBaseAgentIds(baseAgentIds: string[])
- findByOverrideAgentId(overrideAgentId: string, startDate?: string)
- findForAgentInRange(agentId: string, startDate: string)
- findByBaseAgentIdInRange(baseAgentId: string, startDate: string)

---

## Execution Steps

### Step 1: Extend PolicyRepository

File: `src/services/policies/PolicyRepository.ts`

Add these methods:

```typescript
/**
 * Find policies for multiple agents (batch)
 */
async findByAgents(userIds: string[]): Promise<Policy[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await this.client
    .from(this.tableName)
    .select(`*, clients!policies_client_id_fkey(id, name, email, phone, address)`)
    .in("user_id", userIds)
    .order("created_at", { ascending: false });

  if (error) throw this.handleError(error, "findByAgents");
  return data?.map(this.transformFromDB) || [];
}

/**
 * Find policy metrics for multiple users (lightweight)
 */
async findMetricsByUserIds(userIds: string[]): Promise<Array<{
  user_id: string;
  status: string | null;
  annual_premium: number | string | null;
}>> {
  if (userIds.length === 0) return [];

  const { data, error } = await this.client
    .from(this.tableName)
    .select("user_id, status, annual_premium")
    .in("user_id", userIds);

  if (error) throw this.handleError(error, "findMetricsByUserIds");
  return data || [];
}

/**
 * Find policies with client/carrier relations
 */
async findWithRelationsByUserId(userId: string): Promise<PolicyWithRelations[]> {
  const { data, error } = await this.client
    .from(this.tableName)
    .select(`
      *,
      client:clients(name),
      carrier:carriers(name)
    `)
    .eq("user_id", userId)
    .order("effective_date", { ascending: false });

  if (error) throw this.handleError(error, "findWithRelationsByUserId");
  return data || [];
}

/**
 * Find recent policies for a user
 */
async findRecentByUserId(userId: string, limit: number = 5): Promise<Policy[]> {
  const { data, error } = await this.client
    .from(this.tableName)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw this.handleError(error, "findRecentByUserId");
  return data?.map(this.transformFromDB) || [];
}
```

Also add necessary type exports to the PolicyRepository file or index.

---

### Step 2: Extend CommissionRepository

File: `src/services/commissions/CommissionRepository.ts`

First, check if findByAgent exists. If not, add it.

Add these methods:

```typescript
/**
 * Find commissions for multiple agents (batch)
 */
async findByAgents(userIds: string[]): Promise<Commission[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await this.client
    .from(this.tableName)
    .select("*")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });

  if (error) throw this.handleError(error, "findByAgents");
  return data?.map(this.transformFromDB) || [];
}

/**
 * Find commission metrics for multiple users (lightweight)
 */
async findMetricsByUserIds(userIds: string[]): Promise<Array<{
  user_id: string;
  amount: number | string | null;
  status: string | null;
  earned_amount: number | string | null;
}>> {
  if (userIds.length === 0) return [];

  const { data, error } = await this.client
    .from(this.tableName)
    .select("user_id, amount, status, earned_amount")
    .in("user_id", userIds);

  if (error) throw this.handleError(error, "findMetricsByUserIds");
  return data || [];
}

/**
 * Find commissions with policy relation
 */
async findWithPolicyByUserId(userId: string): Promise<CommissionWithPolicy[]> {
  const { data, error } = await this.client
    .from(this.tableName)
    .select(`
      *,
      policy:policies(policy_number)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw this.handleError(error, "findWithPolicyByUserId");
  return data || [];
}
```

---

### Step 3: Create OverrideRepository

File: `src/services/overrides/OverrideRepository.ts`

```typescript
// src/services/overrides/OverrideRepository.ts
import { BaseRepository, BaseEntity } from "../base/BaseRepository";

export interface OverrideMetricRow {
  base_agent_id: string;
  override_agent_id?: string;
  override_commission_amount: number | string | null;
  status: string | null;
  created_at?: string;
}

export class OverrideRepository extends BaseRepository<...> {
  constructor() {
    super("override_commissions");
  }

  async findByBaseAgentId(baseAgentId: string): Promise<OverrideMetricRow[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("base_agent_id, override_commission_amount, status")
      .eq("base_agent_id", baseAgentId);

    if (error) throw this.handleError(error, "findByBaseAgentId");
    return data || [];
  }

  async findByBaseAgentIds(baseAgentIds: string[]): Promise<OverrideMetricRow[]> {
    if (baseAgentIds.length === 0) return [];

    const { data, error } = await this.client
      .from(this.tableName)
      .select("base_agent_id, override_commission_amount, status")
      .in("base_agent_id", baseAgentIds);

    if (error) throw this.handleError(error, "findByBaseAgentIds");
    return data || [];
  }

  async findByOverrideAgentId(
    overrideAgentId: string,
    startDate?: string
  ): Promise<OverrideMetricRow[]> {
    let query = this.client
      .from(this.tableName)
      .select("override_agent_id, override_commission_amount, status, created_at")
      .eq("override_agent_id", overrideAgentId);

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    const { data, error } = await query;
    if (error) throw this.handleError(error, "findByOverrideAgentId");
    return data || [];
  }

  async findForAgentInRange(
    agentId: string,
    startDate: string
  ): Promise<OverrideMetricRow[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("override_commission_amount, override_agent_id, base_agent_id")
      .or(`override_agent_id.eq.${agentId},base_agent_id.eq.${agentId}`)
      .gte("created_at", startDate);

    if (error) throw this.handleError(error, "findForAgentInRange");
    return data || [];
  }

  async findByBaseAgentIdInRange(
    baseAgentId: string,
    startDate: string
  ): Promise<OverrideMetricRow[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("override_commission_amount")
      .eq("base_agent_id", baseAgentId)
      .gte("created_at", startDate);

    if (error) throw this.handleError(error, "findByBaseAgentIdInRange");
    return data || [];
  }
}

export const overrideRepository = new OverrideRepository();
```

Update `src/services/overrides/index.ts` to export the repository.

---

### Step 4: Strip HierarchyRepository

File: `src/services/hierarchy/HierarchyRepository.ts`

**REMOVE these methods entirely:**
- findPoliciesByUserId
- findPoliciesByUserIds
- findPoliciesWithRelationsByUserId
- findRecentPoliciesByUserId
- findCommissionsByUserId
- findCommissionsByUserIds
- findCommissionsWithPolicyByUserId
- findOverridesByBaseAgentIds
- findOverridesByBaseAgentId
- findOverridesByOverrideAgentId
- findOverridesForAgentInRange
- findOverridesByBaseAgentIdInRange

**REMOVE these type definitions:**
- PolicyMetricRow
- CommissionMetricRow
- OverrideMetricRow
- PolicyWithRelations
- CommissionWithPolicy

**KEEP only:**
- HierarchyBaseEntity type
- DirectReportProfile type
- findDownlinesByHierarchyPath
- findDirectReportsByUplineId
- findByIds
- updateUpline
- transformFromDB
- transformToDB

---

### Step 5: Update HierarchyService

File: `src/services/hierarchy/hierarchyService.ts`

**Change imports:**
```typescript
import { PolicyRepository } from "../policies/PolicyRepository";
import { CommissionRepository } from "../commissions/CommissionRepository";
import { OverrideRepository } from "../overrides/OverrideRepository";
import { HierarchyRepository } from "./HierarchyRepository";
```

**Update constructor:**
```typescript
class HierarchyService {
  private hierarchyRepo: HierarchyRepository;
  private policyRepo: PolicyRepository;
  private commissionRepo: CommissionRepository;
  private overrideRepo: OverrideRepository;

  constructor() {
    this.hierarchyRepo = new HierarchyRepository();
    this.policyRepo = new PolicyRepository();
    this.commissionRepo = new CommissionRepository();
    this.overrideRepo = new OverrideRepository();
  }
}
```

**Update all method calls:**
Replace `this.repository.findPoliciesByUserId(...)` with `this.policyRepo.findMetricsByUserIds([...])`
Replace `this.repository.findCommissionsByUserId(...)` with `this.commissionRepo.findMetricsByUserIds([...])`
Replace `this.repository.findOverridesByBaseAgentIds(...)` with `this.overrideRepo.findByBaseAgentIds(...)`
etc.

---

### Step 6: Update index.ts exports

File: `src/services/hierarchy/index.ts`

Remove exports of types that no longer exist in HierarchyRepository.

---

### Step 7: Update Tests

File: `src/services/hierarchy/__tests__/hierarchyService.test.ts`

Update mocks to mock the correct repositories (PolicyRepository, CommissionRepository, OverrideRepository).

---

### Step 8: Fix ClientService Duplication (separate task)

File: `src/services/clients/client/ClientService.ts`

Remove duplicate method aliases. Keep only:
- create (remove createClient)
- delete (remove deleteClient)
- getAll (remove getAllClients)
- getById (remove getClientById)
- update (remove updateClient)
- getWithPolicies (remove getClientWithPolicies)
- search (remove searchClients)
- getAllWithStats (remove getClientsWithStats)

Update all call sites to use the canonical method names.

---

## Verification Checklist

After completing all steps:

1. [ ] `npm run typecheck` passes with 0 errors
2. [ ] `npm run build` passes
3. [ ] `npx vitest run src/services/hierarchy` passes
4. [ ] `npx vitest run src/services/policies` passes
5. [ ] `npx vitest run src/services/commissions` passes
6. [ ] `npx vitest run src/services/overrides` passes
7. [ ] HierarchyRepository only contains hierarchy methods (user_profiles table)
8. [ ] PolicyRepository contains all policy queries
9. [ ] CommissionRepository contains all commission queries
10. [ ] OverrideRepository exists and contains all override queries
11. [ ] HierarchyService imports from correct repositories
12. [ ] No duplicate type definitions across repositories

---

## Start Command

```
Fix the HierarchyRepository architectural violations per plans/active/fix-hierarchy-repository-mess.md

Execute steps in order:
1. Extend PolicyRepository with batch methods
2. Extend CommissionRepository with batch methods
3. Create OverrideRepository
4. Strip HierarchyRepository to hierarchy-only methods
5. Update HierarchyService to use correct repositories
6. Update exports
7. Fix tests
8. Verify build passes

Do NOT skip steps. Do NOT add methods to wrong repositories. Each repository owns ONE table domain.
```
