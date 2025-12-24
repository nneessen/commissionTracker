-- Migration: Backfill booking_url in scheduling checklist item metadata
-- Description: Updates existing scheduling_booking items to include the booking_url
--              captured from the template owner's scheduling integrations.
--
-- Background: The original implementation looked up integrations at render time,
--             which failed for recruits (they don't own integrations). This migration
--             captures the URL in metadata so it works for all viewers.

-- Step 1: Create a temporary function to perform the backfill
CREATE OR REPLACE FUNCTION backfill_scheduling_booking_urls()
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  template_owner UUID,
  scheduling_type TEXT,
  booking_url TEXT,
  updated BOOLEAN
) AS $$
DECLARE
  rec RECORD;
  integration_rec RECORD;
  new_metadata JSONB;
  items_updated INT := 0;
  items_skipped INT := 0;
BEGIN
  -- Find all scheduling_booking items that need backfill
  FOR rec IN
    SELECT
      pci.id AS item_id,
      pci.item_name,
      pci.metadata,
      pt.created_by AS template_owner,
      pt.imo_id AS template_imo_id
    FROM phase_checklist_items pci
    JOIN pipeline_phases pp ON pci.phase_id = pp.id
    JOIN pipeline_templates pt ON pp.template_id = pt.id
    WHERE pci.item_type = 'scheduling_booking'
      AND pci.metadata IS NOT NULL
      -- Only process items that don't already have booking_url
      AND (pci.metadata->>'booking_url' IS NULL OR pci.metadata->>'booking_url' = '')
  LOOP
    -- Extract scheduling_type from metadata
    IF rec.metadata->>'scheduling_type' IS NULL THEN
      -- Skip items without scheduling_type
      items_skipped := items_skipped + 1;

      item_id := rec.item_id;
      item_name := rec.item_name;
      template_owner := rec.template_owner;
      scheduling_type := NULL;
      booking_url := NULL;
      updated := FALSE;
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- Look up the integration for the template owner
    SELECT si.* INTO integration_rec
    FROM scheduling_integrations si
    WHERE si.user_id = rec.template_owner
      AND si.integration_type = rec.metadata->>'scheduling_type'
      AND si.is_active = TRUE
    LIMIT 1;

    IF integration_rec IS NULL THEN
      -- No integration found, skip
      items_skipped := items_skipped + 1;

      item_id := rec.item_id;
      item_name := rec.item_name;
      template_owner := rec.template_owner;
      scheduling_type := rec.metadata->>'scheduling_type';
      booking_url := NULL;
      updated := FALSE;
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- Build updated metadata with booking_url and other integration fields
    new_metadata := rec.metadata || jsonb_build_object(
      'booking_url', integration_rec.booking_url,
      'integration_id', integration_rec.id
    );

    -- Add Zoom-specific fields if applicable
    IF integration_rec.integration_type = 'zoom' THEN
      IF integration_rec.meeting_id IS NOT NULL THEN
        new_metadata := new_metadata || jsonb_build_object('meeting_id', integration_rec.meeting_id);
      END IF;
      IF integration_rec.passcode IS NOT NULL THEN
        new_metadata := new_metadata || jsonb_build_object('passcode', integration_rec.passcode);
      END IF;
    END IF;

    -- Add instructions if not already set
    IF (rec.metadata->>'instructions' IS NULL OR rec.metadata->>'instructions' = '')
       AND integration_rec.instructions IS NOT NULL THEN
      new_metadata := new_metadata || jsonb_build_object('instructions', integration_rec.instructions);
    END IF;

    -- Update the item
    UPDATE phase_checklist_items
    SET metadata = new_metadata,
        updated_at = NOW()
    WHERE id = rec.item_id;

    items_updated := items_updated + 1;

    -- Return row for reporting
    item_id := rec.item_id;
    item_name := rec.item_name;
    template_owner := rec.template_owner;
    scheduling_type := rec.metadata->>'scheduling_type';
    booking_url := integration_rec.booking_url;
    updated := TRUE;
    RETURN NEXT;
  END LOOP;

  -- Log summary
  RAISE NOTICE 'Backfill complete: % items updated, % items skipped', items_updated, items_skipped;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Run the backfill and show results
DO $$
DECLARE
  result RECORD;
  total_updated INT := 0;
  total_skipped INT := 0;
BEGIN
  RAISE NOTICE '=== Starting Scheduling Booking URL Backfill ===';
  RAISE NOTICE '';

  FOR result IN SELECT * FROM backfill_scheduling_booking_urls() LOOP
    IF result.updated THEN
      RAISE NOTICE 'UPDATED: "%" -> %', result.item_name, result.booking_url;
      total_updated := total_updated + 1;
    ELSE
      RAISE NOTICE 'SKIPPED: "%" (no integration found for type: %)', result.item_name, COALESCE(result.scheduling_type, 'NULL');
      total_skipped := total_skipped + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== Backfill Summary ===';
  RAISE NOTICE 'Total updated: %', total_updated;
  RAISE NOTICE 'Total skipped: %', total_skipped;
END;
$$;

-- Step 3: Clean up the temporary function
DROP FUNCTION IF EXISTS backfill_scheduling_booking_urls();

-- Step 4: Verify the migration worked
DO $$
DECLARE
  items_without_url INT;
  items_with_url INT;
BEGIN
  -- Count items still missing booking_url
  SELECT COUNT(*) INTO items_without_url
  FROM phase_checklist_items
  WHERE item_type = 'scheduling_booking'
    AND metadata IS NOT NULL
    AND (metadata->>'booking_url' IS NULL OR metadata->>'booking_url' = '');

  -- Count items that now have booking_url
  SELECT COUNT(*) INTO items_with_url
  FROM phase_checklist_items
  WHERE item_type = 'scheduling_booking'
    AND metadata IS NOT NULL
    AND metadata->>'booking_url' IS NOT NULL
    AND metadata->>'booking_url' != '';

  RAISE NOTICE '';
  RAISE NOTICE '=== Verification ===';
  RAISE NOTICE 'Items with booking_url: %', items_with_url;
  RAISE NOTICE 'Items still missing booking_url: % (these need manual configuration)', items_without_url;
END;
$$;
