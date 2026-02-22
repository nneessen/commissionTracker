-- supabase/migrations/20260217123227_optimize_rls_auth_function_calls.sql
-- =============================================================================
-- Optimize RLS policies: wrap auth.uid() and auth.role() in (select ...)
-- =============================================================================
--
-- PostgreSQL treats direct auth.uid() / auth.role() calls as potentially volatile,
-- re-executing them for every row during policy evaluation. Wrapping in
-- (select auth.uid()) creates a scalar subquery that PostgreSQL evaluates once
-- and caches for the duration of the query.
--
-- This is a pure performance optimization with zero functional impact —
-- identical authorization results before and after.
--
-- Total policies optimized: 596
--
-- NOTE: No explicit BEGIN/COMMIT transaction wrapper. Each ALTER POLICY runs
-- as its own implicit transaction to avoid deadlocks on a live database with
-- concurrent connections holding locks on these tables.
-- =============================================================================

ALTER POLICY "Agency owners can update own agency" ON public.agencies
  USING ((owner_id = (select auth.uid())));

ALTER POLICY "Agents can create own requests" ON public.agency_requests
  WITH CHECK ((requester_id = (select auth.uid())));

ALTER POLICY "Approvers can reject pending requests" ON public.agency_requests
  USING (((approver_id = (select auth.uid())) AND (status = 'pending'::text)));

ALTER POLICY "Approvers can view pending requests" ON public.agency_requests
  USING ((approver_id = (select auth.uid())));

ALTER POLICY "Requesters can cancel pending requests" ON public.agency_requests
  USING (((requester_id = (select auth.uid())) AND (status = 'pending'::text)));

ALTER POLICY "Requesters can view own requests" ON public.agency_requests
  USING ((requester_id = (select auth.uid())));

ALTER POLICY "Agency owners can view credential metadata" ON public.agency_slack_credentials
  USING (((EXISTS ( SELECT 1
   FROM agencies a
  WHERE ((a.id = agency_slack_credentials.agency_id) AND (a.owner_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND (up.imo_id = agency_slack_credentials.imo_id) AND (('imo_admin'::text = ANY (up.roles)) OR ('super_admin'::text = ANY (up.roles))))))));

ALTER POLICY "IMO admins can manage credentials" ON public.agency_slack_credentials
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND (up.imo_id = agency_slack_credentials.imo_id) AND (('imo_admin'::text = ANY (up.roles)) OR ('super_admin'::text = ANY (up.roles)))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND (up.imo_id = agency_slack_credentials.imo_id) AND (('imo_admin'::text = ANY (up.roles)) OR ('super_admin'::text = ANY (up.roles)))))));

ALTER POLICY "Service role full access to agency_slack_credentials" ON public.agency_slack_credentials
  USING (((select auth.role()) = 'service_role'::text))
  WITH CHECK (((select auth.role()) = 'service_role'::text));

ALTER POLICY agent_contracts_select_policy ON public.agent_contracts
  USING (((agent_id = (select auth.uid())) OR (is_imo_admin() AND (imo_id = get_my_imo_id())) OR is_super_admin()));

ALTER POLICY agent_state_licenses_delete_policy ON public.agent_state_licenses
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ((up.is_super_admin = true) OR (up.is_admin = true))))));

ALTER POLICY agent_state_licenses_insert_policy ON public.agent_state_licenses
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ((up.is_super_admin = true) OR (up.is_admin = true))))));

ALTER POLICY agent_state_licenses_select_policy ON public.agent_state_licenses
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ((up.is_super_admin = true) OR (up.is_admin = true) OR (up.agency_id = ( SELECT user_profiles.agency_id
           FROM user_profiles
          WHERE (user_profiles.id = agent_state_licenses.agent_id))))))));

ALTER POLICY agent_state_licenses_update_policy ON public.agent_state_licenses
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ((up.is_super_admin = true) OR (up.is_admin = true))))));

ALTER POLICY agent_writing_numbers_select_policy ON public.agent_writing_numbers
  USING (((agent_id = (select auth.uid())) OR is_upline_of(agent_id) OR (is_imo_admin() AND (imo_id = get_my_imo_id())) OR is_super_admin()));

ALTER POLICY evaluations_affected_user_select ON public.alert_rule_evaluations
  USING ((affected_user_id = (select auth.uid())));

ALTER POLICY evaluations_owner_select ON public.alert_rule_evaluations
  USING ((EXISTS ( SELECT 1
   FROM alert_rules
  WHERE ((alert_rules.id = alert_rule_evaluations.rule_id) AND (alert_rules.owner_id = (select auth.uid()))))));

ALTER POLICY alert_rules_agency_owner_select ON public.alert_rules
  USING (((agency_id = get_my_agency_id()) AND (EXISTS ( SELECT 1
   FROM agencies
  WHERE ((agencies.id = alert_rules.agency_id) AND (agencies.owner_id = (select auth.uid())))))));

ALTER POLICY alert_rules_owner_delete ON public.alert_rules
  USING ((owner_id = (select auth.uid())));

ALTER POLICY alert_rules_owner_insert ON public.alert_rules
  WITH CHECK (((owner_id = (select auth.uid())) AND (((imo_id IS NOT NULL) AND (imo_id = get_my_imo_id())) OR ((agency_id IS NOT NULL) AND (agency_id = get_my_agency_id())))));

ALTER POLICY alert_rules_owner_select ON public.alert_rules
  USING ((owner_id = (select auth.uid())));

ALTER POLICY alert_rules_owner_update ON public.alert_rules
  USING ((owner_id = (select auth.uid())))
  WITH CHECK ((owner_id = (select auth.uid())));

ALTER POLICY "Service role can manage config" ON public.app_config
  USING (((select auth.role()) = 'service_role'::text))
  WITH CHECK (((select auth.role()) = 'service_role'::text));

ALTER POLICY "Agency owners can view agency audit logs" ON public.audit_log
  USING (((agency_id IS NOT NULL) AND (agency_id = get_my_agency_id()) AND (EXISTS ( SELECT 1
   FROM agencies
  WHERE ((agencies.id = audit_log.agency_id) AND (agencies.owner_id = (select auth.uid())))))));

ALTER POLICY "Authenticated users can insert application audit logs" ON public.audit_log
  WITH CHECK (((source = 'application'::audit_source) AND ((performed_by = (select auth.uid())) OR (performed_by IS NULL))));

ALTER POLICY "Users can view own performed audit logs" ON public.audit_log
  USING ((performed_by = (select auth.uid())));

ALTER POLICY "Users can manage own campaigns" ON public.bulk_email_campaigns
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can manage recipients for own campaigns" ON public.bulk_email_recipients
  USING ((EXISTS ( SELECT 1
   FROM bulk_email_campaigns
  WHERE ((bulk_email_campaigns.id = bulk_email_recipients.campaign_id) AND (bulk_email_campaigns.user_id = (select auth.uid()))))));

ALTER POLICY "Users can delete build charts from their IMO" ON public.carrier_build_charts
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can insert build charts for their IMO" ON public.carrier_build_charts
  WITH CHECK ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can update build charts from their IMO" ON public.carrier_build_charts
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))))
  WITH CHECK ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can view build charts from their IMO" ON public.carrier_build_charts
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can delete acceptance rules for their IMO" ON public.carrier_condition_acceptance
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can insert acceptance rules for their IMO" ON public.carrier_condition_acceptance
  WITH CHECK ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can update acceptance rules for their IMO" ON public.carrier_condition_acceptance
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can view acceptance rules for their IMO" ON public.carrier_condition_acceptance
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Agents can view own contracts" ON public.carrier_contracts
  USING ((agent_id = (select auth.uid())));

ALTER POLICY "Staff can manage contracts" ON public.carrier_contracts
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND ((user_profiles.roles @> ARRAY['trainer'::text]) OR (user_profiles.roles @> ARRAY['contracting_manager'::text]) OR (user_profiles.is_admin = true))))));

ALTER POLICY "Staff can view all contracts" ON public.carrier_contracts
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND ((user_profiles.roles @> ARRAY['trainer'::text]) OR (user_profiles.roles @> ARRAY['contracting_manager'::text]) OR (user_profiles.is_admin = true))))));

ALTER POLICY "Admins can delete criteria" ON public.carrier_underwriting_criteria
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND ((user_profiles.roles && ARRAY['imo_admin'::text, 'imo_owner'::text, 'admin'::text, 'super-admin'::text]) OR (user_profiles.is_super_admin = true))))));

ALTER POLICY "Admins can insert criteria" ON public.carrier_underwriting_criteria
  WITH CHECK ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND ((user_profiles.roles && ARRAY['imo_admin'::text, 'imo_owner'::text, 'admin'::text, 'super-admin'::text]) OR (user_profiles.is_super_admin = true))))));

ALTER POLICY "Admins can update criteria" ON public.carrier_underwriting_criteria
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND ((user_profiles.roles && ARRAY['imo_admin'::text, 'imo_owner'::text, 'admin'::text, 'super-admin'::text]) OR (user_profiles.is_super_admin = true))))))
  WITH CHECK ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND ((user_profiles.roles && ARRAY['imo_admin'::text, 'imo_owner'::text, 'admin'::text, 'super-admin'::text]) OR (user_profiles.is_super_admin = true))))));

ALTER POLICY "Users can view own IMO criteria" ON public.carrier_underwriting_criteria
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Approved users can manage chargebacks" ON public.chargebacks
  USING (((EXISTS ( SELECT 1
   FROM commissions
  WHERE ((commissions.id = chargebacks.commission_id) AND (commissions.user_id = (select auth.uid()))))) AND is_user_approved()));

ALTER POLICY "Users can view own chargebacks" ON public.chargebacks
  USING ((EXISTS ( SELECT 1
   FROM commissions
  WHERE ((commissions.id = chargebacks.commission_id) AND (commissions.user_id = (select auth.uid()))))));

ALTER POLICY "Approved users can create own clients" ON public.clients
  WITH CHECK ((((select auth.uid()) = user_id) AND is_user_approved()));

ALTER POLICY "Approved users can delete own clients" ON public.clients
  USING ((((select auth.uid()) = user_id) AND is_user_approved()));

ALTER POLICY "Approved users can update own clients" ON public.clients
  USING ((((select auth.uid()) = user_id) AND is_user_approved()));

ALTER POLICY "Users can CRUD own clients" ON public.clients
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can view clients on their own policies" ON public.clients
  USING ((EXISTS ( SELECT 1
   FROM policies
  WHERE ((policies.client_id = clients.id) AND (policies.user_id = (select auth.uid()))))));

ALTER POLICY clients_delete_own ON public.clients
  USING (((user_id = (select auth.uid())) AND has_permission((select auth.uid()), 'clients.delete.own'::text)));

ALTER POLICY clients_delete_policy ON public.clients
  USING (((user_id = (select auth.uid())) OR (is_imo_admin() AND (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = clients.user_id) AND (user_profiles.imo_id = get_my_imo_id()))))) OR is_super_admin()));

ALTER POLICY clients_insert_own ON public.clients
  WITH CHECK (((user_id = (select auth.uid())) AND has_permission((select auth.uid()), 'clients.create.own'::text)));

ALTER POLICY clients_insert_policy ON public.clients
  WITH CHECK (((user_id = (select auth.uid())) OR is_super_admin()));

ALTER POLICY clients_select_own_only ON public.clients
  USING ((user_id = (select auth.uid())));

ALTER POLICY clients_update_own ON public.clients
  USING (((user_id = (select auth.uid())) AND has_permission((select auth.uid()), 'clients.update.own'::text)));

ALTER POLICY clients_update_policy ON public.clients
  USING (((user_id = (select auth.uid())) OR (is_imo_admin() AND (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = clients.user_id) AND (user_profiles.imo_id = get_my_imo_id()))))) OR is_super_admin()))
  WITH CHECK (((user_id = (select auth.uid())) OR (is_imo_admin() AND (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = clients.user_id) AND (user_profiles.imo_id = get_my_imo_id()))))) OR is_super_admin()));

ALTER POLICY "Approved users can delete own commissions" ON public.commissions
  USING ((((select auth.uid()) = user_id) AND is_user_approved()));

ALTER POLICY "Authenticated users can create own commissions" ON public.commissions
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can delete own commissions" ON public.commissions
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can update own commissions" ON public.commissions
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view own commissions" ON public.commissions
  USING ((user_id = (select auth.uid())));

ALTER POLICY commissions_update_admin_simple ON public.commissions
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.email = 'nick@nickneessen.com'::text)))));

ALTER POLICY commissions_update_own_simple ON public.commissions
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can manage own communication prefs" ON public.communication_preferences
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Enable read access for all users" ON public.constants
  USING (((select auth.role()) = 'authenticated'::text));

ALTER POLICY "Users can delete own favorites" ON public.contact_favorites
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can insert own favorites" ON public.contact_favorites
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view own favorites" ON public.contact_favorites
  USING ((user_id = (select auth.uid())));

ALTER POLICY contract_documents_insert_policy ON public.contract_documents
  WITH CHECK (((agent_id = (select auth.uid())) OR (is_imo_admin() AND ((imo_id = get_my_imo_id()) OR ((imo_id IS NULL) AND (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = contract_documents.agent_id) AND (user_profiles.imo_id = get_my_imo_id()))))))) OR is_super_admin()));

ALTER POLICY contract_documents_select_policy ON public.contract_documents
  USING (((agent_id = (select auth.uid())) OR is_upline_of(agent_id) OR (is_imo_admin() AND (imo_id = get_my_imo_id())) OR is_super_admin()));

ALTER POLICY contract_documents_update_policy ON public.contract_documents
  USING (((agent_id = (select auth.uid())) OR (is_imo_admin() AND (imo_id = get_my_imo_id())) OR is_super_admin()))
  WITH CHECK (((agent_id = (select auth.uid())) OR (is_imo_admin() AND (imo_id = get_my_imo_id())) OR is_super_admin()));

ALTER POLICY "Users can create draft domains" ON public.custom_domains
  WITH CHECK (((user_id = (select auth.uid())) AND (imo_id = get_my_imo_id()) AND (status = 'draft'::custom_domain_status)));

ALTER POLICY "Users can delete non-active domains" ON public.custom_domains
  USING (((user_id = (select auth.uid())) AND (status = ANY (ARRAY['draft'::custom_domain_status, 'pending_dns'::custom_domain_status, 'verified'::custom_domain_status, 'error'::custom_domain_status]))));

ALTER POLICY "Users can view own domains" ON public.custom_domains
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Service role can manage daily_sales_logs" ON public.daily_sales_logs
  USING (((select auth.role()) = 'service_role'::text))
  WITH CHECK (((select auth.role()) = 'service_role'::text));

ALTER POLICY "Users can view their IMO daily_sales_logs" ON public.daily_sales_logs
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Staff can delete elevenlabs config" ON public.elevenlabs_config
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff can insert elevenlabs config" ON public.elevenlabs_config
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff can update elevenlabs config" ON public.elevenlabs_config
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))))
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff can view elevenlabs config" ON public.elevenlabs_config
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Users can delete own labels" ON public.email_labels
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert own labels" ON public.email_labels
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own labels" ON public.email_labels
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own labels" ON public.email_labels
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Admins can view all queued emails" ON public.email_queue
  USING (can_manage_workflows((select auth.uid())));

ALTER POLICY "System can manage email queue" ON public.email_queue
  USING (can_manage_workflows((select auth.uid())))
  WITH CHECK (can_manage_workflows((select auth.uid())));

ALTER POLICY "Users can view their queued emails" ON public.email_queue
  USING ((recipient_id = (select auth.uid())));

ALTER POLICY "Admins can manage all quotas" ON public.email_quota_tracking
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY "Admins can view all quotas" ON public.email_quota_tracking
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY "Users can insert own quota" ON public.email_quota_tracking
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own quota" ON public.email_quota_tracking
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own quota" ON public.email_quota_tracking
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can manage own scheduled emails" ON public.email_scheduled
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can delete own signatures" ON public.email_signatures
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert own signatures" ON public.email_signatures
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own signatures" ON public.email_signatures
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own signatures" ON public.email_signatures
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can delete own snippets" ON public.email_snippets
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert own snippets" ON public.email_snippets
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own snippets" ON public.email_snippets
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own snippets" ON public.email_snippets
  USING (((select auth.uid()) = user_id));

ALTER POLICY email_templates_delete ON public.email_templates
  USING (((select auth.uid()) = created_by));

ALTER POLICY email_templates_insert ON public.email_templates
  WITH CHECK (((select auth.uid()) = created_by));

ALTER POLICY email_templates_select ON public.email_templates
  USING (((is_global = true) OR (created_by = (select auth.uid()))));

ALTER POLICY email_templates_update ON public.email_templates
  USING (((select auth.uid()) = created_by));

ALTER POLICY imo_staff_view_email_templates ON public.email_templates
  USING ((is_imo_staff_role() AND ((created_by = (select auth.uid())) OR (is_global = true))));

ALTER POLICY "Users can delete own threads" ON public.email_threads
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert own threads" ON public.email_threads
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own threads" ON public.email_threads
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own threads" ON public.email_threads
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can view tracking for own emails" ON public.email_tracking_events
  USING ((EXISTS ( SELECT 1
   FROM user_emails
  WHERE ((user_emails.id = email_tracking_events.email_id) AND (user_emails.user_id = (select auth.uid()))))));

ALTER POLICY "Users can view links for own emails" ON public.email_tracking_links
  USING ((EXISTS ( SELECT 1
   FROM user_emails
  WHERE ((user_emails.id = email_tracking_links.email_id) AND (user_emails.user_id = (select auth.uid()))))));

ALTER POLICY "Admins can manage triggers" ON public.email_triggers
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY "Users can view own watch subscriptions" ON public.email_watch_subscriptions
  USING (((select auth.uid()) = user_id));

ALTER POLICY expense_templates_delete_own ON public.expense_templates
  USING (((select auth.uid()) = user_id));

ALTER POLICY expense_templates_insert_own ON public.expense_templates
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY expense_templates_select_own ON public.expense_templates
  USING (((select auth.uid()) = user_id));

ALTER POLICY expense_templates_update_own ON public.expense_templates
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Approved users can create own expenses" ON public.expenses
  WITH CHECK ((((select auth.uid()) = user_id) AND is_user_approved()));

ALTER POLICY "Approved users can delete own expenses" ON public.expenses
  USING ((((select auth.uid()) = user_id) AND is_user_approved()));

ALTER POLICY "Approved users can update own expenses" ON public.expenses
  USING ((((select auth.uid()) = user_id) AND is_user_approved()));

ALTER POLICY "Users can CRUD own expenses" ON public.expenses
  USING (((select auth.uid()) = user_id));

ALTER POLICY expenses_delete_own ON public.expenses
  USING (((user_id = (select auth.uid())) AND has_permission((select auth.uid()), 'expenses.delete.own'::text)));

ALTER POLICY expenses_insert_own ON public.expenses
  WITH CHECK (((user_id = (select auth.uid())) AND has_permission((select auth.uid()), 'expenses.create.own'::text)));

ALTER POLICY expenses_select_own_only ON public.expenses
  USING ((user_id = (select auth.uid())));

ALTER POLICY expenses_update_own ON public.expenses
  USING (((user_id = (select auth.uid())) AND has_permission((select auth.uid()), 'expenses.update.own'::text)));

ALTER POLICY gmail_integrations_delete ON public.gmail_integrations
  USING ((user_id = (select auth.uid())));

ALTER POLICY gmail_integrations_insert ON public.gmail_integrations
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY gmail_integrations_select ON public.gmail_integrations
  USING ((user_id = (select auth.uid())));

ALTER POLICY gmail_integrations_update ON public.gmail_integrations
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY gmail_sync_log_select ON public.gmail_sync_log
  USING ((EXISTS ( SELECT 1
   FROM gmail_integrations
  WHERE ((gmail_integrations.id = gmail_sync_log.integration_id) AND (gmail_integrations.user_id = (select auth.uid()))))));

ALTER POLICY "Admins can update any invitation" ON public.hierarchy_invitations
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY "Admins can view all invitations" ON public.hierarchy_invitations
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY "Authenticated users can send invitations" ON public.hierarchy_invitations
  WITH CHECK (((select auth.uid()) = inviter_id));

ALTER POLICY "Invitees can accept or deny invitations" ON public.hierarchy_invitations
  USING ((((select auth.uid()) = invitee_id) AND ((status)::text = 'pending'::text)))
  WITH CHECK ((((select auth.uid()) = invitee_id) AND ((status)::text = ANY ((ARRAY['accepted'::character varying, 'denied'::character varying])::text[]))));

ALTER POLICY "Inviters can cancel their pending invitations" ON public.hierarchy_invitations
  USING ((((select auth.uid()) = inviter_id) AND ((status)::text = 'pending'::text)))
  WITH CHECK ((((select auth.uid()) = inviter_id) AND ((status)::text = ANY ((ARRAY['cancelled'::character varying, 'pending'::character varying])::text[]))));

ALTER POLICY "Users can view invitations sent to them" ON public.hierarchy_invitations
  USING (((select auth.uid()) = invitee_id));

ALTER POLICY "Users can view invitations they sent" ON public.hierarchy_invitations
  USING (((select auth.uid()) = inviter_id));

ALTER POLICY "Super admins can manage all IMOs" ON public.imos
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY instagram_conversations_delete ON public.instagram_conversations
  USING ((EXISTS ( SELECT 1
   FROM instagram_integrations
  WHERE ((instagram_integrations.id = instagram_conversations.integration_id) AND (instagram_integrations.user_id = (select auth.uid()))))));

ALTER POLICY instagram_conversations_insert ON public.instagram_conversations
  WITH CHECK ((EXISTS ( SELECT 1
   FROM instagram_integrations
  WHERE ((instagram_integrations.id = instagram_conversations.integration_id) AND (instagram_integrations.user_id = (select auth.uid()))))));

ALTER POLICY instagram_conversations_select ON public.instagram_conversations
  USING ((EXISTS ( SELECT 1
   FROM instagram_integrations
  WHERE ((instagram_integrations.id = instagram_conversations.integration_id) AND (instagram_integrations.user_id = (select auth.uid()))))));

ALTER POLICY instagram_conversations_update ON public.instagram_conversations
  USING ((EXISTS ( SELECT 1
   FROM instagram_integrations
  WHERE ((instagram_integrations.id = instagram_conversations.integration_id) AND (instagram_integrations.user_id = (select auth.uid()))))));

ALTER POLICY instagram_integrations_delete ON public.instagram_integrations
  USING ((user_id = (select auth.uid())));

ALTER POLICY instagram_integrations_insert ON public.instagram_integrations
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY instagram_integrations_select ON public.instagram_integrations
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.imo_id = instagram_integrations.imo_id)))));

ALTER POLICY instagram_integrations_update ON public.instagram_integrations
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY instagram_templates_delete_personal ON public.instagram_message_templates
  USING ((user_id = (select auth.uid())));

ALTER POLICY instagram_templates_insert_personal ON public.instagram_message_templates
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY instagram_templates_select_personal ON public.instagram_message_templates
  USING (((user_id = (select auth.uid())) OR (user_id IS NULL)));

ALTER POLICY instagram_templates_update_personal ON public.instagram_message_templates
  USING ((user_id = (select auth.uid())));

ALTER POLICY instagram_messages_insert ON public.instagram_messages
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (instagram_conversations c
     JOIN instagram_integrations i ON ((i.id = c.integration_id)))
  WHERE ((c.id = instagram_messages.conversation_id) AND (i.user_id = (select auth.uid()))))));

ALTER POLICY instagram_messages_select ON public.instagram_messages
  USING ((EXISTS ( SELECT 1
   FROM (instagram_conversations c
     JOIN instagram_integrations i ON ((i.id = c.integration_id)))
  WHERE ((c.id = instagram_messages.conversation_id) AND (i.user_id = (select auth.uid()))))));

ALTER POLICY instagram_scheduled_delete ON public.instagram_scheduled_messages
  USING (((scheduled_by = (select auth.uid())) AND (status = 'pending'::scheduled_message_status)));

ALTER POLICY instagram_scheduled_insert ON public.instagram_scheduled_messages
  WITH CHECK (((scheduled_by = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM (instagram_conversations c
     JOIN instagram_integrations i ON ((i.id = c.integration_id)))
  WHERE ((c.id = instagram_scheduled_messages.conversation_id) AND (i.user_id = (select auth.uid())))))));

ALTER POLICY instagram_scheduled_select ON public.instagram_scheduled_messages
  USING ((EXISTS ( SELECT 1
   FROM (instagram_conversations c
     JOIN instagram_integrations i ON ((i.id = c.integration_id)))
  WHERE ((c.id = instagram_scheduled_messages.conversation_id) AND (i.user_id = (select auth.uid()))))));

ALTER POLICY instagram_scheduled_update ON public.instagram_scheduled_messages
  USING ((scheduled_by = (select auth.uid())));

ALTER POLICY template_categories_delete ON public.instagram_template_categories
  USING ((user_id = (select auth.uid())));

ALTER POLICY template_categories_insert ON public.instagram_template_categories
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY template_categories_select ON public.instagram_template_categories
  USING ((user_id = (select auth.uid())));

ALTER POLICY template_categories_update ON public.instagram_template_categories
  USING ((user_id = (select auth.uid())));

ALTER POLICY instagram_usage_select ON public.instagram_usage_tracking
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Approvers can reject pending requests" ON public.join_requests
  USING (((approver_id = (select auth.uid())) AND (status = 'pending'::text)));

ALTER POLICY "Approvers can view assigned requests" ON public.join_requests
  USING ((approver_id = (select auth.uid())));

ALTER POLICY "Requesters can cancel pending requests" ON public.join_requests
  USING (((requester_id = (select auth.uid())) AND (status = 'pending'::text)));

ALTER POLICY "Requesters can view own requests" ON public.join_requests
  USING ((requester_id = (select auth.uid())));

ALTER POLICY "Users can create own requests" ON public.join_requests
  WITH CHECK (((requester_id = (select auth.uid())) AND (status = 'pending'::text)));

ALTER POLICY landing_page_settings_super_admin_all ON public.landing_page_settings
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Users can create own lead purchases" ON public.lead_purchases
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can delete own lead purchases" ON public.lead_purchases
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can update own lead purchases" ON public.lead_purchases
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view own lead purchases" ON public.lead_purchases
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Creator or admin can update vendors" ON public.lead_vendors
  USING (((imo_id = get_my_imo_id()) AND ((created_by = (select auth.uid())) OR is_imo_admin())));

ALTER POLICY "Users can create threads" ON public.message_threads
  WITH CHECK (((select auth.uid()) = created_by));

ALTER POLICY "Users can update their threads" ON public.message_threads
  USING (((select auth.uid()) = created_by));

ALTER POLICY "Users can view their threads" ON public.message_threads
  USING (((select auth.uid()) = created_by));

ALTER POLICY "Users can send messages" ON public.messages
  WITH CHECK (((select auth.uid()) = sender_id));

ALTER POLICY "Users can update thread messages" ON public.messages
  USING (((select auth.uid()) = sender_id));

ALTER POLICY "Users can view thread messages" ON public.messages
  USING ((EXISTS ( SELECT 1
   FROM message_threads
  WHERE ((message_threads.id = messages.thread_id) AND (message_threads.created_by = (select auth.uid()))))));

ALTER POLICY digest_log_user_select ON public.notification_digest_log
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can manage own notification prefs" ON public.notification_preferences
  USING (((select auth.uid()) = user_id));

ALTER POLICY notification_prefs_user_insert ON public.notification_preferences
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY notification_prefs_user_update ON public.notification_preferences
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Authenticated users can insert own notifications" ON public.notifications
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can delete their own notifications" ON public.notifications
  USING ((((select auth.uid()))::text = (user_id)::text));

ALTER POLICY "Users can update their own notifications" ON public.notifications
  USING ((((select auth.uid()))::text = (user_id)::text))
  WITH CHECK ((((select auth.uid()))::text = (user_id)::text));

ALTER POLICY "Users can view their own notifications" ON public.notifications
  USING ((((select auth.uid()))::text = (user_id)::text));

ALTER POLICY "Recruiters can insert onboarding phases for their recruits" ON public.onboarding_phases
  WITH CHECK (((select auth.uid()) IN ( SELECT onboarding_phases.user_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT user_profiles_1.recruiter_id
           FROM user_profiles user_profiles_1
          WHERE (user_profiles_1.id = onboarding_phases.user_id))))));

ALTER POLICY "Recruiters can update their recruits' onboarding phases" ON public.onboarding_phases
  USING (((select auth.uid()) IN ( SELECT onboarding_phases.user_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT user_profiles_1.recruiter_id
           FROM user_profiles user_profiles_1
          WHERE (user_profiles_1.id = onboarding_phases.user_id))))));

ALTER POLICY "Recruiters can view their recruits' onboarding phases" ON public.onboarding_phases
  USING (((select auth.uid()) IN ( SELECT onboarding_phases.user_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT user_profiles_1.recruiter_id
           FROM user_profiles user_profiles_1
          WHERE (user_profiles_1.id = onboarding_phases.user_id))))));

ALTER POLICY "Users can view their own onboarding phases" ON public.onboarding_phases
  USING (((select auth.uid()) IN ( SELECT onboarding_phases.user_id
   FROM user_profiles
  WHERE (user_profiles.id = onboarding_phases.user_id))));

ALTER POLICY "Uplines can view downline override_commissions" ON public.override_commissions
  USING (((override_agent_id = (select auth.uid())) OR is_upline_of(base_agent_id)));

ALTER POLICY "Users can view overrides from own policies" ON public.override_commissions
  USING ((((select auth.uid()) = base_agent_id) AND is_user_approved()));

ALTER POLICY "Users can view own override commissions" ON public.override_commissions
  USING ((((select auth.uid()) = override_agent_id) AND is_user_approved()));

ALTER POLICY "Authenticated users can delete phase checklist items" ON public.phase_checklist_items
  USING (((select auth.role()) = 'authenticated'::text));

ALTER POLICY "Authenticated users can insert phase checklist items" ON public.phase_checklist_items
  WITH CHECK (((select auth.role()) = 'authenticated'::text));

ALTER POLICY "Authenticated users can update phase checklist items" ON public.phase_checklist_items
  USING (((select auth.role()) = 'authenticated'::text));

ALTER POLICY "Authenticated users can view phase checklist items" ON public.phase_checklist_items
  USING (((select auth.role()) = 'authenticated'::text));

ALTER POLICY phase_checklist_items_agency_owner_select ON public.phase_checklist_items
  USING ((is_agency_owner(NULL::uuid) AND (EXISTS ( SELECT 1
   FROM (pipeline_phases pp
     JOIN pipeline_templates pt ON ((pp.template_id = pt.id)))
  WHERE ((pp.id = phase_checklist_items.phase_id) AND ((pt.imo_id = get_my_imo_id()) OR (pt.imo_id IS NULL) OR (pt.created_by = (select auth.uid()))))))));

ALTER POLICY phase_checklist_items_recruit_select ON public.phase_checklist_items
  USING ((EXISTS ( SELECT 1
   FROM (user_profiles up
     JOIN pipeline_phases pp ON ((pp.id = phase_checklist_items.phase_id)))
  WHERE ((up.id = (select auth.uid())) AND ('recruit'::text = ANY (up.roles)) AND (up.pipeline_template_id IS NOT NULL) AND (up.pipeline_template_id = pp.template_id)))));

ALTER POLICY automation_logs_agency_owner_delete ON public.pipeline_automation_logs
  USING (((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ('agency_owner'::text = ANY (up.roles))))) AND (EXISTS ( SELECT 1
   FROM user_profiles recruit
  WHERE ((recruit.id = pipeline_automation_logs.recruit_id) AND (recruit.agency_id = get_my_agency_id()))))));

ALTER POLICY automation_logs_agency_owner_select ON public.pipeline_automation_logs
  USING (((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ('agency_owner'::text = ANY (up.roles))))) AND (EXISTS ( SELECT 1
   FROM user_profiles recruit
  WHERE ((recruit.id = pipeline_automation_logs.recruit_id) AND (recruit.agency_id = get_my_agency_id()))))));

ALTER POLICY automation_logs_agency_owner_update ON public.pipeline_automation_logs
  USING (((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ('agency_owner'::text = ANY (up.roles))))) AND (EXISTS ( SELECT 1
   FROM user_profiles recruit
  WHERE ((recruit.id = pipeline_automation_logs.recruit_id) AND (recruit.agency_id = get_my_agency_id()))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ('agency_owner'::text = ANY (up.roles))))) AND (EXISTS ( SELECT 1
   FROM user_profiles recruit
  WHERE ((recruit.id = pipeline_automation_logs.recruit_id) AND (recruit.agency_id = get_my_agency_id()))))));

ALTER POLICY pipeline_automations_agency_owner_select ON public.pipeline_automations
  USING (((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ('agency_owner'::text = ANY (up.roles))))) AND (((phase_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (pipeline_phases pp
     JOIN pipeline_templates pt ON ((pp.template_id = pt.id)))
  WHERE ((pp.id = pipeline_automations.phase_id) AND (pt.imo_id = get_my_imo_id()))))) OR ((checklist_item_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ((phase_checklist_items pci
     JOIN pipeline_phases pp ON ((pci.phase_id = pp.id)))
     JOIN pipeline_templates pt ON ((pp.template_id = pt.id)))
  WHERE ((pci.id = pipeline_automations.checklist_item_id) AND (pt.imo_id = get_my_imo_id()))))))));

ALTER POLICY pipeline_phases_agency_owner_delete ON public.pipeline_phases
  USING ((is_agency_owner(NULL::uuid) AND (EXISTS ( SELECT 1
   FROM pipeline_templates pt
  WHERE ((pt.id = pipeline_phases.template_id) AND (pt.created_by = (select auth.uid())))))));

ALTER POLICY pipeline_phases_agency_owner_insert ON public.pipeline_phases
  WITH CHECK ((is_agency_owner(NULL::uuid) AND (EXISTS ( SELECT 1
   FROM pipeline_templates pt
  WHERE ((pt.id = pipeline_phases.template_id) AND (pt.created_by = (select auth.uid())))))));

ALTER POLICY pipeline_phases_agency_owner_select ON public.pipeline_phases
  USING ((is_agency_owner(NULL::uuid) AND (EXISTS ( SELECT 1
   FROM pipeline_templates pt
  WHERE ((pt.id = pipeline_phases.template_id) AND ((pt.imo_id = get_my_imo_id()) OR (pt.imo_id IS NULL) OR (pt.created_by = (select auth.uid()))))))));

ALTER POLICY pipeline_phases_agency_owner_update ON public.pipeline_phases
  USING ((is_agency_owner(NULL::uuid) AND (EXISTS ( SELECT 1
   FROM pipeline_templates pt
  WHERE ((pt.id = pipeline_phases.template_id) AND (pt.created_by = (select auth.uid())))))))
  WITH CHECK ((is_agency_owner(NULL::uuid) AND (EXISTS ( SELECT 1
   FROM pipeline_templates pt
  WHERE ((pt.id = pipeline_phases.template_id) AND (pt.created_by = (select auth.uid())))))));

ALTER POLICY pipeline_phases_imo_staff_delete ON public.pipeline_phases
  USING ((is_imo_staff_role() AND (EXISTS ( SELECT 1
   FROM pipeline_templates pt
  WHERE ((pt.id = pipeline_phases.template_id) AND (pt.created_by = (select auth.uid())))))));

ALTER POLICY pipeline_phases_imo_staff_insert ON public.pipeline_phases
  WITH CHECK ((is_imo_staff_role() AND (EXISTS ( SELECT 1
   FROM pipeline_templates pt
  WHERE ((pt.id = pipeline_phases.template_id) AND (pt.created_by = (select auth.uid())))))));

ALTER POLICY pipeline_phases_imo_staff_update ON public.pipeline_phases
  USING ((is_imo_staff_role() AND (EXISTS ( SELECT 1
   FROM pipeline_templates pt
  WHERE ((pt.id = pipeline_phases.template_id) AND (pt.created_by = (select auth.uid())))))))
  WITH CHECK ((is_imo_staff_role() AND (EXISTS ( SELECT 1
   FROM pipeline_templates pt
  WHERE ((pt.id = pipeline_phases.template_id) AND (pt.created_by = (select auth.uid())))))));

ALTER POLICY pipeline_phases_recruit_select ON public.pipeline_phases
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ('recruit'::text = ANY (up.roles)) AND (up.pipeline_template_id IS NOT NULL) AND (up.pipeline_template_id = pipeline_phases.template_id)))));

ALTER POLICY pipeline_templates_agency_owner_delete ON public.pipeline_templates
  USING ((is_agency_owner(NULL::uuid) AND (created_by = (select auth.uid()))));

ALTER POLICY pipeline_templates_agency_owner_insert ON public.pipeline_templates
  WITH CHECK ((is_agency_owner(NULL::uuid) AND (created_by = (select auth.uid()))));

ALTER POLICY pipeline_templates_agency_owner_select ON public.pipeline_templates
  USING ((is_agency_owner(NULL::uuid) AND ((imo_id = get_my_imo_id()) OR (imo_id IS NULL) OR (created_by = (select auth.uid())))));

ALTER POLICY pipeline_templates_agency_owner_update ON public.pipeline_templates
  USING ((is_agency_owner(NULL::uuid) AND (created_by = (select auth.uid()))))
  WITH CHECK ((is_agency_owner(NULL::uuid) AND (created_by = (select auth.uid()))));

ALTER POLICY pipeline_templates_imo_staff_delete ON public.pipeline_templates
  USING ((is_imo_staff_role() AND (created_by = (select auth.uid()))));

ALTER POLICY pipeline_templates_imo_staff_insert ON public.pipeline_templates
  WITH CHECK ((is_imo_staff_role() AND ((imo_id = get_my_imo_id()) OR (imo_id IS NULL)) AND (created_by = (select auth.uid()))));

ALTER POLICY pipeline_templates_imo_staff_update ON public.pipeline_templates
  USING ((is_imo_staff_role() AND (created_by = (select auth.uid()))))
  WITH CHECK ((is_imo_staff_role() AND (created_by = (select auth.uid()))));

ALTER POLICY pipeline_templates_recruit_select ON public.pipeline_templates
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ('recruit'::text = ANY (up.roles)) AND (up.pipeline_template_id IS NOT NULL) AND (up.pipeline_template_id = pipeline_templates.id)))));

ALTER POLICY "Agents can delete their own policies" ON public.policies
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Agents can insert their own policies" ON public.policies
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Agents can update their own policies" ON public.policies
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Agents can view their own policies" ON public.policies
  USING ((user_id = (select auth.uid())));

ALTER POLICY policies_delete_own ON public.policies
  USING ((user_id = (select auth.uid())));

ALTER POLICY policies_insert_own ON public.policies
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY policies_update_own ON public.policies
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can delete premium matrix for their IMO" ON public.premium_matrix
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can insert premium matrix for their IMO" ON public.premium_matrix
  WITH CHECK ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can update premium matrix for their IMO" ON public.premium_matrix
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))))
  WITH CHECK ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can view premium matrix for their IMO" ON public.premium_matrix
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Staff can delete submissions" ON public.presentation_submissions
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff can update submissions for review" ON public.presentation_submissions
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))))
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Users can insert own submissions" ON public.presentation_submissions
  WITH CHECK (((user_id = (select auth.uid())) AND (imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND (agency_id = ( SELECT user_profiles.agency_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid()))))));

ALTER POLICY "Users can view presentation submissions" ON public.presentation_submissions
  USING (((user_id = (select auth.uid())) OR ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid())))));

ALTER POLICY "Admins can manage commission overrides" ON public.product_commission_overrides
  USING (((select auth.role()) = 'authenticated'::text))
  WITH CHECK (((select auth.role()) = 'authenticated'::text));

ALTER POLICY "Authenticated users can view commission overrides" ON public.product_commission_overrides
  USING (((select auth.role()) = 'authenticated'::text));

ALTER POLICY "Users can delete rates for their IMO" ON public.product_rate_table
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can insert rates for their IMO" ON public.product_rate_table
  WITH CHECK ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can update rates for their IMO" ON public.product_rate_table
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can view rates for their IMO" ON public.product_rate_table
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can insert outcomes for their IMO" ON public.recommendation_outcomes
  WITH CHECK ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can update outcomes for their IMO" ON public.recommendation_outcomes
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can view outcomes for their IMO" ON public.recommendation_outcomes
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Authenticated users can insert checklist progress" ON public.recruit_checklist_progress
  WITH CHECK (((user_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = recruit_checklist_progress.user_id) AND ((user_profiles.recruiter_id = (select auth.uid())) OR (user_profiles.upline_id = (select auth.uid()))))))));

ALTER POLICY "Staff can insert checklist_progress in own IMO" ON public.recruit_checklist_progress
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.roles && ARRAY['trainer'::text, 'contracting_manager'::text, 'staff'::text]) AND (user_profiles.imo_id = recruit_checklist_progress.imo_id)))));

ALTER POLICY "Uplines can delete their recruits' checklist progress" ON public.recruit_checklist_progress
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = recruit_checklist_progress.user_id) AND ((user_profiles.recruiter_id = (select auth.uid())) OR (user_profiles.upline_id = (select auth.uid())))))));

ALTER POLICY "Uplines can update their recruits' checklist progress" ON public.recruit_checklist_progress
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = recruit_checklist_progress.user_id) AND ((user_profiles.recruiter_id = (select auth.uid())) OR (user_profiles.upline_id = (select auth.uid())))))));

ALTER POLICY "Uplines can view their recruits' checklist progress" ON public.recruit_checklist_progress
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = recruit_checklist_progress.user_id) AND ((user_profiles.recruiter_id = (select auth.uid())) OR (user_profiles.upline_id = (select auth.uid())))))));

ALTER POLICY "Users can update their own checklist progress" ON public.recruit_checklist_progress
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can view their own checklist progress" ON public.recruit_checklist_progress
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Admins can manage all invitations" ON public.recruit_invitations
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY "Recruiters can create invitations" ON public.recruit_invitations
  WITH CHECK ((inviter_id = (select auth.uid())));

ALTER POLICY "Recruiters can delete own invitations" ON public.recruit_invitations
  USING ((inviter_id = (select auth.uid())));

ALTER POLICY "Recruiters can update own invitations" ON public.recruit_invitations
  USING ((inviter_id = (select auth.uid())))
  WITH CHECK ((inviter_id = (select auth.uid())));

ALTER POLICY "Recruiters can view own invitations" ON public.recruit_invitations
  USING ((inviter_id = (select auth.uid())));

ALTER POLICY "Uplines can view downline invitations" ON public.recruit_invitations
  USING (((inviter_id = (select auth.uid())) OR ((recruit_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = recruit_invitations.recruit_id) AND ((user_profiles.upline_id = (select auth.uid())) OR (user_profiles.recruiter_id = (select auth.uid())))))))));

ALTER POLICY "Authenticated users can insert phase progress" ON public.recruit_phase_progress
  WITH CHECK (((user_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = recruit_phase_progress.user_id) AND ((user_profiles.recruiter_id = (select auth.uid())) OR (user_profiles.upline_id = (select auth.uid()))))))));

ALTER POLICY "Staff can insert phase_progress in own IMO" ON public.recruit_phase_progress
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.roles && ARRAY['trainer'::text, 'contracting_manager'::text, 'staff'::text]) AND (user_profiles.imo_id = recruit_phase_progress.imo_id)))));

ALTER POLICY "Uplines can delete their recruits' phase progress" ON public.recruit_phase_progress
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = recruit_phase_progress.user_id) AND ((user_profiles.recruiter_id = (select auth.uid())) OR (user_profiles.upline_id = (select auth.uid())))))));

ALTER POLICY "Uplines can update their recruits' phase progress" ON public.recruit_phase_progress
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = recruit_phase_progress.user_id) AND ((user_profiles.recruiter_id = (select auth.uid())) OR (user_profiles.upline_id = (select auth.uid())))))));

ALTER POLICY "Uplines can view their recruits' phase progress" ON public.recruit_phase_progress
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = recruit_phase_progress.user_id) AND ((user_profiles.recruiter_id = (select auth.uid())) OR (user_profiles.upline_id = (select auth.uid())))))));

ALTER POLICY "Users can update their own phase progress" ON public.recruit_phase_progress
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view their own phase progress" ON public.recruit_phase_progress
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Recruiters can update own leads" ON public.recruiting_leads
  USING ((recruiter_id = (select auth.uid())))
  WITH CHECK ((recruiter_id = (select auth.uid())));

ALTER POLICY "Recruiters can view own leads" ON public.recruiting_leads
  USING ((recruiter_id = (select auth.uid())));

ALTER POLICY "Super admins can update all leads" ON public.recruiting_leads
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Super admins can view all leads" ON public.recruiting_leads
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Super admins can view all branding settings" ON public.recruiting_page_settings
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Users can delete own branding settings" ON public.recruiting_page_settings
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert own branding settings" ON public.recruiting_page_settings
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own branding settings" ON public.recruiting_page_settings
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own branding settings" ON public.recruiting_page_settings
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Agency owners can view agency delivery history" ON public.scheduled_report_deliveries
  USING ((EXISTS ( SELECT 1
   FROM (scheduled_reports sr
     JOIN agencies a ON ((a.id = sr.agency_id)))
  WHERE ((sr.id = scheduled_report_deliveries.schedule_id) AND (sr.agency_id IS NOT NULL) AND (a.owner_id = (select auth.uid()))))));

ALTER POLICY "IMO admins can view IMO delivery history" ON public.scheduled_report_deliveries
  USING ((EXISTS ( SELECT 1
   FROM (scheduled_reports sr
     JOIN user_profiles up ON ((up.id = (select auth.uid()))))
  WHERE ((sr.id = scheduled_report_deliveries.schedule_id) AND (sr.imo_id IS NOT NULL) AND ('imo_admin'::text = ANY (up.roles)) AND (up.imo_id = sr.imo_id)))));

ALTER POLICY "Super admins have full access to deliveries" ON public.scheduled_report_deliveries
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND ('super_admin'::text = ANY (user_profiles.roles))))));

ALTER POLICY "Users can view delivery history for own schedules" ON public.scheduled_report_deliveries
  USING ((EXISTS ( SELECT 1
   FROM scheduled_reports
  WHERE ((scheduled_reports.id = scheduled_report_deliveries.schedule_id) AND (scheduled_reports.owner_id = (select auth.uid()))))));

ALTER POLICY "Agency owners can view agency schedules" ON public.scheduled_reports
  USING (((agency_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM agencies
  WHERE ((agencies.id = scheduled_reports.agency_id) AND (agencies.owner_id = (select auth.uid())))))));

ALTER POLICY "IMO admins can view IMO schedules" ON public.scheduled_reports
  USING (((imo_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND ('imo_admin'::text = ANY (user_profiles.roles)) AND (user_profiles.imo_id = scheduled_reports.imo_id))))));

ALTER POLICY "Super admins have full access to scheduled_reports" ON public.scheduled_reports
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND ('super_admin'::text = ANY (user_profiles.roles))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND ('super_admin'::text = ANY (user_profiles.roles))))));

ALTER POLICY "Users can manage own schedules" ON public.scheduled_reports
  USING ((owner_id = (select auth.uid())))
  WITH CHECK ((owner_id = (select auth.uid())));

ALTER POLICY scheduling_integrations_delete_own ON public.scheduling_integrations
  USING ((user_id = (select auth.uid())));

ALTER POLICY scheduling_integrations_insert_own ON public.scheduling_integrations
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY scheduling_integrations_select_for_recruit ON public.scheduling_integrations
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND (up.recruiter_id = scheduling_integrations.user_id)))));

ALTER POLICY scheduling_integrations_select_imo_admin ON public.scheduling_integrations
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND (up.imo_id = scheduling_integrations.imo_id) AND (up.is_admin = true)))));

ALTER POLICY scheduling_integrations_select_own ON public.scheduling_integrations
  USING ((user_id = (select auth.uid())));

ALTER POLICY scheduling_integrations_select_upline ON public.scheduling_integrations
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = scheduling_integrations.user_id) AND (up.upline_id = (select auth.uid()))))));

ALTER POLICY scheduling_integrations_update_own ON public.scheduling_integrations
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Approved users can create own settings" ON public.settings
  WITH CHECK ((((select auth.uid()) = user_id) AND is_user_approved()));

ALTER POLICY "Approved users can delete own settings" ON public.settings
  USING ((((select auth.uid()) = user_id) AND is_user_approved()));

ALTER POLICY "Approved users can update own settings" ON public.settings
  USING ((((select auth.uid()) = user_id) AND is_user_approved()));

ALTER POLICY "Approved users can view own settings" ON public.settings
  USING ((((select auth.uid()) = user_id) AND is_user_approved()));

ALTER POLICY "Users can CRUD own settings" ON public.settings
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Recruiters can insert signature_submissions for their recruits" ON public.signature_submissions
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = signature_submissions.target_user_id) AND (user_profiles.recruiter_id = (select auth.uid()))))));

ALTER POLICY "Recruiters can update signature_submissions for their recruits" ON public.signature_submissions
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = signature_submissions.target_user_id) AND (user_profiles.recruiter_id = (select auth.uid()))))));

ALTER POLICY "Recruiters can view signature_submissions for their recruits" ON public.signature_submissions
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = signature_submissions.target_user_id) AND (user_profiles.recruiter_id = (select auth.uid()))))));

ALTER POLICY "Users can view their own signature_submissions" ON public.signature_submissions
  USING (((target_user_id = (select auth.uid())) OR (initiated_by = (select auth.uid()))));

ALTER POLICY "Recruiters can insert signature_submitters for their recruits" ON public.signature_submitters
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (signature_submissions
     JOIN user_profiles ON ((user_profiles.id = signature_submissions.target_user_id)))
  WHERE ((signature_submissions.id = signature_submitters.submission_id) AND (user_profiles.recruiter_id = (select auth.uid()))))));

ALTER POLICY "Recruiters can update signature_submitters for their recruits" ON public.signature_submitters
  USING ((EXISTS ( SELECT 1
   FROM (signature_submissions
     JOIN user_profiles ON ((user_profiles.id = signature_submissions.target_user_id)))
  WHERE ((signature_submissions.id = signature_submitters.submission_id) AND (user_profiles.recruiter_id = (select auth.uid()))))));

ALTER POLICY "Recruiters can view signature_submitters for their recruits" ON public.signature_submitters
  USING ((EXISTS ( SELECT 1
   FROM (signature_submissions
     JOIN user_profiles ON ((user_profiles.id = signature_submissions.target_user_id)))
  WHERE ((signature_submissions.id = signature_submitters.submission_id) AND (user_profiles.recruiter_id = (select auth.uid()))))));

ALTER POLICY "Users can update their own signature_submitters" ON public.signature_submitters
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can view their own signature_submitters" ON public.signature_submitters
  USING ((user_id = (select auth.uid())));

ALTER POLICY slack_channel_configs_select ON public.slack_channel_configs
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.imo_id = slack_channel_configs.imo_id)))));

ALTER POLICY slack_integrations_select ON public.slack_integrations
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.imo_id = slack_integrations.imo_id)))));

ALTER POLICY slack_messages_select ON public.slack_messages
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.imo_id = slack_messages.imo_id)))));

ALTER POLICY "Users can delete webhooks for their IMO" ON public.slack_webhooks
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can insert webhooks for their IMO" ON public.slack_webhooks
  WITH CHECK ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can update webhooks for their IMO" ON public.slack_webhooks
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can view webhooks for their IMO" ON public.slack_webhooks
  USING ((imo_id IN ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY state_classifications_delete_policy ON public.state_classifications
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ((up.is_super_admin = true) OR (up.is_admin = true))))));

ALTER POLICY state_classifications_insert_policy ON public.state_classifications
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ((up.is_super_admin = true) OR (up.is_admin = true))))));

ALTER POLICY state_classifications_select_policy ON public.state_classifications
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ((up.is_super_admin = true) OR (up.is_admin = true) OR (up.agency_id = state_classifications.agency_id))))));

ALTER POLICY state_classifications_update_policy ON public.state_classifications
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND ((up.is_super_admin = true) OR (up.is_admin = true))))));

ALTER POLICY "Super admins can manage addons" ON public.subscription_addons
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY subscription_events_admin_all ON public.subscription_events
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY subscription_events_select_own ON public.subscription_events
  USING ((user_id = (select auth.uid())));

ALTER POLICY subscription_payments_admin_all ON public.subscription_payments
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY subscription_payments_select_own ON public.subscription_payments
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Super admins can create plan changes" ON public.subscription_plan_changes
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Super admins can view plan changes" ON public.subscription_plan_changes
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Super admins can update plans" ON public.subscription_plans
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY subscription_plans_admin_all ON public.subscription_plans
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY subscription_plans_select ON public.subscription_plans
  USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true))))));

ALTER POLICY subscription_settings_write_super_admin ON public.subscription_settings
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Super admins can manage system settings" ON public.system_settings
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Managers can delete assignments" ON public.training_assignments
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can insert assignments" ON public.training_assignments
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can update assignments" ON public.training_assignments
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))))
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff manage training_assignments" ON public.training_assignments
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())))
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can view their own assignments" ON public.training_assignments
  USING (((assigned_to = (select auth.uid())) OR ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid())))));

ALTER POLICY "Users view own training_assignments" ON public.training_assignments
  USING (((imo_id = get_my_imo_id()) AND ((assigned_to = (select auth.uid())) OR (assigned_to IS NULL))));

ALTER POLICY "Managers can delete badges" ON public.training_badges
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can manage badges" ON public.training_badges
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can update badges" ON public.training_badges
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))))
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff manage training_badges" ON public.training_badges
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())))
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can view badges in their IMO" ON public.training_badges
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Managers can delete certifications" ON public.training_certifications
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can insert certifications" ON public.training_certifications
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can update certifications" ON public.training_certifications
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))))
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff manage training_certifications" ON public.training_certifications
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())))
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can view certifications in their IMO" ON public.training_certifications
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Staff view all participants in IMO" ON public.training_challenge_participants
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can join challenges" ON public.training_challenge_participants
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can update own participation" ON public.training_challenge_participants
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view own challenge participation" ON public.training_challenge_participants
  USING (((user_id = (select auth.uid())) OR ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid())))));

ALTER POLICY "Users join challenges" ON public.training_challenge_participants
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users view own challenge participation" ON public.training_challenge_participants
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Managers can delete challenges" ON public.training_challenges
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can insert challenges" ON public.training_challenges
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can update challenges" ON public.training_challenges
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))))
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff manage training_challenges" ON public.training_challenges
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())))
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can view challenges in their IMO" ON public.training_challenges
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Staff can delete training documents" ON public.training_documents
  USING (is_training_hub_staff((select auth.uid())));

ALTER POLICY "Staff can update training documents" ON public.training_documents
  USING (is_training_hub_staff((select auth.uid())))
  WITH CHECK (is_training_hub_staff((select auth.uid())));

ALTER POLICY "Staff can upload training documents" ON public.training_documents
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (uploaded_by = (select auth.uid()))));

ALTER POLICY "Staff can view training documents" ON public.training_documents
  USING (is_training_hub_staff((select auth.uid())));

ALTER POLICY "Managers can delete content" ON public.training_lesson_content
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can insert content" ON public.training_lesson_content
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can update content" ON public.training_lesson_content
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))))
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff full access to training_lesson_content" ON public.training_lesson_content
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())))
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can view content in their IMO" ON public.training_lesson_content
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Managers can delete lessons" ON public.training_lessons
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can insert lessons" ON public.training_lessons
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can update lessons" ON public.training_lessons
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))))
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff full access to training_lessons" ON public.training_lessons
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())))
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can view lessons in their IMO" ON public.training_lessons
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Managers can delete modules" ON public.training_modules
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can insert modules" ON public.training_modules
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can update modules" ON public.training_modules
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))))
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff full access to training_modules" ON public.training_modules
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())))
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can view published modules in their IMO" ON public.training_modules
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND ((is_published = true) OR (created_by = (select auth.uid())) OR is_training_hub_staff((select auth.uid())))));

ALTER POLICY "Staff view all training_progress in IMO" ON public.training_progress
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can insert own progress" ON public.training_progress
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can update own progress" ON public.training_progress
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view own progress" ON public.training_progress
  USING (((user_id = (select auth.uid())) OR ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid())))));

ALTER POLICY "Users manage own training_progress" ON public.training_progress
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Staff view all quiz_attempts in IMO" ON public.training_quiz_attempts
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can insert own attempts" ON public.training_quiz_attempts
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view own attempts" ON public.training_quiz_attempts
  USING (((user_id = (select auth.uid())) OR ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid())))));

ALTER POLICY "Users insert own quiz_attempts" ON public.training_quiz_attempts
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users view own quiz_attempts" ON public.training_quiz_attempts
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Managers can delete options" ON public.training_quiz_options
  USING ((is_training_hub_staff((select auth.uid())) AND (EXISTS ( SELECT 1
   FROM training_quiz_questions q
  WHERE ((q.id = training_quiz_options.question_id) AND (q.imo_id = ( SELECT user_profiles.imo_id
           FROM user_profiles
          WHERE (user_profiles.id = (select auth.uid())))))))));

ALTER POLICY "Managers can insert options" ON public.training_quiz_options
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (EXISTS ( SELECT 1
   FROM training_quiz_questions q
  WHERE ((q.id = training_quiz_options.question_id) AND (q.imo_id = ( SELECT user_profiles.imo_id
           FROM user_profiles
          WHERE (user_profiles.id = (select auth.uid())))))))));

ALTER POLICY "Managers can update options" ON public.training_quiz_options
  USING ((is_training_hub_staff((select auth.uid())) AND (EXISTS ( SELECT 1
   FROM training_quiz_questions q
  WHERE ((q.id = training_quiz_options.question_id) AND (q.imo_id = ( SELECT user_profiles.imo_id
           FROM user_profiles
          WHERE (user_profiles.id = (select auth.uid())))))))))
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (EXISTS ( SELECT 1
   FROM training_quiz_questions q
  WHERE ((q.id = training_quiz_options.question_id) AND (q.imo_id = ( SELECT user_profiles.imo_id
           FROM user_profiles
          WHERE (user_profiles.id = (select auth.uid())))))))));

ALTER POLICY "Staff full access to training_quiz_options" ON public.training_quiz_options
  USING ((is_training_hub_staff((select auth.uid())) AND (EXISTS ( SELECT 1
   FROM training_quiz_questions qq
  WHERE ((qq.id = training_quiz_options.question_id) AND (qq.imo_id = get_my_imo_id()))))))
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (EXISTS ( SELECT 1
   FROM training_quiz_questions qq
  WHERE ((qq.id = training_quiz_options.question_id) AND (qq.imo_id = get_my_imo_id()))))));

ALTER POLICY "Users can view options via question" ON public.training_quiz_options
  USING ((EXISTS ( SELECT 1
   FROM training_quiz_questions q
  WHERE ((q.id = training_quiz_options.question_id) AND (q.imo_id = ( SELECT user_profiles.imo_id
           FROM user_profiles
          WHERE (user_profiles.id = (select auth.uid()))))))));

ALTER POLICY "Managers can delete questions" ON public.training_quiz_questions
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can insert questions" ON public.training_quiz_questions
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can update questions" ON public.training_quiz_questions
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))))
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff full access to training_quiz_questions" ON public.training_quiz_questions
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())))
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can view questions in their IMO" ON public.training_quiz_questions
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Managers can delete quizzes" ON public.training_quizzes
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can insert quizzes" ON public.training_quizzes
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Managers can update quizzes" ON public.training_quizzes
  USING (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))))
  WITH CHECK (((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff full access to training_quizzes" ON public.training_quizzes
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())))
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can view quizzes in their IMO" ON public.training_quizzes
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Staff view all badges in IMO" ON public.training_user_badges
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "System can insert user badges" ON public.training_user_badges
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "System insert user_badges" ON public.training_user_badges
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view own badges" ON public.training_user_badges
  USING (((user_id = (select auth.uid())) OR ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid())))));

ALTER POLICY "Users view own badges" ON public.training_user_badges
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Staff manage user_certifications" ON public.training_user_certifications
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())))
  WITH CHECK ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Staff view all certifications in IMO" ON public.training_user_certifications
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "System can insert user certifications" ON public.training_user_certifications
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view own certifications" ON public.training_user_certifications
  USING (((user_id = (select auth.uid())) OR ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid())))));

ALTER POLICY "Users view own certifications" ON public.training_user_certifications
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Staff view all stats in IMO" ON public.training_user_stats
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "Users can insert own stats" ON public.training_user_stats
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can update own stats" ON public.training_user_stats
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view own stats" ON public.training_user_stats
  USING (((user_id = (select auth.uid())) OR ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid())))));

ALTER POLICY "Users manage own stats" ON public.training_user_stats
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users view own stats" ON public.training_user_stats
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Staff view all xp_entries in IMO" ON public.training_xp_entries
  USING ((is_training_hub_staff((select auth.uid())) AND (imo_id = get_my_imo_id())));

ALTER POLICY "System can insert xp entries" ON public.training_xp_entries
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "System insert xp_entries" ON public.training_xp_entries
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view own xp entries" ON public.training_xp_entries
  USING (((user_id = (select auth.uid())) OR ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))) AND is_training_hub_staff((select auth.uid())))));

ALTER POLICY "Users view own xp_entries" ON public.training_xp_entries
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Admins can manage event types" ON public.trigger_event_types
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY "Only admins can manage trigger event types" ON public.trigger_event_types
  USING (can_manage_workflows((select auth.uid())))
  WITH CHECK (can_manage_workflows((select auth.uid())));

ALTER POLICY health_conditions_delete ON public.underwriting_health_conditions
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY health_conditions_insert ON public.underwriting_health_conditions
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY health_conditions_update ON public.underwriting_health_conditions
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Users can delete recommendations for their sessions" ON public.underwriting_session_recommendations
  USING (((imo_id = get_my_imo_id()) AND (EXISTS ( SELECT 1
   FROM underwriting_sessions s
  WHERE ((s.id = underwriting_session_recommendations.session_id) AND (s.created_by = (select auth.uid())))))));

ALTER POLICY "Users can view recommendations for their accessible sessions" ON public.underwriting_session_recommendations
  USING (((imo_id = get_my_imo_id()) AND (EXISTS ( SELECT 1
   FROM underwriting_sessions s
  WHERE ((s.id = underwriting_session_recommendations.session_id) AND ((s.created_by = (select auth.uid())) OR is_upline_of(s.created_by) OR is_imo_admin()))))));

ALTER POLICY "Users can delete sessions from their IMO" ON public.underwriting_sessions
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can insert sessions for their IMO" ON public.underwriting_sessions
  WITH CHECK ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can update sessions from their IMO" ON public.underwriting_sessions
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))))
  WITH CHECK ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY "Users can view sessions from their IMO" ON public.underwriting_sessions
  USING ((imo_id = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid())))));

ALTER POLICY sessions_delete ON public.underwriting_sessions
  USING (((imo_id = get_my_imo_id()) AND ((created_by = (select auth.uid())) OR is_imo_admin())));

ALTER POLICY sessions_insert ON public.underwriting_sessions
  WITH CHECK (((imo_id = get_my_imo_id()) AND (created_by = (select auth.uid()))));

ALTER POLICY sessions_select ON public.underwriting_sessions
  USING (((imo_id = get_my_imo_id()) AND ((created_by = (select auth.uid())) OR is_imo_admin() OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = underwriting_sessions.created_by) AND (up.hierarchy_path ~~ ( SELECT (COALESCE(user_profiles.hierarchy_path, (user_profiles.id)::text) || '%'::text)
           FROM user_profiles
          WHERE (user_profiles.id = (select auth.uid()))))))))));

ALTER POLICY sessions_update ON public.underwriting_sessions
  USING (((imo_id = get_my_imo_id()) AND ((created_by = (select auth.uid())) OR is_imo_admin())));

ALTER POLICY usage_tracking_admin_all ON public.usage_tracking
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY usage_tracking_insert_own ON public.usage_tracking
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY usage_tracking_select_own ON public.usage_tracking
  USING ((user_id = (select auth.uid())));

ALTER POLICY usage_tracking_update_own ON public.usage_tracking
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Authenticated users can insert activity log entries" ON public.user_activity_log
  WITH CHECK (((select auth.uid()) IN ( SELECT user_activity_log.user_id
   FROM user_profiles
  WHERE (user_profiles.id = user_activity_log.performed_by))));

ALTER POLICY "Recruiters can view their recruits' activity log" ON public.user_activity_log
  USING (((select auth.uid()) IN ( SELECT user_activity_log.user_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT user_profiles_1.recruiter_id
           FROM user_profiles user_profiles_1
          WHERE (user_profiles_1.id = user_activity_log.user_id))))));

ALTER POLICY "Users can view their own activity log" ON public.user_activity_log
  USING (((select auth.uid()) IN ( SELECT user_activity_log.user_id
   FROM user_profiles
  WHERE (user_profiles.id = user_activity_log.user_id))));

ALTER POLICY "Recruiters can delete their recruits' documents" ON public.user_documents
  USING (((select auth.uid()) IN ( SELECT user_documents.user_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT user_profiles_1.recruiter_id
           FROM user_profiles user_profiles_1
          WHERE (user_profiles_1.id = user_documents.user_id))))));

ALTER POLICY "Recruiters can insert documents for their recruits" ON public.user_documents
  WITH CHECK (((select auth.uid()) = ( SELECT user_profiles.recruiter_id
   FROM user_profiles
  WHERE (user_profiles.id = user_documents.user_id))));

ALTER POLICY "Recruiters can update their recruits' documents" ON public.user_documents
  USING (((select auth.uid()) IN ( SELECT user_documents.user_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT user_profiles_1.recruiter_id
           FROM user_profiles user_profiles_1
          WHERE (user_profiles_1.id = user_documents.user_id))))));

ALTER POLICY "Recruiters can view their recruits' documents" ON public.user_documents
  USING (((select auth.uid()) IN ( SELECT user_documents.user_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT user_profiles_1.recruiter_id
           FROM user_profiles user_profiles_1
          WHERE (user_profiles_1.id = user_documents.user_id))))));

ALTER POLICY "Users can delete their own documents" ON public.user_documents
  USING (((select auth.uid()) = ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.id = user_documents.user_id))));

ALTER POLICY "Users can insert their own documents" ON public.user_documents
  WITH CHECK (((select auth.uid()) = ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.id = user_documents.user_id))));

ALTER POLICY "Users can update their own documents" ON public.user_documents
  USING (((select auth.uid()) = ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.id = user_documents.user_id))))
  WITH CHECK (((select auth.uid()) = ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.id = user_documents.user_id))));

ALTER POLICY "Users can view their own documents" ON public.user_documents
  USING (((select auth.uid()) IN ( SELECT user_documents.user_id
   FROM user_profiles
  WHERE (user_profiles.id = user_documents.user_id))));

ALTER POLICY "Users can insert attachments for emails they created" ON public.user_email_attachments
  WITH CHECK ((email_id IN ( SELECT user_emails.id
   FROM user_emails
  WHERE ((select auth.uid()) IN ( SELECT user_emails.user_id
           FROM user_profiles
          WHERE (user_profiles.id = user_emails.sender_id))))));

ALTER POLICY "Users can view attachments for emails they can view" ON public.user_email_attachments
  USING ((email_id IN ( SELECT user_emails.id
   FROM user_emails
  WHERE (((select auth.uid()) IN ( SELECT user_emails.user_id
           FROM user_profiles
          WHERE (user_profiles.id = user_emails.user_id))) OR ((select auth.uid()) IN ( SELECT user_emails.user_id
           FROM user_profiles
          WHERE (user_profiles.id = user_emails.sender_id))) OR ((select auth.uid()) IN ( SELECT user_emails.user_id
           FROM user_profiles
          WHERE (user_profiles.id = ( SELECT user_profiles_1.recruiter_id
                   FROM user_profiles user_profiles_1
                  WHERE (user_profiles_1.id = user_emails.user_id)))))))));

ALTER POLICY "Users can delete own OAuth tokens" ON public.user_email_oauth_tokens
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert own OAuth tokens" ON public.user_email_oauth_tokens
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own OAuth tokens" ON public.user_email_oauth_tokens
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own OAuth tokens" ON public.user_email_oauth_tokens
  USING (((select auth.uid()) = user_id));

ALTER POLICY user_emails_delete_admin ON public.user_emails
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND (up.is_admin = true)))));

ALTER POLICY user_emails_delete_own ON public.user_emails
  USING (((user_id = (select auth.uid())) OR (sender_id = (select auth.uid()))));

ALTER POLICY user_emails_insert_admin ON public.user_emails
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND (up.is_admin = true)))));

ALTER POLICY user_emails_insert_own ON public.user_emails
  WITH CHECK (((sender_id)::text = ((select auth.uid()))::text));

ALTER POLICY user_emails_select_admin ON public.user_emails
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND (up.is_admin = true)))));

ALTER POLICY user_emails_select_own ON public.user_emails
  USING ((user_id = (select auth.uid())));

ALTER POLICY user_emails_select_recruiter ON public.user_emails
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = user_emails.user_id) AND (up.recruiter_id = (select auth.uid()))))));

ALTER POLICY user_emails_select_sent ON public.user_emails
  USING ((sender_id = (select auth.uid())));

ALTER POLICY user_emails_update_admin ON public.user_emails
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND (up.is_admin = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = (select auth.uid())) AND (up.is_admin = true)))));

ALTER POLICY user_emails_update_recipient ON public.user_emails
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY user_emails_update_sender ON public.user_emails
  USING ((sender_id = (select auth.uid())))
  WITH CHECK ((sender_id = (select auth.uid())));

ALTER POLICY "Users can create own expense categories" ON public.user_expense_categories
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can delete own expense categories" ON public.user_expense_categories
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can insert own expense categories" ON public.user_expense_categories
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can read own expense categories" ON public.user_expense_categories
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own expense categories" ON public.user_expense_categories
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view own expense categories" ON public.user_expense_categories
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can delete own mailbox settings" ON public.user_mailbox_settings
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert own mailbox settings" ON public.user_mailbox_settings
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own mailbox settings" ON public.user_mailbox_settings
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own mailbox settings" ON public.user_mailbox_settings
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Recruiters can delete own recruits" ON public.user_profiles
  USING ((((select auth.uid()) = recruiter_id) AND ('recruit'::text = ANY (roles))));

ALTER POLICY "Recruiters can update own recruits" ON public.user_profiles
  USING ((((select auth.uid()) = recruiter_id) AND ('recruit'::text = ANY (roles))))
  WITH CHECK ((((select auth.uid()) = recruiter_id) AND ('recruit'::text = ANY (roles))));

ALTER POLICY "Recruiters can view their recruits" ON public.user_profiles
  USING ((recruiter_id = (select auth.uid())));

ALTER POLICY "Uplines can delete own recruits" ON public.user_profiles
  USING ((((select auth.uid()) = upline_id) AND ('recruit'::text = ANY (roles))));

ALTER POLICY "Uplines can update own recruits" ON public.user_profiles
  USING ((((select auth.uid()) = upline_id) AND ('recruit'::text = ANY (roles))))
  WITH CHECK ((((select auth.uid()) = upline_id) AND ('recruit'::text = ANY (roles))));

ALTER POLICY "Users can view downline profiles" ON public.user_profiles
  USING (((id IN ( SELECT get_downline_ids.downline_id
   FROM get_downline_ids((select auth.uid())) get_downline_ids(downline_id))) AND is_user_approved()));

ALTER POLICY allow_trigger_insert ON public.user_profiles
  WITH CHECK ((((select auth.uid()) IS NULL) OR ((select auth.uid()) = id)));

ALTER POLICY contracting_managers_view_imo_recruits ON public.user_profiles
  USING ((has_role((select auth.uid()), 'contracting_manager'::text) AND (imo_id = get_my_imo_id()) AND (imo_id IS NOT NULL) AND ('recruit'::text = ANY (roles))));

ALTER POLICY delete_user_policy ON public.user_profiles
  USING ((((select auth.uid()) IN ( SELECT user_profiles_1.id
   FROM user_profiles user_profiles_1
  WHERE (user_profiles_1.is_admin = true))) OR ((select auth.uid()) = id)));

ALTER POLICY trainers_view_imo_recruits ON public.user_profiles
  USING ((has_role((select auth.uid()), 'trainer'::text) AND (imo_id = get_my_imo_id()) AND (imo_id IS NOT NULL) AND ('recruit'::text = ANY (roles))));

ALTER POLICY user_profiles_select_admin ON public.user_profiles
  USING (is_admin_user((select auth.uid())));

ALTER POLICY user_profiles_select_hierarchy ON public.user_profiles
  USING (((recruiter_id = (select auth.uid())) OR (id IN ( SELECT get_downline_ids.downline_id
   FROM get_downline_ids((select auth.uid())) get_downline_ids(downline_id))) OR (upline_id = (select auth.uid()))));

ALTER POLICY user_profiles_select_own ON public.user_profiles
  USING (((select auth.uid()) = id));

ALTER POLICY user_profiles_select_own_recruiter ON public.user_profiles
  USING ((id = ( SELECT get_user_upline_and_recruiter_ids.recruiter_id
   FROM get_user_upline_and_recruiter_ids((select auth.uid())) get_user_upline_and_recruiter_ids(upline_id, recruiter_id))));

ALTER POLICY user_profiles_select_own_upline ON public.user_profiles
  USING ((id = ( SELECT get_user_upline_and_recruiter_ids.upline_id
   FROM get_user_upline_and_recruiter_ids((select auth.uid())) get_user_upline_and_recruiter_ids(upline_id, recruiter_id))));

ALTER POLICY user_profiles_select_recruiter ON public.user_profiles
  USING ((has_role((select auth.uid()), 'recruiter'::text) AND (onboarding_status = ANY (ARRAY['lead'::text, 'active'::text]))));

ALTER POLICY user_profiles_select_view_only ON public.user_profiles
  USING (has_role((select auth.uid()), 'view_only'::text));

ALTER POLICY user_profiles_update_admin ON public.user_profiles
  USING (is_admin_user((select auth.uid())));

ALTER POLICY user_profiles_update_contracting ON public.user_profiles
  USING (has_role((select auth.uid()), 'contracting_manager'::text));

ALTER POLICY user_profiles_update_own ON public.user_profiles
  USING (((select auth.uid()) = id));

ALTER POLICY "Users can delete own slack preferences" ON public.user_slack_preferences
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert own slack preferences" ON public.user_slack_preferences
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own slack preferences" ON public.user_slack_preferences
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own slack preferences" ON public.user_slack_preferences
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Service role can manage user addons" ON public.user_subscription_addons
  USING (((select auth.role()) = 'service_role'::text));

ALTER POLICY "Super admins can manage user addons" ON public.user_subscription_addons
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Super admins can view all user addons" ON public.user_subscription_addons
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Users can view own addons" ON public.user_subscription_addons
  USING ((user_id = (select auth.uid())));

ALTER POLICY user_subscriptions_admin_all ON public.user_subscriptions
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY user_subscriptions_insert_admin ON public.user_subscriptions
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY user_subscriptions_select_own ON public.user_subscriptions
  USING ((user_id = (select auth.uid())));

ALTER POLICY user_subscriptions_update_own ON public.user_subscriptions
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can delete own targets" ON public.user_targets
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can insert own targets" ON public.user_targets
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can update own targets" ON public.user_targets
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view own targets" ON public.user_targets
  USING ((user_id = (select auth.uid())));

ALTER POLICY user_targets_admin_all ON public.user_targets
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.email = 'nick@nickneessen.com'::text)))));

ALTER POLICY user_targets_delete_own ON public.user_targets
  USING ((user_id = (select auth.uid())));

ALTER POLICY user_targets_insert_own ON public.user_targets
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY user_targets_select_own ON public.user_targets
  USING ((user_id = (select auth.uid())));

ALTER POLICY user_targets_update_own ON public.user_targets
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Service role can manage usage" ON public.uw_wizard_usage
  USING (((select auth.role()) = 'service_role'::text));

ALTER POLICY "Super admins can view all usage" ON public.uw_wizard_usage
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Users can view own usage" ON public.uw_wizard_usage
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Service role can insert usage logs" ON public.uw_wizard_usage_log
  WITH CHECK (((select auth.role()) = 'service_role'::text));

ALTER POLICY "Super admins can view all usage logs" ON public.uw_wizard_usage_log
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true)))));

ALTER POLICY "Users can view own usage logs" ON public.uw_wizard_usage_log
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Admins/trainers can manage all workflow actions" ON public.workflow_actions
  USING (can_manage_workflows((select auth.uid())));

ALTER POLICY "Admins/trainers can view all workflow actions" ON public.workflow_actions
  USING (can_manage_workflows((select auth.uid())));

ALTER POLICY "Users can manage actions for own workflows" ON public.workflow_actions
  USING ((workflow_id IN ( SELECT workflows.id
   FROM workflows
  WHERE (workflows.created_by = (select auth.uid())))));

ALTER POLICY "Users can manage actions for their workflows" ON public.workflow_actions
  USING ((EXISTS ( SELECT 1
   FROM workflows
  WHERE ((workflows.id = workflow_actions.workflow_id) AND (workflows.created_by = (select auth.uid()))))));

ALTER POLICY "Users can view actions for their workflows" ON public.workflow_actions
  USING ((EXISTS ( SELECT 1
   FROM workflows
  WHERE ((workflows.id = workflow_actions.workflow_id) AND (workflows.created_by = (select auth.uid()))))));

ALTER POLICY "Users can view own email tracking" ON public.workflow_email_tracking
  USING (((user_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true))))));

ALTER POLICY "Authenticated users can create workflow events" ON public.workflow_events
  WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Users can view workflow events" ON public.workflow_events
  USING (((EXISTS ( SELECT 1
   FROM workflows
  WHERE (workflows.created_by = (select auth.uid())))) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true))))));

ALTER POLICY "Admins can manage rate limits" ON public.workflow_rate_limits
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))));

ALTER POLICY "View rate limits" ON public.workflow_rate_limits
  USING (((user_id = (select auth.uid())) OR (user_id IS NULL) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true))))));

ALTER POLICY "Admins/trainers can view all workflow runs" ON public.workflow_runs
  USING (can_manage_workflows((select auth.uid())));

ALTER POLICY "System can create workflow runs" ON public.workflow_runs
  WITH CHECK (((EXISTS ( SELECT 1
   FROM workflows
  WHERE ((workflows.id = workflow_runs.workflow_id) AND (workflows.created_by = (select auth.uid()))))) OR can_manage_workflows((select auth.uid()))));

ALTER POLICY "System can update workflow runs" ON public.workflow_runs
  USING (((EXISTS ( SELECT 1
   FROM workflows
  WHERE ((workflows.id = workflow_runs.workflow_id) AND (workflows.created_by = (select auth.uid()))))) OR can_manage_workflows((select auth.uid()))));

ALTER POLICY "Users can view runs for own workflows" ON public.workflow_runs
  USING ((workflow_id IN ( SELECT workflows.id
   FROM workflows
  WHERE (workflows.created_by = (select auth.uid())))));

ALTER POLICY "Users can view runs for their workflows" ON public.workflow_runs
  USING ((EXISTS ( SELECT 1
   FROM workflows
  WHERE ((workflows.id = workflow_runs.workflow_id) AND (workflows.created_by = (select auth.uid()))))));

ALTER POLICY "Users can view runs of their workflows" ON public.workflow_runs
  USING (((EXISTS ( SELECT 1
   FROM workflows
  WHERE ((workflows.id = workflow_runs.workflow_id) AND (workflows.created_by = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true))))));

ALTER POLICY "Users can create templates" ON public.workflow_templates
  WITH CHECK (((select auth.uid()) = created_by));

ALTER POLICY "Users can delete own templates" ON public.workflow_templates
  USING (((select auth.uid()) = created_by));

ALTER POLICY "Users can update own templates" ON public.workflow_templates
  USING (((select auth.uid()) = created_by));

ALTER POLICY "Users can view public templates" ON public.workflow_templates
  USING (((is_public = true) OR (created_by = (select auth.uid()))));

ALTER POLICY "Users can manage triggers for own workflows" ON public.workflow_triggers
  USING ((workflow_id IN ( SELECT workflows.id
   FROM workflows
  WHERE (workflows.created_by = (select auth.uid())))));

ALTER POLICY "Admins/trainers can delete all workflows" ON public.workflows
  USING (can_manage_workflows((select auth.uid())));

ALTER POLICY "Admins/trainers can update all workflows" ON public.workflows
  USING (can_manage_workflows((select auth.uid())))
  WITH CHECK (can_manage_workflows((select auth.uid())));

ALTER POLICY "Admins/trainers can view all workflows" ON public.workflows
  USING (can_manage_workflows((select auth.uid())));

ALTER POLICY "Users can create workflows" ON public.workflows
  WITH CHECK (((select auth.uid()) = created_by));

ALTER POLICY "Users can create workflows if they have permission" ON public.workflows
  WITH CHECK (((created_by = (select auth.uid())) AND can_manage_workflows((select auth.uid()))));

ALTER POLICY "Users can delete own workflows" ON public.workflows
  USING (((select auth.uid()) = created_by));

ALTER POLICY "Users can delete their own workflows" ON public.workflows
  USING ((created_by = (select auth.uid())));

ALTER POLICY "Users can delete their workflows" ON public.workflows
  USING ((created_by = (select auth.uid())));

ALTER POLICY "Users can update own workflows" ON public.workflows
  USING (((select auth.uid()) = created_by));

ALTER POLICY "Users can update their own workflows" ON public.workflows
  USING ((created_by = (select auth.uid())))
  WITH CHECK ((created_by = (select auth.uid())));

ALTER POLICY "Users can update their workflows" ON public.workflows
  USING ((created_by = (select auth.uid())))
  WITH CHECK ((created_by = (select auth.uid())));

ALTER POLICY "Users can view own workflows" ON public.workflows
  USING (((select auth.uid()) = created_by));

ALTER POLICY "Users can view their workflows" ON public.workflows
  USING (((created_by = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true))))));

ALTER POLICY "Users can view workflows they created" ON public.workflows
  USING ((created_by = (select auth.uid())));

ALTER POLICY writing_number_history_select_policy ON public.writing_number_history
  USING (((agent_id = (select auth.uid())) OR (is_imo_admin() AND (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = writing_number_history.agent_id) AND (user_profiles.imo_id = get_my_imo_id()))))) OR is_super_admin()));

ALTER POLICY "Staff can delete training documents storage" ON storage.objects
  USING (((bucket_id = 'training-documents'::text) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff can update training documents storage" ON storage.objects
  USING (((bucket_id = 'training-documents'::text) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff can upload training documents storage" ON storage.objects
  WITH CHECK (((bucket_id = 'training-documents'::text) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Staff can view training documents storage" ON storage.objects
  USING (((bucket_id = 'training-documents'::text) AND is_training_hub_staff((select auth.uid()))));

ALTER POLICY "Users can delete guides from their IMO" ON storage.objects
  USING (((bucket_id = 'underwriting-guides'::text) AND ((storage.foldername(name))[1] = ( SELECT (user_profiles.imo_id)::text AS imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid()))))));

ALTER POLICY "Users can delete own documents" ON storage.objects
  USING (((bucket_id = 'user-documents'::text) AND (((storage.foldername(name))[1] = ((select auth.uid()))::text) OR is_super_admin())));

ALTER POLICY "Users can update guides in their IMO" ON storage.objects
  USING (((bucket_id = 'underwriting-guides'::text) AND ((storage.foldername(name))[1] = ( SELECT (user_profiles.imo_id)::text AS imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid()))))));

ALTER POLICY "Users can update own documents" ON storage.objects
  USING (((bucket_id = 'user-documents'::text) AND (((storage.foldername(name))[1] = ((select auth.uid()))::text) OR is_super_admin())))
  WITH CHECK (((bucket_id = 'user-documents'::text) AND (((storage.foldername(name))[1] = ((select auth.uid()))::text) OR is_super_admin())));

ALTER POLICY "Users can upload guides to their IMO" ON storage.objects
  WITH CHECK (((bucket_id = 'underwriting-guides'::text) AND ((storage.foldername(name))[1] = ( SELECT (user_profiles.imo_id)::text AS imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid()))))));

ALTER POLICY "Users can upload own documents" ON storage.objects
  WITH CHECK (((bucket_id = 'user-documents'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

ALTER POLICY "Users can view guides from their IMO" ON storage.objects
  USING (((bucket_id = 'underwriting-guides'::text) AND ((storage.foldername(name))[1] = ( SELECT (user_profiles.imo_id)::text AS imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid()))))));

ALTER POLICY "Users can view own documents" ON storage.objects
  USING (((bucket_id = 'user-documents'::text) AND (((storage.foldername(name))[1] = ((select auth.uid()))::text) OR is_super_admin())));

ALTER POLICY presentation_recordings_delete ON storage.objects
  USING (((bucket_id = 'presentation-recordings'::text) AND (((storage.foldername(name))[1] = ((select auth.uid()))::text) OR (is_training_hub_staff((select auth.uid())) AND (( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = ((storage.foldername(objects.name))[1])::uuid)) = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid()))))))));

ALTER POLICY presentation_recordings_insert ON storage.objects
  WITH CHECK (((bucket_id = 'presentation-recordings'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

ALTER POLICY presentation_recordings_select ON storage.objects
  USING (((bucket_id = 'presentation-recordings'::text) AND (((storage.foldername(name))[1] = ((select auth.uid()))::text) OR (is_training_hub_staff((select auth.uid())) AND (( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = ((storage.foldername(objects.name))[1])::uuid)) = ( SELECT user_profiles.imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid()))))))));

ALTER POLICY recruiting_assets_user_delete ON storage.objects
  USING (((bucket_id = 'recruiting-assets'::text) AND ((select auth.role()) = 'authenticated'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

ALTER POLICY recruiting_assets_user_update ON storage.objects
  USING (((bucket_id = 'recruiting-assets'::text) AND ((select auth.role()) = 'authenticated'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)))
  WITH CHECK (((bucket_id = 'recruiting-assets'::text) AND ((select auth.role()) = 'authenticated'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

ALTER POLICY recruiting_assets_user_upload ON storage.objects
  WITH CHECK (((bucket_id = 'recruiting-assets'::text) AND ((select auth.role()) = 'authenticated'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

ALTER POLICY workspace_logos_delete ON storage.objects
  USING (((bucket_id = 'workspace-logos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (user_profiles.imo_id)::text AS imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid()))))));

ALTER POLICY workspace_logos_insert ON storage.objects
  WITH CHECK (((bucket_id = 'workspace-logos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (user_profiles.imo_id)::text AS imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid()))))));

ALTER POLICY workspace_logos_update ON storage.objects
  USING (((bucket_id = 'workspace-logos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (user_profiles.imo_id)::text AS imo_id
   FROM user_profiles
  WHERE (user_profiles.id = (select auth.uid()))))));
