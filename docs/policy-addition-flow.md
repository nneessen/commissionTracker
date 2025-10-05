# Policy Addition Flow - Technical Documentation

**Author**: Commission Tracker Development Team
**Date**: 2025-10-05
**Status**: AUTHORITATIVE - Technical Reference
**Purpose**: Document current policy creation flow, commission calculation, and implementation gaps

---

## Executive Summary

This document provides a comprehensive technical overview of the policy addition workflow in the Insurance Sales KPI Tracking System. It covers the complete data flow from UI interaction through database persistence, with emphasis on commission determination and tax accounting requirements.

**Key Process**: User adds policy → System determines commission rate → Creates policy + commission records → Tracks earned vs unearned amounts

**Primary Gap**: Current implementation uses simplified product-level commission rates instead of contract-level based rates from the `comp_guide` table, resulting in incorrect commission calculations and missing tax accounting.

**Critical Entity Flow**:
```
User (contract_level) → Carrier → Product → comp_guide lookup → Commission % → Policy + Commission Record
```

---

## Database Schema Reference

### 1. policies Table

**Purpose**: Source of truth for all insurance policies (never deleted, only status updated)

**Key Columns**:
```sql
id                    UUID PRIMARY KEY
user_id               UUID → auth.users(id)
client_id             UUID → clients(id)
carrier_id            UUID → carriers(id)
product_id            UUID → products(id)
product               ENUM (product_type: term_life, whole_life, etc.)
policy_number         TEXT UNIQUE
status                ENUM (active, pending, lapsed, cancelled, expired)
monthly_premium       NUMERIC(10,2)
annual_premium        NUMERIC(10,2)
commission_percentage NUMERIC(5,4)  -- Stored as decimal (0.1025 = 102.5%)
payment_frequency     ENUM (monthly, quarterly, semi_annual, annual)
effective_date        DATE
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

**Location**: `supabase/migrations/001_initial_schema.sql:72-90`

### 2. products Table

**Purpose**: Catalog of insurance products per carrier

**Key Columns**:
```sql
id                    UUID PRIMARY KEY
carrier_id            UUID → carriers(id)
name                  VARCHAR(255) NOT NULL
code                  VARCHAR(100)
product_type          ENUM (term_life, whole_life, universal_life, etc.)
commission_percentage NUMERIC(5,4)  -- SIMPLIFIED: doesn't account for contract levels
min_premium           NUMERIC(10,2)
max_premium           NUMERIC(10,2)
is_active             BOOLEAN DEFAULT true
```

**Current Usage**: PolicyForm pulls commission_percentage directly from here (simplified approach)

**Issue**: Single commission_percentage per product doesn't account for agent's contract level

### 3. comp_guide Table (Proper Commission Lookup)

**Purpose**: Contract-level based commission rates (the authoritative source)

**Key Columns**:
```sql
id                    UUID PRIMARY KEY
carrier_id            UUID → carriers(id)
product_id            UUID → products(id)
product_type          ENUM (product_type)
contract_level        INTEGER NOT NULL  -- Range: 80-145
commission_percentage NUMERIC(5,4) NOT NULL
bonus_percentage      NUMERIC(5,4) DEFAULT 0
effective_date        DATE NOT NULL
expiration_date       DATE
```

**Unique Constraint**: `(product_id, contract_level, effective_date)`

**Index for Lookup**: `idx_comp_guide_lookup (carrier_id, product_type, contract_level)`

**Contract Levels**:
- 80-90: Street level (lowest commission)
- 100-110: Release level
- 120-130: Enhanced level
- 140-145: Premium level (highest commission)

**Proper Query**:
```sql
SELECT commission_percentage, bonus_percentage
FROM comp_guide
WHERE product_id = ?
  AND contract_level = ?
  AND effective_date <= CURRENT_DATE
  AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)
ORDER BY effective_date DESC
LIMIT 1;
```

**Location**: `supabase/migrations/001_initial_schema.sql:41-56`

### 4. users View (NOT a table)

**Purpose**: Public view of auth.users with metadata fields extracted

**Source**: `auth.users` table with JSONB metadata extraction

**Key Fields**:
```sql
id                  UUID (from auth.users.id)
email               TEXT
name                TEXT (from raw_user_meta_data->>'full_name')
phone               TEXT (from raw_user_meta_data->>'phone')
contract_comp_level INTEGER (from raw_user_meta_data->>'contract_comp_level', default 100)
is_active           BOOLEAN (from raw_user_meta_data->>'is_active', default true)
agent_code          TEXT
license_number      TEXT
license_state       TEXT
```

**Definition Location**: `supabase/migrations/20251001_007_SAFE_users_view_corrected.sql:30-44`

**SQL**:
```sql
CREATE OR REPLACE VIEW public.users AS
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email) as name,
    raw_user_meta_data->>'phone' as phone,
    COALESCE((raw_user_meta_data->>'contract_comp_level')::INTEGER, 100) as contract_comp_level,
    COALESCE((raw_user_meta_data->>'is_active')::BOOLEAN, true) as is_active,
    raw_user_meta_data->>'agent_code' as agent_code,
    raw_user_meta_data->>'license_number' as license_number,
    raw_user_meta_data->>'license_state' as license_state,
    raw_user_meta_data->>'notes' as notes,
    created_at,
    updated_at
FROM auth.users;
```

**Access**: `SELECT * FROM users WHERE id = auth.uid();`

### 5. commissions Table

**Purpose**: Track commission payments, advances, and earning progress

**Key Columns**:
```sql
id                     UUID PRIMARY KEY
user_id                UUID → auth.users(id)
policy_id              UUID → policies(id)
carrier_id             UUID → carriers(id)
commission_amount      NUMERIC(10,2)  -- Total advance amount
payment_date           DATE
status                 ENUM (pending, paid, reversed, disputed)
is_advance             BOOLEAN DEFAULT false
advance_months         INTEGER DEFAULT 0
months_paid            INTEGER DEFAULT 0  -- How many months client has paid
earned_amount          NUMERIC(10,2) DEFAULT 0
unearned_amount        NUMERIC(10,2) DEFAULT 0
```

**Location**: `supabase/migrations/001_initial_schema.sql:92-109`

**Earning Tracking Fields** (added in later migration):
- `months_paid`: Increments as client makes monthly payments
- `earned_amount`: `(commission_amount / advance_months) × months_paid`
- `unearned_amount`: `commission_amount - earned_amount`

---

## Current Implementation (AS-IS)

### UI Layer: PolicyForm Component

**File**: `src/features/policies/PolicyForm.tsx`

**Component**: `PolicyForm` (lines 85-275)

**Key State**:
```typescript
const [formData, setFormData] = useState<NewPolicyForm>({
  clientName: "",
  clientState: "",
  carrierId: "",
  productId: "",
  product: "term_life" as ProductType,
  premium: 0,
  paymentFrequency: "monthly",
  commissionPercentage: 0,  // Auto-filled when product selected
  // ...
});
```

**Carrier Selection** (lines 151-158):
```typescript
if (name === 'carrierId') {
  setFormData(prev => ({
    ...prev,
    carrierId: value,
    productId: '',         // Reset product when carrier changes
    commissionPercentage: 0,
  }));
}
```

**Product Selection** (lines 160-169):
```typescript
else if (name === 'productId') {
  const selectedProduct = products.find(p => p.id === value);
  setFormData(prev => ({
    ...prev,
    productId: value,
    product: selectedProduct?.product_type || 'term_life',
    commissionPercentage: selectedProduct?.commission_percentage
      ? selectedProduct.commission_percentage * 100  // Convert decimal to percentage
      : 0,
  }));
}
```

**⚠️ ISSUE**: Uses `product.commission_percentage` directly, ignoring user's contract level

**Form Submission** (lines 218-246):
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (validateForm()) {
    const annualPremium = calculateAnnualPremium(
      formData.premium,
      formData.paymentFrequency,
    );

    const submissionData = {
      ...formData,
      annualPremium,
    };

    if (policyId) {
      updatePolicy(policyId, submissionData);
    } else {
      addPolicy(submissionData);
    }
  }
};
```

**⚠️ ISSUE**: Only creates policy record, does NOT create commission record

### Hook Layer: useCreatePolicy

**File**: `src/hooks/policies/useCreatePolicy.ts`

**Implementation**:
```typescript
export const useCreatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPolicy: CreatePolicyData) => {
      return policyService.create(newPolicy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    }
  });
};
```

**Simple wrapper** around policyService with TanStack Query cache invalidation

### Service Layer: PolicyService

**File**: `src/services/policies/policyService.ts`

**Method**: `PolicyService.create()` (lines 27-29)

```typescript
async create(policyData: CreatePolicyData): Promise<Policy> {
  return this.repository.create(policyData);
}
```

**Delegates to repository** which makes direct Supabase call:
```typescript
// Typical repository implementation
async create(data: CreatePolicyData): Promise<Policy> {
  const { data: policy, error } = await supabase
    .from('policies')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return policy;
}
```

### Current Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Interaction (PolicyForm.tsx)                        │
│    - Select carrier                                          │
│    - Select product → auto-fill commission from product     │
│    - Enter premium, dates, client info                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Form Submission                                           │
│    - Calculate annual premium                                │
│    - Create NewPolicyForm object                             │
│    - Call addPolicy(submissionData)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. TanStack Query Mutation (useCreatePolicy)                │
│    - mutationFn: policyService.create(newPolicy)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Service Layer (PolicyService)                             │
│    - create(policyData) → repository.create(policyData)      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Database (Supabase)                                       │
│    - INSERT INTO policies (...)                              │
│    - Returns created policy record                           │
└─────────────────────────────────────────────────────────────┘
```

### Current Commission Calculation

**Formula Used**: NONE (commission_percentage stored but not used for calculation during policy creation)

**Commission Record Creation**: DOES NOT HAPPEN (gap in implementation)

**What SHOULD happen**:
```typescript
const advance = monthly_premium × 9 × commission_rate;
// Example: $500 × 9 × 1.025 = $4,612.50
```

---

## Commission Calculation Deep Dive

### Current Method (Simplified/Incorrect)

**Source**: `products.commission_percentage`

**Process**:
1. User selects product
2. Auto-fill commission_percentage from product record
3. Store in policy.commission_percentage
4. **No commission record created**
5. **No advance calculated**
6. **No earned tracking**

**Problem**:
- Ignores agent's contract level
- Same commission for all agents selling the same product
- Real world: Agent A (contract level 100) gets 95%, Agent B (contract level 130) gets 115%

### Desired Method (Contract-Level Based)

**Source**: `comp_guide` table lookup

**Process**:
1. Fetch user's contract_comp_level from users view
2. User selects product
3. Query comp_guide:
   ```sql
   SELECT commission_percentage, bonus_percentage
   FROM comp_guide
   WHERE product_id = $1
     AND contract_level = $2
     AND effective_date <= CURRENT_DATE
     AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)
   ORDER BY effective_date DESC
   LIMIT 1;
   ```
4. Auto-fill commission_percentage from comp_guide result
5. Calculate advance on form submission
6. Create BOTH policy AND commission records

**Example Lookup**:
```
Product: Family First Growth Term Life 10-Year
User Contract Level: 120
Query Result: commission_percentage = 1.025 (102.5%)
```

### Advance Formula

**Official Formula** (from `docs/commission-lifecycle-business-rules.md`):

```
Advance = Monthly Premium × Advance Months × Commission Rate
```

**Parameters**:
- `monthlyPremium`: Monthly premium amount in dollars
- `advanceMonths`: Industry standard = 9 months
- `commissionRate`: Commission percentage as decimal (1.025 = 102.5%)

**Example Calculation**:
```typescript
const monthlyPremium = 500;        // $500/month
const advanceMonths = 9;           // 9 months
const commissionRate = 1.025;      // 102.5%

const advance = monthlyPremium × advanceMonths × commissionRate;
// = 500 × 9 × 1.025
// = $4,612.50
```

**Code Reference**: `docs/commission-lifecycle-business-rules.md:19-28`

### Earned vs Unearned Tracking

**Key Concept**: Advance is paid upfront but earned month-by-month as client makes payments

**Commission Record Fields**:
```typescript
{
  commission_amount: 4612.50,    // Total advance
  is_advance: true,
  advance_months: 9,
  months_paid: 0,                // Starts at 0, increments monthly
  earned_amount: 0,              // (commission_amount / 9) × months_paid
  unearned_amount: 4612.50,      // commission_amount - earned_amount
}
```

**Monthly Earning Progression**:

| Month | Client Paid? | months_paid | earned_amount | unearned_amount |
|-------|--------------|-------------|---------------|-----------------|
| 0     | -            | 0           | $0.00         | $4,612.50       |
| 1     | ✅ Yes       | 1           | $512.50       | $4,100.00       |
| 2     | ✅ Yes       | 2           | $1,025.00     | $3,587.50       |
| 3     | ✅ Yes       | 3           | $1,537.50     | $3,075.00       |
| 4     | ✅ Yes       | 4           | $2,050.00     | $2,562.50       |
| 5     | ✅ Yes       | 5           | $2,562.50     | $2,050.00       |
| 6     | ✅ Yes       | 6           | $3,075.00     | $1,537.50       |
| 7     | ✅ Yes       | 7           | $3,587.50     | $1,025.00       |
| 8     | ✅ Yes       | 8           | $4,100.00     | $512.50         |
| 9     | ✅ Yes       | 9           | $4,612.50     | $0.00           |

**Monthly Earning Rate**: `$4,612.50 / 9 = $512.50 per month`

**Formula**:
```typescript
const monthlyEarningRate = commission_amount / advance_months;
const earned_amount = monthlyEarningRate × months_paid;
const unearned_amount = commission_amount - earned_amount;
```

### Tax Implications

**IRS Requirement**: Commission income is taxable when EARNED, not when received

**Current Gap**: No tracking of earned vs unearned amounts

**Required Implementation**:
1. Track `months_paid` as client makes monthly payments
2. Calculate `earned_amount` monthly
3. Update `unearned_amount` accordingly
4. Generate tax reports showing earned income per month
5. Handle chargebacks when policy lapses before fully earned

**Chargeback Scenario**:
- Policy lapses at month 5
- Agent received: $4,612.50
- Agent earned: $2,562.50 (5 months)
- Chargeback owed: $2,050.00 (unearned amount)
- Taxable income: Only the $2,562.50 earned portion

---

## Critical Gaps & Issues

### ❌ Gap 1: User Contract Level NOT Fetched

**Current**: PolicyForm does NOT fetch user's contract_comp_level

**Impact**: Cannot perform proper comp_guide lookup

**Required Fix**:
```typescript
// In PolicyForm.tsx
const { user } = useAuth();
const [userContractLevel, setUserContractLevel] = useState<number>(100);

useEffect(() => {
  const fetchUserContractLevel = async () => {
    const { data } = await supabase
      .from('users')
      .select('contract_comp_level')
      .eq('id', user.id)
      .single();
    setUserContractLevel(data?.contract_comp_level || 100);
  };
  fetchUserContractLevel();
}, [user?.id]);
```

### ❌ Gap 2: comp_guide Table NOT Queried

**Current**: Uses `products.commission_percentage` (simplified)

**Impact**: All agents get same commission rate regardless of contract level

**Required Fix**: Create `useCompGuide` hook:
```typescript
export const useCompGuide = (productId: string, contractLevel: number) => {
  return useQuery({
    queryKey: ['comp_guide', productId, contractLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comp_guide')
        .select('commission_percentage, bonus_percentage')
        .eq('product_id', productId)
        .eq('contract_level', contractLevel)
        .lte('effective_date', new Date().toISOString())
        .or('expiration_date.is.null,expiration_date.gte.' + new Date().toISOString())
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!productId && !!contractLevel,
  });
};
```

### ❌ Gap 3: Commission Record NOT Created

**Current**: Only policy record created, no commission record

**Impact**: No tracking of advances, earned amounts, or tax liability

**Required Fix**: Extend PolicyService.create():
```typescript
async create(policyData: CreatePolicyData): Promise<Policy> {
  // 1. Create policy
  const policy = await this.repository.create(policyData);

  // 2. Calculate advance
  const advance = policyData.monthlyPremium × 9 × policyData.commissionPercentage;

  // 3. Create commission record
  await supabase.from('commissions').insert([{
    user_id: policy.user_id,
    policy_id: policy.id,
    carrier_id: policy.carrier_id,
    commission_amount: advance,
    is_advance: true,
    advance_months: 9,
    months_paid: 0,
    earned_amount: 0,
    unearned_amount: advance,
    status: 'pending',
  }]);

  return policy;
}
```

### ❌ Gap 4: No Month-by-Month Earned Tracking

**Current**: No mechanism to update `months_paid` and `earned_amount`

**Impact**: Cannot track tax liability accurately

**Required Implementation**:
- Cron job or manual service to mark monthly payments
- Update commission record: `months_paid++`, recalculate earned/unearned
- Track policy status changes (lapsed/cancelled)
- Automatic chargeback creation when policy lapses

### ❌ Gap 5: User Registration Missing Fields

**Current**: Only email, password captured during signup

**Missing Fields**:
- `contract_level` (INTEGER, required for comp_guide lookup)
- `upline` (TEXT, upline agent name/ID)
- `agency` (TEXT, agency name)
- `start_date` (DATE, when agent started)
- `resident_state` (TEXT, agent's home state)

**Impact**: Cannot determine commission rates without contract_level

**Required Fix**: Update signup form and store in `auth.users.raw_user_meta_data`

---

## User Registration Requirements

### Current Registration Flow

**File**: `src/features/auth/Login.tsx` (signup mode)

**Fields Captured**:
- Email
- Password

**Storage**: `auth.users` table (managed by Supabase Auth)

### Required Additional Fields

**Business Fields Needed**:

1. **contract_level** (INTEGER, required)
   - Range: 80-145
   - Default: 100 (release level)
   - Used for: comp_guide lookup
   - Storage: `raw_user_meta_data->>'contract_comp_level'`

2. **upline** (TEXT)
   - Upline agent name or ID
   - Used for: organizational hierarchy
   - Storage: `raw_user_meta_data->>'upline'`

3. **agency** (TEXT)
   - Agency name
   - Used for: reporting, compliance
   - Storage: `raw_user_meta_data->>'agency'`

4. **start_date** (DATE)
   - When agent started
   - Used for: tenure tracking, KPIs
   - Storage: `raw_user_meta_data->>'start_date'`

5. **resident_state** (TEXT)
   - Agent's home state (2-letter code)
   - Used for: licensing, compliance
   - Storage: `raw_user_meta_data->>'resident_state'`

6. **phone** (TEXT, already in schema)
   - Agent's phone number
   - Storage: `raw_user_meta_data->>'phone'`

### Enhanced Signup Implementation

```typescript
const signUp = async (formData: SignupFormData) => {
  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        full_name: formData.name,
        phone: formData.phone,
        contract_comp_level: formData.contractLevel,
        upline: formData.upline,
        agency: formData.agency,
        start_date: formData.startDate,
        resident_state: formData.residentState,
        is_active: true,
      }
    }
  });

  if (error) throw error;
  return data;
};
```

### Accessing User Metadata

**Via users View**:
```sql
SELECT
  id,
  email,
  contract_comp_level,
  upline,
  agency,
  phone,
  resident_state
FROM users
WHERE id = auth.uid();
```

**Via React Hook** (using `useAuth`):
```typescript
const { user } = useAuth();
const contractLevel = user?.contract_comp_level || 100;
```

---

## Desired Implementation (TO-BE)

### Enhanced Policy Creation Flow

**Step-by-Step Process**:

```
1. User opens PolicyForm
   ↓
2. System fetches user.contract_comp_level from users view
   File: PolicyForm.tsx
   Hook: useAuth() → user.contract_comp_level
   ↓
3. User selects carrier
   Event: handleInputChange('carrierId', value)
   Action: Fetch products for carrier, reset product selection
   ↓
4. User selects product
   Event: handleInputChange('productId', value)
   Action: Query comp_guide with (product_id, user.contract_level, today)
   Hook: useCompGuide(productId, userContractLevel)
   Result: Auto-fill commission_percentage from comp_guide
   ↓
5. User enters premium, dates, client info
   Fields: monthly_premium, effective_date, client details
   ↓
6. User submits form
   Event: handleSubmit()
   Validation: Check all required fields
   ↓
7. Calculate advance
   Formula: monthly_premium × 9 × commission_percentage
   ↓
8. Create policy record
   Service: PolicyService.create(policyData)
   Table: policies
   ↓
9. Create commission record (AUTOMATIC)
   Table: commissions
   Fields:
     - commission_amount = advance
     - is_advance = true
     - advance_months = 9
     - months_paid = 0
     - earned_amount = 0
     - unearned_amount = advance
   ↓
10. Invalidate queries, close form
    TanStack Query: invalidateQueries(['policies', 'commissions'])
```

### Service Layer Enhancement

**File**: `src/services/policies/policyService.ts`

**Enhanced create() method**:
```typescript
async create(policyData: CreatePolicyData): Promise<Policy> {
  // Start transaction
  const { data: policy, error: policyError } = await supabase
    .from('policies')
    .insert([policyData])
    .select()
    .single();

  if (policyError) throw policyError;

  // Calculate advance
  const monthlyPremium = policyData.monthly_premium;
  const commissionRate = policyData.commission_percentage;
  const advance = monthlyPremium * 9 * commissionRate;

  // Create commission record
  const { error: commissionError } = await supabase
    .from('commissions')
    .insert([{
      user_id: policy.user_id,
      policy_id: policy.id,
      carrier_id: policy.carrier_id,
      commission_amount: advance,
      is_advance: true,
      advance_months: 9,
      months_paid: 0,
      earned_amount: 0,
      unearned_amount: advance,
      status: 'pending',
      payment_date: policy.effective_date,
    }]);

  if (commissionError) {
    // Rollback: delete policy
    await supabase.from('policies').delete().eq('id', policy.id);
    throw commissionError;
  }

  return policy;
}
```

### New Hook: useCompGuide

**File**: `src/hooks/comps/useCompGuide.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const useCompGuide = (productId: string, contractLevel: number) => {
  return useQuery({
    queryKey: ['comp_guide', productId, contractLevel],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('comp_guide')
        .select('commission_percentage, bonus_percentage')
        .eq('product_id', productId)
        .eq('contract_level', contractLevel)
        .lte('effective_date', today)
        .or(`expiration_date.is.null,expiration_date.gte.${today}`)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!productId && !!contractLevel,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
```

---

## Implementation Roadmap

### Phase 1: Enhance User Registration (Week 1)

**Tasks**:
1. Update signup form UI with new fields
2. Modify `AuthContext.signUp()` to include metadata
3. Test users view properly exposes new fields
4. Update user profile page to display/edit metadata

**Files to Modify**:
- `src/features/auth/Login.tsx`
- `src/contexts/AuthContext.tsx`
- `src/types/user.types.ts`

### Phase 2: Contract Level Integration (Week 2)

**Tasks**:
1. Create `useCompGuide` hook
2. Fetch user contract level in PolicyForm
3. Update product selection to query comp_guide
4. Add fallback logic if comp_guide has no match
5. Display commission rate source in UI (product vs comp_guide)

**Files to Create**:
- `src/hooks/comps/useCompGuide.ts`

**Files to Modify**:
- `src/features/policies/PolicyForm.tsx`

### Phase 3: Automatic Commission Creation (Week 3)

**Tasks**:
1. Enhance PolicyService.create() to create commission record
2. Add transaction handling (rollback on error)
3. Add commission validation logic
4. Update TanStack Query to invalidate commission queries
5. Test edge cases (missing contract level, no comp_guide match)

**Files to Modify**:
- `src/services/policies/policyService.ts`

### Phase 4: Tax Accounting (Future)

**Tasks**:
1. Create commission lifecycle service
2. Implement monthly payment tracking
3. Build earned amount update logic
4. Create chargeback automation on policy lapse
5. Generate tax reports showing earned vs received

**Files to Create**:
- `src/services/commissions/CommissionLifecycleService.ts`
- `src/services/commissions/TaxReportingService.ts`

**Future Enhancement**: Cron job or Edge Function to track monthly payments

---

## File Reference Index

**Database Schema**:
- `supabase/migrations/001_initial_schema.sql:72-90` - policies table
- `supabase/migrations/001_initial_schema.sql:41-56` - comp_guide table
- `supabase/migrations/001_initial_schema.sql:92-109` - commissions table
- `supabase/migrations/20251001_007_SAFE_users_view_corrected.sql:30-44` - users view

**Current Implementation**:
- `src/features/policies/PolicyForm.tsx:85-275` - Main form component
- `src/features/policies/PolicyForm.tsx:160-169` - Product selection logic
- `src/hooks/policies/useCreatePolicy.ts` - TanStack Query mutation
- `src/services/policies/policyService.ts:27-29` - PolicyService.create()

**Business Rules**:
- `docs/commission-lifecycle-business-rules.md` - Official commission formulas
- `docs/commission-lifecycle-business-rules.md:19-28` - Advance calculation

**Related Documentation**:
- `docs/application-architecture.md` - Overall system architecture
- `docs/kpi-definitions.md` - KPI calculation formulas

---

## Conclusion

This document provides a comprehensive technical reference for the policy addition flow. The primary gap is the missing integration between user contract levels and the comp_guide table for accurate commission determination.

**Critical Next Steps**:
1. Implement user registration field capture (contract_level required)
2. Build comp_guide query hook (useCompGuide)
3. Modify PolicyForm to use comp_guide instead of products.commission_percentage
4. Enhance PolicyService to auto-create commission records
5. Future: Build monthly payment tracking for tax accounting

**End of Document**
