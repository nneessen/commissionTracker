-- Migration: Comp Guide Data Import
-- Generated: 2025-09-27T20:19:48.216Z
-- Source: src/data/compGuideData.ts
-- Total carriers: 8

BEGIN;

-- Create backup of existing comp_guide data
CREATE TABLE IF NOT EXISTS comp_guide_backup_2025-09-27 AS
SELECT * FROM comp_guide;

-- Tag for rollback identification
ALTER TABLE comp_guide ADD COLUMN IF NOT EXISTS migration_source TEXT;
ALTER TABLE comp_guide ADD COLUMN IF NOT EXISTS migration_date TIMESTAMP WITH TIME ZONE;

-- Delete any existing data from this migration source
DELETE FROM comp_guide WHERE migration_source = 'compGuideData.ts';


-- Carrier: United Home Life
INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.4 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%United Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;


-- Carrier: SBLI
INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.4 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%SBLI%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;


-- Carrier: American Home Life
INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American Home Life%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;


-- Carrier: John Hancock
INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.4 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'premium' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'premium' as comp_level,
  1.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%John Hancock%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;


-- Carrier: American-Amicable Group
INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'street' as comp_level,
  0.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'street' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'street' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'street' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'release' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'release' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'release' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'enhanced' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'enhanced' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'premium' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'premium' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.4 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.4 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.4 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'street' as comp_level,
  0 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'street' as comp_level,
  0 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'street' as comp_level,
  0.02 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'street' as comp_level,
  0.03 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'release' as comp_level,
  0.035 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'release' as comp_level,
  0.035 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'release' as comp_level,
  0.04 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'release' as comp_level,
  0.04 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'enhanced' as comp_level,
  0.0425 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'enhanced' as comp_level,
  0.045 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'enhanced' as comp_level,
  0.0475 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'enhanced' as comp_level,
  0.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'premium' as comp_level,
  0.0525 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'annuity' as product_type,
  'premium' as comp_level,
  0.055 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.4 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%American-Amicable Group%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;


-- Carrier: Corebridge Financial
INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.72 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.77 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.82 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.87 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.92 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.97 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.02 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.07 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.12 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.17 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.22 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.27 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.32 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.37 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Corebridge Financial%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;


-- Carrier: Transamerica
INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'term_life' as product_type,
  'premium' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.4 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.92 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.92 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.94 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.98 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.98 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.02 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.07 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.28 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.33 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.38 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.43 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.48 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.48 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.53 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.58 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.58 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.63 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.68 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.68 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'street' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'premium' as comp_level,
  1.17 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'universal_life' as product_type,
  'premium' as comp_level,
  1.22 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%Transamerica%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;


-- Carrier: ELCO Mutual
INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.3 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.35 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.4 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.4 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.45 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.5 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.15 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.2 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.25 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.95 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.05 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  1.1 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.55 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.6 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'street' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.65 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.7 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'release' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.75 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.8 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'enhanced' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  0.85 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  'whole_life' as product_type,
  'premium' as comp_level,
  0.9 as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%ELCO Mutual%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;


-- Migration summary
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'Total comp_guide records processed: 588';
  RAISE NOTICE 'Records imported from: compGuideData.ts';
  RAISE NOTICE 'Migration date: %', NOW();
END $$;

COMMIT;

-- Rollback script (run separately if needed):
/*
BEGIN;
DELETE FROM comp_guide WHERE migration_source = 'compGuideData.ts';
-- Restore from backup if needed:
-- INSERT INTO comp_guide SELECT * FROM comp_guide_backup_2025-09-27;
COMMIT;
*/
