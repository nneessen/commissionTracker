-- supabase/migrations/20260218142719_enable_notifications_realtime.sql
-- Enable Supabase Realtime for the notifications table.
-- Without this, NotificationContext.tsx channel subscription silently receives zero events.

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

COMMENT ON TABLE notifications IS 'User notifications. Realtime enabled for live push to clients.';
