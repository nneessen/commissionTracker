-- Migration: 20260110_019_fix_premium_matrix_constraint.sql
-- Description: Fix the unique constraint to include term_years
-- The previous migration couldn't drop the index because it's backing a constraint

-- Step 1: Drop the old unique constraint (not index)
ALTER TABLE premium_matrix
DROP CONSTRAINT IF EXISTS premium_matrix_product_id_age_face_amount_gender_tobacco_cl_key;

-- Step 2: Create new unique index that includes term_years with COALESCE for NULL handling
DROP INDEX IF EXISTS premium_matrix_unique_idx;
CREATE UNIQUE INDEX premium_matrix_unique_idx ON premium_matrix (
  product_id, age, face_amount, gender, tobacco_class, health_class, imo_id, COALESCE(term_years, 0)
);
