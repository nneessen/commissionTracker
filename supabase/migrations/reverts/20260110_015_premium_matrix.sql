-- supabase/migrations/reverts/20260110_015_premium_matrix.sql
-- Revert the premium matrix table

-- Drop trigger
DROP TRIGGER IF EXISTS set_premium_matrix_updated_at ON premium_matrix;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view premium matrix for their IMO" ON premium_matrix;
DROP POLICY IF EXISTS "Users can insert premium matrix for their IMO" ON premium_matrix;
DROP POLICY IF EXISTS "Users can update premium matrix for their IMO" ON premium_matrix;
DROP POLICY IF EXISTS "Users can delete premium matrix for their IMO" ON premium_matrix;

-- Drop indexes (will be dropped with table, but explicit is safer)
DROP INDEX IF EXISTS idx_premium_matrix_product;
DROP INDEX IF EXISTS idx_premium_matrix_lookup;
DROP INDEX IF EXISTS idx_premium_matrix_age;
DROP INDEX IF EXISTS idx_premium_matrix_face;

-- Drop the table
DROP TABLE IF EXISTS premium_matrix;
