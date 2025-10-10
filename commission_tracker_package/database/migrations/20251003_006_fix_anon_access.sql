-- Fix RLS policies to allow anonymous access to carriers and products

-- Drop restrictive policies
DROP POLICY IF EXISTS "Authenticated users can manage carriers" ON carriers;
DROP POLICY IF EXISTS "Enable read access for all users" ON carriers;
DROP POLICY IF EXISTS "Enable read access for all users" ON products;

-- Create permissive policies for anonymous/public access
CREATE POLICY "Allow public read carriers"
  ON carriers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read products"
  ON products
  FOR SELECT
  TO public
  USING (is_active = true);
