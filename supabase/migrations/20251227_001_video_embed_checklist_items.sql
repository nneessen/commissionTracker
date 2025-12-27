-- ============================================================================
-- Migration: Add video_embed type to phase_checklist_items
-- Author: Claude Code
-- Date: 2025-12-27
-- ============================================================================
--
-- Description:
--   Adds support for video_embed checklist item type to enable
--   embedded training videos (YouTube, Vimeo, Loom) in recruiting pipelines.
--
-- Changes:
--   - Updates column comment to document new video_embed item_type value
--   - No schema changes needed (item_type is TEXT, not ENUM)
--   - Video metadata stored in existing metadata JSONB column
--
-- ============================================================================

-- Update comment to document the new item_type value
COMMENT ON COLUMN phase_checklist_items.item_type IS
'Type of checklist item. Allowed values:
  - document_upload: Recruit uploads a document
  - task_completion: Simple task checkbox
  - training_module: Training/learning content with external link
  - manual_approval: Requires upline/admin approval
  - automated_check: System-verified check
  - signature_required: E-signature required
  - scheduling_booking: Schedule appointment (Calendly, Google Calendar, Zoom, Google Meet)
  - video_embed: Embedded training video (YouTube, Vimeo, Loom)';

-- Add comment for metadata column to document video embed structure
COMMENT ON COLUMN phase_checklist_items.metadata IS
'JSONB metadata for type-specific configuration.

For scheduling_booking items (SchedulingChecklistMetadata):
  {
    "scheduling_type": "calendly" | "google_calendar" | "zoom" | "google_meet",
    "booking_url": "https://...",
    "custom_booking_url": "https://..." (optional),
    "instructions": "..." (optional),
    "integration_id": "uuid" (optional),
    "meeting_id": "..." (optional, for Zoom/Meet),
    "passcode": "..." (optional, for Zoom)
  }

For video_embed items (VideoEmbedMetadata):
  {
    "platform": "youtube" | "vimeo" | "loom",
    "video_url": "https://...",
    "video_id": "extracted_id",
    "title": "..." (optional),
    "duration": 123 (optional, seconds),
    "require_full_watch": true|false (optional),
    "auto_complete": true|false (optional)
  }';
