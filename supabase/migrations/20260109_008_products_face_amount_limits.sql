-- supabase/migrations/20260109_008_products_face_amount_limits.sql
-- Add face amount limits to products table for proper underwriting filtering

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS min_face_amount INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_face_amount INTEGER DEFAULT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN products.min_face_amount IS 'Minimum face amount in dollars for this product';
COMMENT ON COLUMN products.max_face_amount IS 'Maximum face amount in dollars for this product (may vary by age - use metadata for age-tiered limits)';

-- Index for face amount queries
CREATE INDEX IF NOT EXISTS idx_products_face_amount
  ON products(min_face_amount, max_face_amount)
  WHERE is_active = true;
