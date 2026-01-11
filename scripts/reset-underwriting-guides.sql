-- scripts/reset-underwriting-guides.sql
-- Reset all underwriting guides for re-parsing after PDF extraction fix
-- Run this AFTER deploying the updated parse-underwriting-guide function

-- Step 1: Check current state
SELECT
  parsing_status,
  COUNT(*) as count,
  AVG(LENGTH(parsed_content::text)) as avg_content_length
FROM underwriting_guides
GROUP BY parsing_status;

-- Step 2: Reset all guides to pending status
UPDATE underwriting_guides
SET
  parsing_status = 'pending',
  parsed_content = NULL,
  parsing_error = NULL,
  updated_at = NOW()
WHERE parsing_status IN ('completed', 'failed');

-- Step 3: Delete all invalid/empty criteria records
DELETE FROM carrier_underwriting_criteria
WHERE
  criteria = '{}'::jsonb
  OR criteria->>'ageLimits' IS NULL
  OR extraction_status = 'failed';

-- Step 4: Verify reset
SELECT
  parsing_status,
  COUNT(*) as count
FROM underwriting_guides
GROUP BY parsing_status;

-- After running this, trigger re-parsing from the UI or via API calls
