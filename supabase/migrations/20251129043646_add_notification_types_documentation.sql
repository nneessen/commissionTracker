-- Document notification types for the notifications table
-- This migration adds documentation for all supported notification types

COMMENT ON COLUMN notifications.type IS 'Notification types:
- recruit_graduated: Recruit completed phase 8 and graduated to agent
- document_approved: Document was approved by admin/upline
- document_rejected: Document was rejected (needs resubmission)
- document_uploaded: New document uploaded (notification to upline)
- new_message: New message received in thread
- phase_completed: Recruit completed a phase
- phase_advanced: Recruit was advanced to next phase by admin
- checklist_item_completed: Checklist item marked as complete
- email_received: New email received via user_emails table';

-- Add index on notification type for faster filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Add index on read status for unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = false;
