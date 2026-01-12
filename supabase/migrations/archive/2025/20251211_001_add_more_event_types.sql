-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251211_001_add_more_event_types.sql

-- Add more comprehensive event types for workflow triggers
-- Organized by category for better UX

-- Recruiting Events
INSERT INTO trigger_event_types (event_name, category, description, available_variables, is_active)
VALUES
  ('recruit.application_submitted', 'recruit', 'When a new recruit submits an application', '{"recruit_id": "string", "recruit_name": "string", "recruit_email": "string"}', true),
  ('recruit.phase_changed', 'recruit', 'When a recruit moves to a different phase', '{"recruit_id": "string", "old_phase": "string", "new_phase": "string"}', true),
  ('recruit.interview_scheduled', 'recruit', 'When an interview is scheduled', '{"recruit_id": "string", "interview_date": "string", "interviewer": "string"}', true),
  ('recruit.offer_sent', 'recruit', 'When an offer is sent to a recruit', '{"recruit_id": "string", "offer_details": "string"}', true),
  ('recruit.onboarding_started', 'recruit', 'When onboarding process begins', '{"recruit_id": "string", "start_date": "string"}', true),
  ('recruit.graduated_to_agent', 'recruit', 'When a recruit graduates to become an agent', '{"recruit_id": "string", "agent_id": "string", "graduation_date": "string"}', true),
  ('recruit.dropped_out', 'recruit', 'When a recruit drops out of the pipeline', '{"recruit_id": "string", "reason": "string"}', true)
ON CONFLICT (event_name) DO UPDATE SET
  description = EXCLUDED.description,
  available_variables = EXCLUDED.available_variables;

-- Policy Events
INSERT INTO trigger_event_types (event_name, category, description, available_variables, is_active)
VALUES
  ('policy.created', 'policy', 'When a new policy is created', '{"policy_id": "string", "policy_number": "string", "client_name": "string", "premium": "number"}', true),
  ('policy.approved', 'policy', 'When a policy is approved', '{"policy_id": "string", "approved_by": "string", "approval_date": "string"}', true),
  ('policy.issued', 'policy', 'When a policy is issued', '{"policy_id": "string", "issue_date": "string", "effective_date": "string"}', true),
  ('policy.renewal_due', 'policy', 'When a policy is due for renewal', '{"policy_id": "string", "renewal_date": "string", "days_until_renewal": "number"}', true),
  ('policy.cancelled', 'policy', 'When a policy is cancelled', '{"policy_id": "string", "cancellation_date": "string", "reason": "string"}', true),
  ('policy.lapsed', 'policy', 'When a policy lapses', '{"policy_id": "string", "lapse_date": "string"}', true),
  ('policy.reinstated', 'policy', 'When a policy is reinstated', '{"policy_id": "string", "reinstatement_date": "string"}', true)
ON CONFLICT (event_name) DO UPDATE SET
  description = EXCLUDED.description,
  available_variables = EXCLUDED.available_variables;

-- Commission Events
INSERT INTO trigger_event_types (event_name, category, description, available_variables, is_active)
VALUES
  ('commission.earned', 'commission', 'When a commission is earned', '{"commission_id": "string", "amount": "number", "policy_id": "string"}', true),
  ('commission.paid', 'commission', 'When a commission is paid out', '{"commission_id": "string", "amount": "number", "payment_date": "string"}', true),
  ('commission.chargeback', 'commission', 'When a chargeback occurs', '{"commission_id": "string", "chargeback_amount": "number", "reason": "string"}', true),
  ('commission.advance_issued', 'commission', 'When an advance is issued', '{"advance_id": "string", "amount": "number", "agent_id": "string"}', true),
  ('commission.advance_recovered', 'commission', 'When an advance is recovered', '{"advance_id": "string", "recovered_amount": "number"}', true),
  ('commission.split_created', 'commission', 'When a commission split is created', '{"split_id": "string", "primary_agent": "string", "split_percentage": "number"}', true)
ON CONFLICT (event_name) DO UPDATE SET
  description = EXCLUDED.description,
  available_variables = EXCLUDED.available_variables;

-- User Management Events
INSERT INTO trigger_event_types (event_name, category, description, available_variables, is_active)
VALUES
  ('user.registered', 'user', 'When a new user registers', '{"user_id": "string", "email": "string", "registration_date": "string"}', true),
  ('user.approved', 'user', 'When a user is approved', '{"user_id": "string", "approved_by": "string", "approval_date": "string"}', true),
  ('user.role_changed', 'user', 'When user role is changed', '{"user_id": "string", "old_role": "string", "new_role": "string"}', true),
  ('user.profile_updated', 'user', 'When user profile is updated', '{"user_id": "string", "updated_fields": "array"}', true),
  ('user.password_reset', 'user', 'When user resets password', '{"user_id": "string", "reset_date": "string"}', true),
  ('user.deactivated', 'user', 'When a user account is deactivated', '{"user_id": "string", "deactivation_date": "string", "reason": "string"}', true),
  ('user.login', 'user', 'When a user logs in', '{"user_id": "string", "login_time": "string", "ip_address": "string"}', true)
ON CONFLICT (event_name) DO UPDATE SET
  description = EXCLUDED.description,
  available_variables = EXCLUDED.available_variables;

-- Email Activity Events
INSERT INTO trigger_event_types (event_name, category, description, available_variables, is_active)
VALUES
  ('email.sent', 'email', 'When an email is sent', '{"email_id": "string", "recipient": "string", "subject": "string"}', true),
  ('email.opened', 'email', 'When an email is opened', '{"email_id": "string", "opened_at": "string", "recipient": "string"}', true),
  ('email.clicked', 'email', 'When a link in email is clicked', '{"email_id": "string", "link_url": "string", "clicked_at": "string"}', true),
  ('email.bounced', 'email', 'When an email bounces', '{"email_id": "string", "bounce_type": "string", "recipient": "string"}', true),
  ('email.unsubscribed', 'email', 'When someone unsubscribes', '{"email_id": "string", "recipient": "string", "unsubscribe_date": "string"}', true),
  ('email.marked_spam', 'email', 'When email is marked as spam', '{"email_id": "string", "recipient": "string", "marked_date": "string"}', true)
ON CONFLICT (event_name) DO UPDATE SET
  description = EXCLUDED.description,
  available_variables = EXCLUDED.available_variables;

-- System Events
INSERT INTO trigger_event_types (event_name, category, description, available_variables, is_active)
VALUES
  ('system.daily_report', 'system', 'Daily system report trigger', '{"report_date": "string", "report_type": "string"}', true),
  ('system.weekly_summary', 'system', 'Weekly summary trigger', '{"week_start": "string", "week_end": "string"}', true),
  ('system.monthly_close', 'system', 'Monthly closing trigger', '{"month": "string", "year": "number"}', true),
  ('system.quota_reached', 'system', 'When a quota is reached', '{"quota_type": "string", "achieved_value": "number", "target_value": "number"}', true),
  ('system.threshold_exceeded', 'system', 'When a threshold is exceeded', '{"threshold_type": "string", "value": "number", "limit": "number"}', true),
  ('system.backup_completed', 'system', 'When system backup completes', '{"backup_id": "string", "backup_size": "string", "completion_time": "string"}', true),
  ('system.maintenance_scheduled', 'system', 'When maintenance is scheduled', '{"maintenance_date": "string", "duration": "string", "type": "string"}', true)
ON CONFLICT (event_name) DO UPDATE SET
  description = EXCLUDED.description,
  available_variables = EXCLUDED.available_variables;

-- Create index for better performance on category queries
CREATE INDEX IF NOT EXISTS idx_trigger_event_types_category ON trigger_event_types(category);
CREATE INDEX IF NOT EXISTS idx_trigger_event_types_active_category ON trigger_event_types(is_active, category) WHERE is_active = true;