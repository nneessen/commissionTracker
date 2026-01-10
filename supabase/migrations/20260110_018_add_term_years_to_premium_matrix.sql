-- Migration: 20260110_018_add_term_years_to_premium_matrix.sql
-- Description: Add term_years column for term life insurance products
-- Term products have different rates for 10, 15, 20, 25, 30 year terms

-- Step 1: Add the term_years column (nullable - only used for term products)
ALTER TABLE premium_matrix
ADD COLUMN IF NOT EXISTS term_years INTEGER;

-- Step 2: Add check constraint for valid term lengths
ALTER TABLE premium_matrix
ADD CONSTRAINT premium_matrix_term_years_check
CHECK (term_years IS NULL OR term_years IN (10, 15, 20, 25, 30));

-- Step 3: Drop old unique index and create new one that includes term_years
-- The old constraint was: product_id, age, face_amount, gender, tobacco_class, health_class, imo_id
DROP INDEX IF EXISTS premium_matrix_unique_idx;
DROP INDEX IF EXISTS premium_matrix_product_id_age_face_amount_gender_tobacco_cl_key;

-- Create new unique constraint including term_years (using COALESCE for NULL handling)
CREATE UNIQUE INDEX premium_matrix_unique_idx ON premium_matrix (
  product_id, age, face_amount, gender, tobacco_class, health_class, imo_id, COALESCE(term_years, 0)
);

-- Step 4: Update onConflict constraint name for upserts
-- Note: The service needs to include term_years in the onConflict clause

-- Step 5: Create index on term_years for faster lookups
CREATE INDEX IF NOT EXISTS premium_matrix_term_years_idx ON premium_matrix (term_years)
WHERE term_years IS NOT NULL;

COMMENT ON COLUMN premium_matrix.term_years IS 'Term length in years for term life products (10, 15, 20, 25, 30). NULL for non-term products (whole life, final expense, etc.)';
