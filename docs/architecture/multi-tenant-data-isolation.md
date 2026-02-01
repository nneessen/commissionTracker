# Multi-Tenant Data Isolation Architecture

This document describes the multi-tenant data isolation strategy, including the `imo_id` and `agency_id` fields used to segregate data between organizations.

## Overview

The system supports multiple IMOs (Independent Marketing Organizations), each with multiple agencies. Data isolation is enforced at two levels:

1. **Database Triggers** - Auto-populate tenant fields on INSERT
2. **Service Layer** - Repositories include tenant fields in `transformToDB()` as defense-in-depth

## Tenant Hierarchy

```
IMO (Independent Marketing Organization)
 └── Agency
      └── User (Agent)
           └── Data (Policies, Commissions, Clients, etc.)
```

## Key Database Fields

| Field | Type | Description |
|-------|------|-------------|
| `imo_id` | UUID | Foreign key to `imos` table |
| `agency_id` | UUID | Foreign key to `agencies` table |
| `user_id` | UUID | Foreign key to `auth.users` / `user_profiles` |

## Tables with Tenant Isolation

### Tables WITH Database Triggers (Defense-in-Depth)

These tables have triggers that auto-populate tenant fields from the user's profile:

| Table | Trigger | Fields Set |
|-------|---------|------------|
| `policies` | `trigger_set_policy_agency_id` | `imo_id`, `agency_id` |
| `expenses` | `trigger_set_expense_org_ids` | `imo_id`, `agency_id` |
| `lead_purchases` | `trigger_set_lead_purchase_org_ids` | `imo_id`, `agency_id` |
| `carriers` | `set_carrier_imo_id` | `imo_id` |
| `products` | `set_product_imo_id` | `imo_id` |
| `comp_guide` | `set_comp_guide_imo_id` | `imo_id` |
| `recruit_phase_progress` | `set_phase_progress_imo_id` | `imo_id` |
| `override_commissions` | (from base_agent) | `imo_id` |

### Tables WITHOUT Triggers (Service-Layer Only)

These tables rely solely on the service layer to populate tenant fields:

| Table | Service | Critical |
|-------|---------|----------|
| `commissions` | `CommissionRepository` | YES |
| `chargebacks` | `ChargebackService` | YES |
| `clients` | `ClientRepository` | YES |

## Service Layer Implementation

### TenantContext Utility

Location: `src/services/base/TenantContext.ts`

Provides utilities for fetching the current user's tenant context:

```typescript
import { getCurrentTenantContext, getTenantFields } from '@/services/base';

// Get full context
const context = await getCurrentTenantContext();
// Returns: { userId: string, imoId: string | null, agencyId: string | null }

// Get DB-ready fields
const fields = await getTenantFields();
// Returns: { imo_id: string | null, agency_id: string | null }
```

### Repository transformToDB Methods

Each repository's `transformToDB()` method includes tenant fields:

#### CommissionRepository

```typescript
// src/services/commissions/CommissionRepository.ts
protected transformToDB(data: Partial<CreateCommissionData>): Record<string, unknown> {
  const dbData: Record<string, unknown> = {};
  // ... other fields ...
  if (data.imoId !== undefined) dbData.imo_id = data.imoId;
  return dbData;
}
```

#### ChargebackService

```typescript
// src/services/commissions/chargebackService.ts
private transformToDB(data: CreateChargebackData): any {
  return {
    // ... other fields ...
    imo_id: data.imoId,
  };
}
```

#### PolicyRepository (Defense-in-Depth)

```typescript
// src/services/policies/PolicyRepository.ts
protected transformToDB(data: any): any {
  const dbData: any = {};
  // ... other fields ...
  if (data.imoId !== undefined) dbData.imo_id = data.imoId;
  if (data.agencyId !== undefined) dbData.agency_id = data.agencyId;
  return dbData;
}
```

#### ExpenseRepository (Defense-in-Depth)

```typescript
// src/services/expenses/expense/ExpenseRepository.ts
protected transformToDB(data: CreateExpenseData | UpdateExpenseData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  // ... other fields ...
  if ("imo_id" in data) result.imo_id = data.imo_id;
  if ("agency_id" in data) result.agency_id = data.agency_id;
  return result;
}
```

#### OverrideRepository

```typescript
// src/services/overrides/OverrideRepository.ts
protected transformToDB(data: Partial<CreateOverrideData>): any {
  const dbData: any = {};
  // ... other fields ...
  if (data.imo_id !== undefined) dbData.imo_id = data.imo_id;
  return dbData;
}
```

#### ClientRepository

```typescript
// src/services/clients/client/ClientRepository.ts
protected transformToDB(data: CreateClientData | UpdateClientData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  // ... other fields ...
  if ("user_id" in data && data.user_id !== undefined) result.user_id = data.user_id;
  if ("imo_id" in data) result.imo_id = data.imo_id;
  if ("agency_id" in data) result.agency_id = data.agency_id;
  return result;
}
```

## Type Definitions

Each create data interface includes optional tenant fields:

| Type | File | Fields |
|------|------|--------|
| `CreateCommissionData` | `src/types/commission.types.ts` | `imoId?: string \| null` |
| `CreateChargebackData` | `src/types/user.types.ts` | `imoId?: string \| null` |
| `CreatePolicyData` | `src/types/policy.types.ts` | `imoId?, agencyId?` |
| `CreateExpenseData` | `src/types/expense.types.ts` | `imo_id?, agency_id?` |
| `CreateOverrideData` | `src/services/overrides/OverrideRepository.ts` | `imo_id?: string \| null` |
| `CreateClientData` | `src/types/client.types.ts` | `user_id?, imo_id?, agency_id?` |

## Usage in Hooks/Services

When creating records, inject tenant context from the calling code:

```typescript
// Example: Creating a commission with tenant context
import { getTenantFields } from '@/services/base';

async function createCommission(data: CreateCommissionData) {
  const tenantFields = await getTenantFields();

  return commissionRepository.create({
    ...data,
    imoId: tenantFields.imo_id,
  });
}
```

## Row-Level Security (RLS)

RLS policies use these functions to filter data:

| Function | Returns | Usage |
|----------|---------|-------|
| `get_my_imo_id()` | Current user's IMO ID | Filter by IMO |
| `get_my_agency_id()` | Current user's Agency ID | Filter by Agency |
| `is_imo_admin()` | Boolean | Check IMO-level access |
| `is_upline_of(user_id)` | Boolean | Check hierarchy access |
| `is_super_admin()` | Boolean | Check system-wide access |

## Risk Assessment

### Without Tenant Isolation

- Commissions from IMO A could be visible to IMO B users
- Slack notifications may fail silently (trigger exits early on NULL `imo_id`)
- RLS policies may not filter correctly
- Financial reports could aggregate cross-tenant data

### Mitigation Strategy

1. **Primary:** Database triggers auto-populate tenant fields
2. **Secondary:** Service layer includes fields as defense-in-depth
3. **Tertiary:** RLS policies enforce access control

## Related Files

### Core Implementation
- `src/services/base/TenantContext.ts` - Tenant context utility
- `src/services/base/index.ts` - Exports tenant utilities

### Repositories Updated
- `src/services/commissions/CommissionRepository.ts`
- `src/services/commissions/chargebackService.ts`
- `src/services/policies/PolicyRepository.ts`
- `src/services/expenses/expense/ExpenseRepository.ts`
- `src/services/overrides/OverrideRepository.ts`
- `src/services/clients/client/ClientRepository.ts`

### Type Definitions
- `src/types/commission.types.ts`
- `src/types/user.types.ts`
- `src/types/policy.types.ts`
- `src/types/expense.types.ts`
- `src/types/client.types.ts`

### Database Functions
- `supabase/migrations/20251220_002_imo_rls_functions.sql`

## Changelog

| Date | Change |
|------|--------|
| 2026-02-01 | Added tenant fields to 6 repositories and created TenantContext utility |
| 2025-12-20 | Initial multi-IMO architecture implementation |
