# Fix Carriers, Products, and Commission Rates Data
**Status**: ACTIVE
**Date**: 2025-11-03
**Priority**: HIGH
**Risk Level**: HIGH

## Problem Statement
Current data in carriers, products, and comp_guide tables is incorrect and needs to be replaced with accurate data from provided CSV. Critical schema mismatch: database uses `comp_level` enum ('street', 'release', 'enhanced', 'premium') but CSV has numeric contract levels (80-145).

## CSV Data Summary
- **Carriers**: 12 total
  - Legal & General America
  - United Home Life
  - SBLI
  - The Baltimore Life
  - American Home Life
  - John Hancock
  - IG Annuities & Life
  - American-Amicable
  - Corebridge Financial
  - Transamerica
  - Elco Mutual
  - Kansas City Life

- **Products**: 43 total across all carriers
- **Commission Levels**: 14 levels (80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145)
- **Total Commission Rates**: 602 entries (43 products × 14 levels)

## Impact Analysis

### High Risk Areas
1. **Schema Incompatibility**: comp_level enum vs numeric contract levels
2. **Foreign Key Constraints**: Existing policies reference current carriers/products
3. **Commission Calculations**: Depend on comp_guide structure

### Affected Components
- Database Tables: `carriers`, `products`, `comp_guide`, `policies`, `commissions`
- Services: `CommissionCalculationService.ts`, `compGuideService.ts`
- Functions: `get_product_commission_rate()`
- API Endpoints: `/comp_guide`, `/products`, `/carriers`

## Implementation Plan

### Phase 1: Backup & Analysis
```bash
# 1. Pull current schema
npx supabase db pull

# 2. Check existing data counts
psql -c "SELECT COUNT(*) FROM carriers;"
psql -c "SELECT COUNT(*) FROM products;"
psql -c "SELECT COUNT(*) FROM comp_guide;"
psql -c "SELECT COUNT(*) FROM policies;"
```

### Phase 2: Create Data Processing Script
**File**: `scripts/fix_carriers_products_comps.js`

```javascript
// Parse CSV data
const csvData = `
Legal & General America,TERM,85%,90%,95%,100%,105%,110%,115%,120%,125%,130%,135%,140%,145%,150%
United Home Life,EXPRESS ISSUE PREMIER WL,70%,75%,80%,85%,90%,95%,100%,105%,110%,115%,120%,125%,130%,135%
...
`;

// Generate SQL migrations
function generateSQL() {
  // 1. Create backup tables
  // 2. Insert carriers with UUIDs
  // 3. Insert products with proper product_type mapping
  // 4. Insert commission rates with contract_level
}
```

### Phase 3: Schema Modification Strategy

#### Option A: Modify comp_guide (RECOMMENDED)
```sql
-- Add contract_level column
ALTER TABLE comp_guide
  ADD COLUMN contract_level INTEGER
  CHECK (contract_level >= 80 AND contract_level <= 145);

-- Migrate existing data (if needed)
UPDATE comp_guide SET contract_level =
  CASE comp_level
    WHEN 'street' THEN 80
    WHEN 'release' THEN 95
    WHEN 'enhanced' THEN 110
    WHEN 'premium' THEN 125
  END;

-- Drop old column after migration
ALTER TABLE comp_guide DROP COLUMN comp_level;

-- Update unique constraint
ALTER TABLE comp_guide
  DROP CONSTRAINT comp_guide_carrier_id_product_type_comp_level_effective_date_key,
  ADD CONSTRAINT comp_guide_carrier_product_contract_unique
    UNIQUE(carrier_id, product_type, contract_level, effective_date);
```

#### Option B: Create New Table
```sql
CREATE TABLE commission_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES carriers(id),
  product_id UUID REFERENCES products(id),
  contract_level INTEGER CHECK (contract_level >= 80 AND contract_level <= 145),
  commission_percentage DECIMAL(5,4),
  effective_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(carrier_id, product_id, contract_level)
);
```

### Phase 4: Migration SQL File
**File**: `supabase/migrations/20251103_001_fix_carriers_products_comps.sql`

```sql
-- ============================================
-- Migration: Fix Carriers, Products, and Commission Rates
-- Date: 2025-11-03
-- Risk: HIGH - Modifies core commission structure
-- ============================================

BEGIN;

-- Phase 1: Create Backup Tables
CREATE TABLE carriers_backup_20251103 AS SELECT * FROM carriers;
CREATE TABLE products_backup_20251103 AS SELECT * FROM products;
CREATE TABLE comp_guide_backup_20251103 AS SELECT * FROM comp_guide;

-- Log current counts
DO $$
DECLARE
  carrier_count INTEGER;
  product_count INTEGER;
  comp_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO carrier_count FROM carriers;
  SELECT COUNT(*) INTO product_count FROM products;
  SELECT COUNT(*) INTO comp_count FROM comp_guide;

  RAISE NOTICE 'Backup created - Carriers: %, Products: %, Comp Guide: %',
    carrier_count, product_count, comp_count;
END $$;

-- Phase 2: Schema Modification
ALTER TABLE comp_guide ADD COLUMN IF NOT EXISTS contract_level INTEGER;

-- Phase 3: Clear Existing Data (preserve system/default entries)
DELETE FROM comp_guide WHERE carrier_id IN (
  SELECT id FROM carriers
  WHERE name NOT IN ('System', 'Default', 'Unknown Carrier')
);

DELETE FROM products WHERE carrier_id IN (
  SELECT id FROM carriers
  WHERE name NOT IN ('System', 'Default', 'Unknown Carrier')
);

DELETE FROM carriers
WHERE name NOT IN ('System', 'Default', 'Unknown Carrier');

-- Phase 4: Insert New Carriers
INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Legal & General America', 'LGA', NOW(), NOW()),
  (gen_random_uuid(), 'United Home Life', 'UHL', NOW(), NOW()),
  -- ... all 12 carriers
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  updated_at = NOW();

-- Phase 5: Insert Products
-- Generated from script with proper type mapping

-- Phase 6: Insert Commission Rates
-- 602 entries generated from CSV

-- Phase 7: Drop Old Column and Add Constraints
ALTER TABLE comp_guide DROP COLUMN IF EXISTS comp_level;
ALTER TABLE comp_guide ALTER COLUMN contract_level SET NOT NULL;

-- Phase 8: Update Indexes
DROP INDEX IF EXISTS idx_comp_guide_carrier_product_level;
CREATE INDEX idx_comp_guide_lookup
  ON comp_guide(carrier_id, product_type, contract_level);

-- Phase 9: Validation
DO $$
DECLARE
  new_carrier_count INTEGER;
  new_product_count INTEGER;
  new_comp_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO new_carrier_count FROM carriers;
  SELECT COUNT(*) INTO new_product_count FROM products;
  SELECT COUNT(*) INTO new_comp_count FROM comp_guide;

  RAISE NOTICE 'Migration complete - Carriers: %, Products: %, Comp Guide: %',
    new_carrier_count, new_product_count, new_comp_count;

  IF new_comp_count < 600 THEN
    RAISE EXCEPTION 'Expected ~602 commission rates, got %', new_comp_count;
  END IF;
END $$;

COMMIT;

-- ============================================
-- ROLLBACK SCRIPT (Run if needed)
-- ============================================
/*
BEGIN;
  TRUNCATE carriers, products, comp_guide CASCADE;
  INSERT INTO carriers SELECT * FROM carriers_backup_20251103;
  INSERT INTO products SELECT * FROM products_backup_20251103;
  INSERT INTO comp_guide SELECT * FROM comp_guide_backup_20251103;

  DROP TABLE carriers_backup_20251103;
  DROP TABLE products_backup_20251103;
  DROP TABLE comp_guide_backup_20251103;
COMMIT;
*/
```

### Phase 5: Update Commission Calculation Service
**File**: `src/services/commissions/CommissionCalculationService.ts`

```typescript
// Update to use contract_level instead of comp_level
async getCommissionRate(
  carrierId: string,
  productType: string,
  contractLevel: number  // Changed from comp_level enum
): Promise<number> {
  const { data, error } = await supabase
    .from('comp_guide')
    .select('commission_percentage')
    .eq('carrier_id', carrierId)
    .eq('product_type', productType)
    .eq('contract_level', contractLevel)  // Changed
    .single();

  return data?.commission_percentage || 0;
}
```

### Phase 6: Testing Checklist
- [ ] Backup tables created successfully
- [ ] All 12 carriers imported
- [ ] All 43 products mapped correctly
- [ ] All 602 commission rates present
- [ ] Commission calculations work
- [ ] Existing policies intact
- [ ] Foreign key constraints valid
- [ ] Rollback script tested

## Execution Steps

1. **Create and review the data processing script**
   ```bash
   node scripts/fix_carriers_products_comps.js > review.sql
   ```

2. **Test on local database**
   ```bash
   psql $DATABASE_URL < review.sql
   ```

3. **Run migration**
   ```bash
   npx supabase migration up
   ```

4. **Validate results**
   ```bash
   psql -c "SELECT COUNT(*) FROM comp_guide WHERE contract_level IS NOT NULL;"
   ```

5. **Update services and test**

## Rollback Procedure

If issues occur within 5 minutes:
```bash
psql $DATABASE_URL < rollback.sql
```

If issues occur after 5 minutes:
1. Restore from database backup
2. Re-run previous migrations
3. Notify team
4. Review failure logs

## Success Criteria
- ✅ All 12 carriers present with correct names
- ✅ All 43 products linked to correct carriers
- ✅ 602 commission rates (43 × 14) imported
- ✅ Contract levels 80-145 properly stored
- ✅ Commission calculations return correct percentages
- ✅ No broken foreign keys
- ✅ Application functions normally

## Notes
- Commission percentages converted to decimals (85% = 0.85)
- Product type mapping:
  - TERM → term_life
  - WL/Whole Life → whole_life
  - UL/Universal → universal_life
  - ACCIDENTAL → health
  - Annuity products → annuity
- Contract levels replace comp_level enum entirely
- Backup tables retained for 30 days minimum

## Related Files
- `scripts/fix_carriers_products_comps.js` - Data processing script
- `supabase/migrations/20251103_001_fix_carriers_products_comps.sql` - Migration
- `src/services/commissions/CommissionCalculationService.ts` - Updated service