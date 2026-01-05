-- supabase/migrations/20260105_011_instagram_job_queue.sql
-- Instagram background job queue for async processing
-- Supports: media downloads, scheduled message processing, metadata refresh

-- Job type enum
CREATE TYPE instagram_job_type AS ENUM (
  'download_profile_picture',
  'download_message_media',
  'send_scheduled_message',
  'refresh_participant_metadata'
);

-- Job status enum
CREATE TYPE instagram_job_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'expired'
);

-- Main job queue table
CREATE TABLE instagram_job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type instagram_job_type NOT NULL,

  -- Job payload - varies by job_type
  -- download_profile_picture: { conversation_id, participant_id, source_url }
  -- download_message_media: { message_id, conversation_id, source_url, media_type }
  -- send_scheduled_message: { scheduled_message_id }
  -- refresh_participant_metadata: { conversation_id, participant_id }
  payload JSONB NOT NULL,

  -- Processing state
  status instagram_job_status NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0, -- Higher = more urgent

  -- Retry logic
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Reference to integration (for cleanup/filtering)
  integration_id UUID REFERENCES instagram_integrations(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for finding pending jobs efficiently
CREATE INDEX idx_instagram_job_queue_pending
  ON instagram_job_queue(scheduled_for, priority DESC)
  WHERE status = 'pending';

-- Index for filtering by integration
CREATE INDEX idx_instagram_job_queue_integration
  ON instagram_job_queue(integration_id)
  WHERE status IN ('pending', 'processing');

-- Index for job type filtering
CREATE INDEX idx_instagram_job_queue_type
  ON instagram_job_queue(job_type, status);

-- Index for cleanup of old completed/failed jobs
CREATE INDEX idx_instagram_job_queue_cleanup
  ON instagram_job_queue(completed_at)
  WHERE status IN ('completed', 'failed', 'expired');

-- RLS: Only service role can access (CRON/edge functions)
ALTER TABLE instagram_job_queue ENABLE ROW LEVEL SECURITY;

-- No policies = only service_role can access
-- This is intentional - jobs are managed by backend only

-- Add cached media columns to conversations table
ALTER TABLE instagram_conversations
ADD COLUMN IF NOT EXISTS participant_avatar_cached_url TEXT,
ADD COLUMN IF NOT EXISTS participant_avatar_cached_at TIMESTAMPTZ;

-- Add cached media columns to messages table
ALTER TABLE instagram_messages
ADD COLUMN IF NOT EXISTS media_cached_url TEXT,
ADD COLUMN IF NOT EXISTS media_cached_at TIMESTAMPTZ;

-- Comment on table
COMMENT ON TABLE instagram_job_queue IS 'Background job queue for Instagram async processing (media downloads, scheduled sends)';
COMMENT ON COLUMN instagram_job_queue.payload IS 'Job-specific data in JSON format. Structure varies by job_type.';
COMMENT ON COLUMN instagram_job_queue.priority IS 'Job priority. Higher values = more urgent. Default 0.';

-- Function to claim jobs for processing (atomic with row locking)
CREATE OR REPLACE FUNCTION claim_instagram_jobs(
  p_job_types instagram_job_type[],
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF instagram_job_queue
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE instagram_job_queue
  SET
    status = 'processing',
    started_at = NOW(),
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE id IN (
    SELECT id
    FROM instagram_job_queue
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
      AND (p_job_types IS NULL OR job_type = ANY(p_job_types))
    ORDER BY priority DESC, scheduled_for ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Function to mark job as completed
CREATE OR REPLACE FUNCTION complete_instagram_job(
  p_job_id UUID,
  p_result JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE instagram_job_queue
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;

-- Function to mark job as failed (with retry logic)
CREATE OR REPLACE FUNCTION fail_instagram_job(
  p_job_id UUID,
  p_error TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempts INTEGER;
  v_max_attempts INTEGER;
BEGIN
  SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
  FROM instagram_job_queue WHERE id = p_job_id;

  IF v_attempts >= v_max_attempts THEN
    -- Max retries reached - mark as permanently failed
    UPDATE instagram_job_queue
    SET
      status = 'failed',
      last_error = p_error,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_job_id;
  ELSE
    -- Reset to pending for retry (with exponential backoff)
    UPDATE instagram_job_queue
    SET
      status = 'pending',
      last_error = p_error,
      scheduled_for = NOW() + (POWER(2, v_attempts) || ' minutes')::INTERVAL,
      updated_at = NOW()
    WHERE id = p_job_id;
  END IF;
END;
$$;

-- Function to enqueue a new job
CREATE OR REPLACE FUNCTION enqueue_instagram_job(
  p_job_type instagram_job_type,
  p_payload JSONB,
  p_integration_id UUID DEFAULT NULL,
  p_priority INTEGER DEFAULT 0,
  p_scheduled_for TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO instagram_job_queue (job_type, payload, integration_id, priority, scheduled_for)
  VALUES (p_job_type, p_payload, p_integration_id, p_priority, p_scheduled_for)
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

-- Function to clean up old completed/failed jobs
CREATE OR REPLACE FUNCTION cleanup_instagram_jobs(
  p_older_than INTERVAL DEFAULT '7 days'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM instagram_job_queue
  WHERE status IN ('completed', 'failed', 'expired')
    AND completed_at < NOW() - p_older_than;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
