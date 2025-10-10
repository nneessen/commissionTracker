-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251003_004_enable_public_access.sql
-- Enable public read access to carriers and products

-- First, check if RLS is already enabled and disable it temporarily to reset policies
DO $$
BEGIN
    -- Disable RLS temporarily to clean up
    ALTER TABLE carriers DISABLE ROW LEVEL SECURITY;
    ALTER TABLE products DISABLE ROW LEVEL SECURITY;

    -- Drop any existing policies
    DROP POLICY IF EXISTS "Allow public read access to carriers" ON carriers;
    DROP POLICY IF EXISTS "Allow authenticated users to manage carriers" ON carriers;
    DROP POLICY IF EXISTS "Enable read access for all users" ON carriers;
    DROP POLICY IF EXISTS "carriers_read_policy" ON carriers;

    DROP POLICY IF EXISTS "Allow public read access to products" ON products;
    DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON products;
    DROP POLICY IF EXISTS "Enable read access for all users" ON products;
    DROP POLICY IF EXISTS "products_read_policy" ON products;
END $$;

-- Now enable RLS and create simple public read policies
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies that allow everyone (including anonymous users) to read
CREATE POLICY "Enable read access for all users" ON carriers
    FOR SELECT
    USING (true);

CREATE POLICY "Enable read access for all users" ON products
    FOR SELECT
    USING (true);

-- Verify the data is accessible
DO $$
DECLARE
    carrier_count INTEGER;
    product_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO carrier_count FROM carriers;
    SELECT COUNT(*) INTO product_count FROM products;

    RAISE NOTICE 'Carriers accessible: %', carrier_count;
    RAISE NOTICE 'Products accessible: %', product_count;
END $$;