# Data Model - Database Schema Documentation

## Overview

This document provides complete schema documentation for the Commission Tracker database, including table structures, relationships, triggers, and sample data.

**Database:** PostgreSQL (Supabase managed)
**Current State:** 0 policies, 0 commissions, 1 expense (fresh database)

## Entity Relationship Diagram

```
┌─────────────┐
│   CLIENTS   │
└──────┬──────┘
       │
       │ 1:N
       ↓
┌─────────────┐      1:N      ┌──────────────┐
│  POLICIES   ├───────────────→│ COMMISSIONS  │
└──────┬──────┘                └──────┬───────┘
       │                              │
       │ N:1                          │ 1:N
       ↓                              ↓
┌─────────────┐                ┌──────────────┐
│  CARRIERS   │                │ CHARGEBACKS  │
└─────────────┘                └──────────────┘
       │
       │ 1:N
       ↓
┌─────────────┐
│  PRODUCTS   │
└──────┬──────┘
       │
       │ N:1
       ↓
┌─────────────┐
│ COMP_GUIDE  │
└─────────────┘

┌──────────────┐
│   EXPENSES   │
└──────────────┘
       │
       │ N:1
       ↓
┌──────────────────┐
│ EXPENSE_CATEGORIES │
└────────────────────┘
```

---

## Core Tables

### 1. POLICIES (Source of Truth)

**Purpose:** Stores all insurance policies. Never deleted, only status updated.

**Schema:**
```sql
CREATE TABLE policies (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID REFERENCES auth.users,
  client_id             UUID REFERENCES clients(id) ON DELETE CASCADE,
  policy_number         TEXT NOT NULL UNIQUE,
  status                TEXT NOT NULL DEFAULT 'active',
  carrier_id            UUID NOT NULL REFERENCES carriers(id) ON DELETE RESTRICT,
  product               product_type NOT NULL,
  product_id            UUID REFERENCES products(id) ON DELETE RESTRICT,
  effective_date        DATE NOT NULL,
  expiration_date       DATE,
  monthly_premium       NUMERIC(10,2) NOT NULL,
  annual_premium        NUMERIC(10,2),
  payment_frequency     payment_frequency DEFAULT 'monthly',
  commission_percentage NUMERIC(5,2),
  term_length           INTEGER,
  referral_source       VARCHAR(100),
  notes                 TEXT,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Field Definitions:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | UUID | Primary key | `a1b2c3d4-...` |
| user_id | UUID | Owner (RLS filtered) | `user_123...` |
| client_id | UUID | Foreign key to clients | `client_456...` |
| policy_number | TEXT | Unique policy identifier | `FFG-2024-001` |
| status | TEXT | `active`, `lapsed`, `cancelled`, `pending` | `active` |
| carrier_id | UUID | Insurance carrier | `carrier_789...` |
| product | ENUM | Product type | `whole_life`, `term`, etc. |
| product_id | UUID | Specific product | `prod_abc...` |
| effective_date | DATE | When coverage starts | `2024-01-15` |
| expiration_date | DATE | When coverage ends (if term) | `2044-01-15` |
| monthly_premium | NUMERIC | Premium per month | `450.00` |
| annual_premium | NUMERIC | Premium per year | `5,400.00` |
| payment_frequency | ENUM | `monthly`, `quarterly`, `semi-annual`, `annual` | `monthly` |
| commission_percentage | NUMERIC | Rate as decimal | `0.95` (95%) |
| term_length | INTEGER | Years of coverage | `20` |
| referral_source | VARCHAR | Where lead came from | `Facebook Ads` |

**Indexes:**
```sql
CREATE INDEX idx_policies_user_id ON policies(user_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_effective_date ON policies(effective_date DESC);
CREATE INDEX idx_policies_carrier_id ON policies(carrier_id);
CREATE UNIQUE INDEX idx_policies_policy_number_unique ON policies(policy_number);
```

**Triggers:**
```sql
-- Auto-create commission when policy inserted
CREATE TRIGGER trigger_auto_create_commission
  AFTER INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_commission_record();

-- Auto-update updated_at timestamp
CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Row Level Security:**
```sql
-- Users can only see their own policies
CREATE POLICY "Users can view own policies"
  ON policies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own policies"
  ON policies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own policies"
  ON policies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own policies"
  ON policies FOR DELETE
  USING (auth.uid() = user_id);
```

**Sample Data:**
```sql
INSERT INTO policies (
  user_id,
  client_id,
  policy_number,
  status,
  carrier_id,
  product,
  effective_date,
  monthly_premium,
  annual_premium,
  payment_frequency,
  commission_percentage
) VALUES (
  'user-123',
  'client-456',
  'FFG-2024-001',
  'active',
  'carrier-ffg',
  'whole_life',
  '2024-01-15',
  450.00,
  5400.00,
  'monthly',
  0.95
);
```

---

### 2. COMMISSIONS

**Purpose:** Tracks commission advances, earned amounts, and payment status.

**Schema:**
```sql
CREATE TABLE commissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES auth.users,
  policy_id         UUID REFERENCES policies(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL,        -- Total commission (advance)
  rate              NUMERIC(5,2),                   -- Commission percentage
  type              TEXT NOT NULL,                  -- 'advance', 'renewal', etc.
  status            TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'chargedback'
  payment_date      DATE,
  advance_months    INTEGER NOT NULL DEFAULT 9,     -- Months advance covers
  months_paid       INTEGER NOT NULL DEFAULT 0,     -- Months policy has paid
  earned_amount     NUMERIC(10,2) NOT NULL DEFAULT 0, -- Amount earned so far
  unearned_amount   NUMERIC(10,2),                  -- Amount not yet earned
  last_payment_date DATE,
  chargeback_amount NUMERIC(10,2) DEFAULT 0,
  chargeback_date   DATE,
  chargeback_reason TEXT,
  notes             TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Field Definitions:**

| Field | Type | Description | Calculation |
|-------|------|-------------|-------------|
| amount | NUMERIC | Total commission advance | Policy premium × rate |
| earned_amount | NUMERIC | **Amount earned so far** | (amount / advance_months) × months_paid |
| unearned_amount | NUMERIC | Amount not yet earned | amount - earned_amount |
| advance_months | INTEGER | Months advance covers | Usually 9 |
| months_paid | INTEGER | Months policy has paid | Increments monthly |

**Triggers:**
```sql
-- Automatically calculate earned/unearned when months_paid changes
CREATE TRIGGER trigger_update_commission_earned
  BEFORE INSERT OR UPDATE OF months_paid, amount, advance_months
  ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_earned_amounts();
```

**Trigger Function:**
```sql
CREATE OR REPLACE FUNCTION update_commission_earned_amounts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount IS NOT NULL THEN
    -- Calculate earned amount using database function
    NEW.earned_amount := calculate_earned_amount(
      NEW.amount,
      COALESCE(NEW.advance_months, 9),
      COALESCE(NEW.months_paid, 0)
    );

    -- Calculate unearned
    NEW.unearned_amount := NEW.amount - COALESCE(NEW.earned_amount, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Calculation Function:**
```sql
CREATE OR REPLACE FUNCTION calculate_earned_amount(
  p_amount DECIMAL,
  p_advance_months INTEGER,
  p_months_paid INTEGER
) RETURNS DECIMAL AS $$
DECLARE
  v_monthly_earning_rate DECIMAL;
  v_earned_amount DECIMAL;
  v_effective_months_paid INTEGER;
BEGIN
  -- Validate inputs
  IF p_amount IS NULL OR p_amount < 0 OR
     p_advance_months IS NULL OR p_advance_months <= 0 OR
     p_months_paid IS NULL OR p_months_paid < 0 THEN
    RETURN 0;
  END IF;

  -- Cap months paid at advance months
  v_effective_months_paid := LEAST(p_months_paid, p_advance_months);

  -- Calculate monthly earning rate
  v_monthly_earning_rate := p_amount / p_advance_months;

  -- Calculate earned amount
  v_earned_amount := v_monthly_earning_rate * v_effective_months_paid;

  RETURN v_earned_amount;
END;
$$ LANGUAGE plpgsql;
```

**Sample Data:**
```sql
-- Auto-created by trigger when policy inserted
-- Commission for $5,400 annual premium at 95% = $5,130
INSERT INTO commissions (
  user_id,
  policy_id,
  amount,         -- Total advance: $5,130
  rate,
  type,
  status,
  advance_months, -- Covers 9 months
  months_paid     -- 3 months paid so far
) VALUES (
  'user-123',
  'policy-001',
  5130.00,
  0.95,
  'advance',
  'pending',
  9,
  3  -- This triggers calculation:
     -- earned_amount = ($5,130 / 9) × 3 = $1,710
     -- unearned_amount = $5,130 - $1,710 = $3,420
);
```

---

### 3. COMP_GUIDE (Commission Rates)

**Purpose:** Stores contract-level commission rates for carrier/product combinations.

**Schema:**
```sql
CREATE TABLE comp_guide (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id            UUID REFERENCES carriers(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id) ON DELETE CASCADE,
  product_type          product_type NOT NULL,
  contract_level        INTEGER NOT NULL CHECK (contract_level >= 80 AND contract_level <= 145),
  commission_percentage NUMERIC(5,4) NOT NULL,
  bonus_percentage      NUMERIC(5,4) DEFAULT 0,
  minimum_premium       NUMERIC(10,2) DEFAULT 0,
  maximum_premium       NUMERIC(10,2),
  effective_date        DATE NOT NULL,
  expiration_date       DATE,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT comp_guide_product_contract_unique UNIQUE (product_id, contract_level, effective_date)
);
```

**Contract Levels:**
- **80-100**: Entry level contracts
- **110-120**: Mid-level contracts
- **130-145**: Top producer contracts

**Sample Data:**
```sql
-- Family First Life - Whole Life - Contract Level 110
INSERT INTO comp_guide (
  carrier_id,
  product_id,
  product_type,
  contract_level,
  commission_percentage,
  effective_date
) VALUES (
  'carrier-ffg',
  'prod-whole-life',
  'whole_life',
  110,
  0.9500,  -- 95% commission
  '2024-01-01'
);
```

---

### 4. EXPENSES

**Purpose:** Track business expenses for profit/loss calculations.

**Schema:**
```sql
CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users,
  amount        NUMERIC(10,2) NOT NULL,
  category      TEXT,
  category_id   UUID REFERENCES expense_categories(id),
  date          DATE NOT NULL,
  description   TEXT,
  is_recurring  BOOLEAN DEFAULT false,
  vendor        VARCHAR(200),
  receipt_url   TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Common Categories:**
- Lead costs (Facebook Ads, lead services)
- CRM/software subscriptions
- Office supplies
- Travel/mileage
- Phone/internet
- Professional development
- Marketing materials

**Sample Data:**
```sql
INSERT INTO expenses (
  user_id,
  amount,
  category,
  date,
  description,
  is_recurring
) VALUES (
  'user-123',
  149.99,
  'Software',
  '2024-01-15',
  'CRM subscription - monthly',
  true
);
```

---

### 5. CLIENTS

**Purpose:** Store client/policyholder information.

**Schema:**
```sql
CREATE TABLE clients (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users,
  name       TEXT NOT NULL,
  email      VARCHAR(255),
  phone      VARCHAR(20),
  state      VARCHAR(2),     -- US state code
  age        INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

### 6. CARRIERS

**Purpose:** Insurance carriers/companies.

**Schema:**
```sql
CREATE TABLE carriers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  code        VARCHAR(50),
  website     TEXT,
  phone       VARCHAR(20),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Sample Carriers:**
- Family First Life
- Foresters Financial
- Americo
- Transamerica
- Mutual of Omaha

---

### 7. PRODUCTS

**Purpose:** Specific insurance products offered by carriers.

**Schema:**
```sql
CREATE TABLE products (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id            UUID REFERENCES carriers(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  product_type          product_type NOT NULL,
  commission_percentage NUMERIC(5,2),
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Product Types (ENUM):**
```sql
CREATE TYPE product_type AS ENUM (
  'whole_life',
  'term',
  'iul',           -- Indexed Universal Life
  'annuity',
  'final_expense',
  'mortgage_protection',
  'disability',
  'critical_illness',
  'accident',
  'hospital_indemnity'
);
```

---

## Database Functions & Triggers

### Auto-Create Commission on Policy Insert

```sql
CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_amount DECIMAL(10,2);
  v_commission_rate DECIMAL(5,2);
BEGIN
  -- Get commission rate from policy or comp_guide
  v_commission_rate := COALESCE(NEW.commission_percentage, 0);

  -- Calculate commission amount
  v_commission_amount := NEW.annual_premium * v_commission_rate;

  -- Create commission record
  INSERT INTO commissions (
    user_id,
    policy_id,
    amount,
    rate,
    type,
    status,
    advance_months,
    months_paid
  ) VALUES (
    NEW.user_id,
    NEW.id,
    v_commission_amount,
    v_commission_rate,
    'advance',
    'pending',
    9,
    0
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Sample Queries

### Get All Active Policies with Commissions
```sql
SELECT
  p.policy_number,
  p.status,
  p.annual_premium,
  c.amount as commission_total,
  c.earned_amount,
  c.unearned_amount,
  c.months_paid,
  c.advance_months
FROM policies p
LEFT JOIN commissions c ON p.id = c.policy_id
WHERE p.user_id = 'user-123'
  AND p.status = 'active'
ORDER BY p.effective_date DESC;
```

### Calculate MTD Metrics
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'active') as active_policies,
  COUNT(*) FILTER (WHERE effective_date >= date_trunc('month', CURRENT_DATE)) as mtd_policies,
  SUM(annual_premium) FILTER (WHERE effective_date >= date_trunc('month', CURRENT_DATE)) as mtd_premium,
  COUNT(DISTINCT client_id) as total_clients
FROM policies
WHERE user_id = 'user-123';
```

### Get Commission Summary
```sql
SELECT
  SUM(amount) as total_commissions,
  SUM(earned_amount) as total_earned,
  SUM(unearned_amount) as total_unearned,
  SUM(amount) FILTER (WHERE status = 'paid') as total_paid,
  SUM(amount) FILTER (WHERE status = 'pending') as pending_pipeline,
  AVG(months_paid) as avg_months_paid
FROM commissions
WHERE user_id = 'user-123';
```

---

## Data Flow Example

**User creates a policy:**

1. Frontend submits policy data
2. `INSERT INTO policies` executes
3. **Trigger fires:** `trigger_auto_create_commission`
4. Commission record created with `months_paid = 0`
5. **Trigger fires:** `trigger_update_commission_earned`
6. `earned_amount` = 0, `unearned_amount` = full amount
7. TanStack Query invalidates cache
8. Dashboard refetches and displays new policy + commission

**Month passes, policy payment received:**

1. Backend job or manual update: `UPDATE commissions SET months_paid = 1`
2. **Trigger fires:** `trigger_update_commission_earned`
3. Calls `calculate_earned_amount(amount, 9, 1)`
4. `earned_amount` = (total / 9) × 1
5. `unearned_amount` = total - earned
6. Dashboard shows updated earned vs unearned

---

## Current Data State

**As of database query:**
- Policies: 0
- Commissions: 0
- Expenses: 1
- Clients: Unknown
- Carriers: Unknown
- Products: Unknown

**This is a fresh/test database - production would have real data.**

---

## TypeScript Type Definitions

Match database schema in code:

```typescript
// src/types/policy.types.ts
export interface Policy {
  id: string;
  userId: string;
  clientId: string;
  policyNumber: string;
  status: 'active' | 'lapsed' | 'cancelled' | 'pending';
  carrierId: string;
  product: ProductType;
  productId?: string;
  effectiveDate: Date;
  expirationDate?: Date;
  monthlyPremium: number;
  annualPremium: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  commissionPercentage: number;
  termLength?: number;
  referralSource?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// src/types/commission.types.ts
export interface Commission {
  id: string;
  userId: string;
  policyId: string;
  amount: number;              // Total commission
  rate: number;
  type: string;
  status: 'pending' | 'paid' | 'chargedback';
  paymentDate?: Date;
  advanceMonths: number;        // Default 9
  monthsPaid: number;           // Increments over time
  earnedAmount: number;         // AUTO-CALCULATED
  unearnedAmount: number;       // AUTO-CALCULATED
  lastPaymentDate?: Date;
  chargebackAmount: number;
  chargebackDate?: Date;
  chargebackReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Migration Strategy

All migrations in `supabase/migrations/` directory.

**Current migration files should include:**
1. Create enums (product_type, payment_frequency, etc.)
2. Create base tables (clients, carriers, products)
3. Create policies table with triggers
4. Create commissions table with triggers
5. Create comp_guide table
6. Create expenses and expense_categories tables
7. Add RLS policies
8. Create indexes for performance

**Never:**
- Create duplicate migration directories
- Manually edit schema without migration
- Skip testing migrations locally

---

This completes the database schema documentation. All tables, triggers, functions, and relationships are documented with examples.
