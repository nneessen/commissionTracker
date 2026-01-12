-- supabase/migrations/20251227_003_add_metadata_type_field.sql
-- Add _type discriminator field to existing metadata for type safety

-- Add _type field to existing scheduling_booking metadata
UPDATE phase_checklist_items
SET metadata = jsonb_set(metadata, '{_type}', '"scheduling_booking"')
WHERE item_type = 'scheduling_booking'
  AND metadata IS NOT NULL
  AND NOT metadata ? '_type';

-- Add _type field to existing video_embed metadata
UPDATE phase_checklist_items
SET metadata = jsonb_set(metadata, '{_type}', '"video_embed"')
WHERE item_type = 'video_embed'
  AND metadata IS NOT NULL
  AND NOT metadata ? '_type';

-- Verify migration (for logging purposes)
DO $$
DECLARE
  scheduling_count INT;
  video_count INT;
BEGIN
  SELECT COUNT(*) INTO scheduling_count
  FROM phase_checklist_items
  WHERE item_type = 'scheduling_booking'
    AND metadata IS NOT NULL
    AND metadata ? '_type';

  SELECT COUNT(*) INTO video_count
  FROM phase_checklist_items
  WHERE item_type = 'video_embed'
    AND metadata IS NOT NULL
    AND metadata ? '_type';

  RAISE NOTICE 'Migration complete: % scheduling items and % video items now have _type field',
    scheduling_count, video_count;
END $$;
