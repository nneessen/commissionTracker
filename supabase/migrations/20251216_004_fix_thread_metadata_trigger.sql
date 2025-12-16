-- supabase/migrations/20251216_004_fix_thread_metadata_trigger.sql
-- Fix: update_thread_metadata trigger compares UUID id with TEXT thread_id
-- Cast thread_id to UUID for comparison

CREATE OR REPLACE FUNCTION update_thread_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE email_threads
    SET
      last_message_at = GREATEST(last_message_at, NEW.created_at),
      message_count = message_count + 1,
      unread_count = CASE WHEN NEW.is_incoming AND NOT NEW.is_read THEN unread_count + 1 ELSE unread_count END,
      snippet = LEFT(COALESCE(NEW.body_text, ''), 150),
      participant_emails = ARRAY(
        SELECT DISTINCT unnest(
          participant_emails ||
          COALESCE(NEW.to_addresses, '{}') ||
          ARRAY[COALESCE(NEW.from_address, '')]
        )
      ),
      updated_at = now()
    WHERE id = NEW.thread_id::uuid;  -- Cast TEXT to UUID
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
