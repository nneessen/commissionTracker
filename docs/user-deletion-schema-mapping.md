# User Deletion Schema Mapping

Complete mapping of all tables that reference users in the commission tracker database.

## Tables and User Columns

### Direct user_id References
1. **clients** - user_id
2. **commissions** - user_id (⚠️ NOT agent_id!)
3. **email_quota_tracking** - user_id
4. **email_watch_subscriptions** - user_id
5. **expense_categories** - user_id
6. **expense_templates** - user_id
7. **expenses** - user_id
8. **notifications** - user_id
9. **onboarding_phases** - user_id
10. **policies** - user_id
11. **recruit_phase_progress** - user_id
12. **settings** - user_id
13. **user_activity_log** - user_id, performed_by
14. **user_documents** - user_id, uploaded_by
15. **user_email_oauth_tokens** - user_id
16. **user_emails** - user_id, sender_id
17. **user_targets** - user_id
18. **workflow_email_tracking** - user_id
19. **workflow_rate_limits** - user_id

### Creator/Actor References
20. **email_queue** - recipient_id
21. **email_templates** - created_by
22. **email_triggers** - created_by
23. **message_threads** - created_by
24. **messages** - sender_id
25. **pipeline_templates** - created_by
26. **system_audit_log** - performed_by

### Hierarchy/Relationship References
27. **hierarchy_invitations** - invitee_id, inviter_id
28. **user_profiles** - user_id, recruiter_id, upline_id, approved_by, archived_by

### Commission Override References
29. **override_commissions** - base_agent_id, override_agent_id

### Recruiting Progress References
30. **recruit_checklist_progress** - user_id, completed_by, verified_by

## Deletion Order (Children First, Parents Last)

1. workflow_email_tracking
2. workflow_rate_limits
3. user_activity_log
4. user_documents
5. user_emails
6. user_email_oauth_tokens
7. email_watch_subscriptions
8. email_quota_tracking
9. email_queue
10. email_triggers
11. email_templates
12. messages
13. message_threads
14. notifications
15. recruit_checklist_progress
16. recruit_phase_progress
17. onboarding_phases
18. hierarchy_invitations (both inviter and invitee)
19. override_commissions (both base_agent and override_agent)
20. commissions
21. policies
22. clients
23. expenses
24. expense_templates
25. expense_categories
26. settings
27. user_targets
28. pipeline_templates
29. system_audit_log
30. user_profiles (self-references: recruiter, upline, archived_by)
31. auth.users (Supabase auth table)

## Critical Errors Fixed

### Previous Migration Errors:
1. ❌ Used `agent_id` for commissions table → ✅ Correct column is `user_id`
2. ❌ Used `agent_id` for override_commissions → ✅ Correct columns are `base_agent_id` and `override_agent_id`
3. ❌ Used `recruiting_checklists` table → ✅ Correct table is `recruit_checklist_progress`
4. ❌ Used `recruit_id` column → ✅ Correct column is `user_id`

## Notes

- All column names verified from src/types/database.types.ts
- Foreign key relationships documented
- Some tables have CASCADE delete rules that may handle automatic cleanup
- RLS policies may affect deletion permissions
