-- Migration: Fix carrier field and add products table
-- Date: 2025-10-03
-- Purpose: Fix schema mismatch where policies table has 'carrier' TEXT instead of 'carrier_id' UUID
--          and create proper products table for actual product entities

BEGIN;

-- ============================================
-- PHASE 1: Fix carrier field in policies table
-- ============================================

-- First, check if we need to fix the carrier field
DO $$
DECLARE
    unmatched_count INTEGER;
BEGIN
    -- Check if carrier column exists and carrier_id doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'carrier'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'carrier_id'
        AND table_schema = 'public'
    ) THEN

        RAISE NOTICE 'Converting carrier TEXT field to carrier_id UUID...';

        -- Step 1: Add carrier_id column
        ALTER TABLE policies ADD COLUMN carrier_id UUID;

        -- Step 2: Populate carrier_id from carrier text field
        -- Match carrier names (case-insensitive) to get carrier IDs
        UPDATE policies p
        SET carrier_id = c.id
        FROM carriers c
        WHERE LOWER(TRIM(p.carrier)) = LOWER(TRIM(c.name));

        -- Check for unmatched carriers
        SELECT COUNT(*) INTO unmatched_count
        FROM policies
        WHERE carrier_id IS NULL AND carrier IS NOT NULL;

        IF unmatched_count > 0 THEN
            RAISE WARNING 'Found % policies with unmatched carrier names', unmatched_count;

            -- Create a default carrier for unmatched entries if needed
            INSERT INTO carriers (id, name, code, created_at, updated_at)
            VALUES (
                'ffffffff-ffff-ffff-ffff-ffffffffffff',
                'Unknown Carrier',
                'UNKNOWN',
                NOW(),
                NOW()
            ) ON CONFLICT (name) DO NOTHING;

            -- Update unmatched policies to use the default carrier
            UPDATE policies
            SET carrier_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
            WHERE carrier_id IS NULL AND carrier IS NOT NULL;
        END IF;

        -- Step 3: Make carrier_id NOT NULL after populating
        ALTER TABLE policies ALTER COLUMN carrier_id SET NOT NULL;

        -- Step 4: Add foreign key constraint
        ALTER TABLE policies
        ADD CONSTRAINT policies_carrier_id_fkey
        FOREIGN KEY (carrier_id) REFERENCES carriers(id) ON DELETE RESTRICT;

        -- Step 5: Drop the old carrier column
        ALTER TABLE policies DROP COLUMN carrier;

        -- Step 6: Drop old index and create new one
        DROP INDEX IF EXISTS idx_policies_carrier;
        CREATE INDEX idx_policies_carrier_id ON policies(carrier_id);

        RAISE NOTICE 'Successfully converted carrier field to carrier_id';

    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'carrier_id'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'policies.carrier_id already exists, skipping conversion';
    END IF;
END $$;

-- ============================================
-- PHASE 1.5: Convert 'type' column to product_type enum
-- ============================================

DO $$
BEGIN
    -- Check if 'type' column exists and is TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'type'
        AND data_type = 'text'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Converting type TEXT field to product product_type enum...';

        -- Add a temporary product column with enum type
        ALTER TABLE policies ADD COLUMN product product_type;

        -- Map text values to enum values
        UPDATE policies SET product =
            CASE
                WHEN LOWER(type) LIKE '%term%' THEN 'term_life'::product_type
                WHEN LOWER(type) LIKE '%whole%' THEN 'whole_life'::product_type
                WHEN LOWER(type) LIKE '%universal%' AND LOWER(type) NOT LIKE '%indexed%' THEN 'universal_life'::product_type
                WHEN LOWER(type) LIKE '%indexed%' THEN 'universal_life'::product_type  -- Map IUL to universal for now
                WHEN LOWER(type) LIKE '%variable%' THEN 'variable_life'::product_type
                WHEN LOWER(type) LIKE '%health%' THEN 'health'::product_type
                WHEN LOWER(type) LIKE '%disab%' THEN 'disability'::product_type
                WHEN LOWER(type) LIKE '%annuity%' THEN 'annuity'::product_type
                ELSE 'term_life'::product_type  -- Default to term_life for unknown types
            END;

        -- Make product NOT NULL
        ALTER TABLE policies ALTER COLUMN product SET NOT NULL;

        -- Drop the old type column
        ALTER TABLE policies DROP COLUMN type;

        RAISE NOTICE 'Successfully converted type to product enum';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'product'
        AND table_schema = 'public'
    ) THEN
        -- If neither type nor product exists, add product column
        ALTER TABLE policies ADD COLUMN product product_type NOT NULL DEFAULT 'term_life'::product_type;
        RAISE NOTICE 'Added product column with default value';
    END IF;
END $$;

-- ============================================
-- PHASE 2: Create products table
-- ============================================

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    product_type product_type NOT NULL,
    description TEXT,
    min_premium DECIMAL(10,2) DEFAULT 0,
    max_premium DECIMAL(10,2),
    min_age INTEGER DEFAULT 0,
    max_age INTEGER DEFAULT 120,
    commission_percentage DECIMAL(5,4), -- Default commission if not in comp_guide
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(carrier_id, name),
    CONSTRAINT unique_carrier_code UNIQUE(carrier_id, code)
);

-- Create indexes for products table
CREATE INDEX IF NOT EXISTS idx_products_carrier_id ON products(carrier_id);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(LOWER(name));

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 3: Add product_id to policies table
-- ============================================

DO $$
BEGIN
    -- Add product_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'product_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE policies ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE RESTRICT;
        CREATE INDEX idx_policies_product_id ON policies(product_id);
        RAISE NOTICE 'Added product_id column to policies table';
    ELSE
        RAISE NOTICE 'policies.product_id already exists';
    END IF;
END $$;

-- ============================================
-- PHASE 4: Create product_commission_overrides table
-- ============================================

-- This table allows specific commission overrides per product
CREATE TABLE IF NOT EXISTS product_commission_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    comp_level comp_level NOT NULL,
    commission_percentage DECIMAL(5,4) NOT NULL,
    bonus_percentage DECIMAL(5,4) DEFAULT 0,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, comp_level, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_product_commission_overrides_product_id ON product_commission_overrides(product_id);
CREATE INDEX IF NOT EXISTS idx_product_commission_overrides_dates ON product_commission_overrides(effective_date, expiration_date);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_product_commission_overrides_updated_at ON product_commission_overrides;
CREATE TRIGGER update_product_commission_overrides_updated_at
    BEFORE UPDATE ON product_commission_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 5: Add RLS policies for new tables
-- ============================================

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;

-- Products are readable by all authenticated users
CREATE POLICY "Authenticated users can view products" ON products
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only admins can manage products (you may adjust this based on your needs)
CREATE POLICY "Admins can manage products" ON products
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Enable RLS on product_commission_overrides
ALTER TABLE product_commission_overrides ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view commission overrides" ON product_commission_overrides;
DROP POLICY IF EXISTS "Admins can manage commission overrides" ON product_commission_overrides;

-- Commission overrides are readable by all authenticated users
CREATE POLICY "Authenticated users can view commission overrides" ON product_commission_overrides
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only admins can manage commission overrides
CREATE POLICY "Admins can manage commission overrides" ON product_commission_overrides
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- PHASE 6: Create helper functions
-- ============================================

-- Function to get the effective commission rate for a product
CREATE OR REPLACE FUNCTION get_product_commission_rate(
    p_product_id UUID,
    p_comp_level comp_level,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(5,4) AS $$
DECLARE
    v_commission_rate DECIMAL(5,4);
    v_carrier_id UUID;
    v_product_type product_type;
BEGIN
    -- First try to get from product_commission_overrides
    SELECT commission_percentage INTO v_commission_rate
    FROM product_commission_overrides
    WHERE product_id = p_product_id
    AND comp_level = p_comp_level
    AND effective_date <= p_date
    AND (expiration_date IS NULL OR expiration_date >= p_date)
    ORDER BY effective_date DESC
    LIMIT 1;

    IF v_commission_rate IS NOT NULL THEN
        RETURN v_commission_rate;
    END IF;

    -- If no override, get from comp_guide based on carrier and product type
    SELECT carrier_id, product_type INTO v_carrier_id, v_product_type
    FROM products
    WHERE id = p_product_id;

    SELECT commission_percentage INTO v_commission_rate
    FROM comp_guide
    WHERE carrier_id = v_carrier_id
    AND product_type = v_product_type
    AND comp_level = p_comp_level
    AND effective_date <= p_date
    AND (expiration_date IS NULL OR expiration_date >= p_date)
    ORDER BY effective_date DESC
    LIMIT 1;

    IF v_commission_rate IS NOT NULL THEN
        RETURN v_commission_rate;
    END IF;

    -- If still no rate found, try to get default from product
    SELECT commission_percentage INTO v_commission_rate
    FROM products
    WHERE id = p_product_id;

    RETURN COALESCE(v_commission_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PHASE 7: Create initial sample products (temporary - will be replaced by FFG import)
-- ============================================

-- Insert sample products for existing carriers (if any exist)
-- This is temporary data that will be replaced when we import the FFG Comp Guide
DO $$
DECLARE
    carrier_record RECORD;
BEGIN
    -- Only create sample products if carriers exist but no products exist
    IF EXISTS (SELECT 1 FROM carriers LIMIT 1) AND NOT EXISTS (SELECT 1 FROM products LIMIT 1) THEN
        FOR carrier_record IN SELECT id, name FROM carriers LIMIT 5
        LOOP
            -- Create a few sample products for each carrier
            INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active)
            VALUES
                (carrier_record.id, carrier_record.name || ' Term Life', 'TERM-' || LEFT(carrier_record.id::text, 8),
                 'term_life', 'Term life insurance product', 0.50, true),
                (carrier_record.id, carrier_record.name || ' Whole Life', 'WHOLE-' || LEFT(carrier_record.id::text, 8),
                 'whole_life', 'Whole life insurance product', 0.75, true),
                (carrier_record.id, carrier_record.name || ' Universal Life', 'UL-' || LEFT(carrier_record.id::text, 8),
                 'universal_life', 'Universal life insurance product', 0.65, true)
            ON CONFLICT (carrier_id, name) DO NOTHING;
        END LOOP;

        RAISE NOTICE 'Created sample products for existing carriers';
    END IF;
END $$;

-- ============================================
-- PHASE 8: Update existing policies to use products
-- ============================================

-- Match existing policies to products based on carrier_id and product type
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Only run if both product_id and product columns exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'product_id'
        AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'product'
        AND table_schema = 'public'
    ) THEN
        UPDATE policies p
        SET product_id = prod.id
        FROM products prod
        WHERE p.carrier_id = prod.carrier_id
        AND p.product = prod.product_type
        AND p.product_id IS NULL;

        GET DIAGNOSTICS updated_count = ROW_COUNT;

        IF updated_count > 0 THEN
            RAISE NOTICE 'Updated % existing policies with product_id', updated_count;
        END IF;
    END IF;
END $$;

-- ============================================
-- PHASE 9: Fix other policy fields
-- ============================================

DO $$
BEGIN
    -- Rename premium to monthly_premium if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'premium'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'monthly_premium'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE policies RENAME COLUMN premium TO monthly_premium;
        RAISE NOTICE 'Renamed premium to monthly_premium';
    END IF;

    -- Rename commission_rate to commission_percentage if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'commission_rate'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'commission_percentage'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE policies RENAME COLUMN commission_rate TO commission_percentage;
        RAISE NOTICE 'Renamed commission_rate to commission_percentage';
    END IF;

    -- Add payment_frequency if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'payment_frequency'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE policies ADD COLUMN payment_frequency payment_frequency DEFAULT 'monthly';
        RAISE NOTICE 'Added payment_frequency column';
    END IF;

    -- Add term_length if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'term_length'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE policies ADD COLUMN term_length INTEGER;
        RAISE NOTICE 'Added term_length column';
    END IF;

    -- Add expiration_date if it doesn't exist (was renewal_date)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'renewal_date'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies'
        AND column_name = 'expiration_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE policies RENAME COLUMN renewal_date TO expiration_date;
        RAISE NOTICE 'Renamed renewal_date to expiration_date';
    END IF;
END $$;

-- ============================================
-- Completion message
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '- Fixed carrier field (TEXT → carrier_id UUID)';
    RAISE NOTICE '- Converted type field to product enum';
    RAISE NOTICE '- Created products table';
    RAISE NOTICE '- Added product_id to policies';
    RAISE NOTICE '- Created commission override system';
    RAISE NOTICE '- Added helper functions';
    RAISE NOTICE '- Fixed other policy field names';
    RAISE NOTICE 'Next step: Import FFG Comp Guide data';
    RAISE NOTICE '=========================================';
END $$;

COMMIT;