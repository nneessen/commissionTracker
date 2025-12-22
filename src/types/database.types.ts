export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          city: string | null
          code: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          imo_id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string | null
          parent_agency_id: string | null
          settings: Json | null
          state: string | null
          street_address: string | null
          updated_at: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          city?: string | null
          code: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          imo_id: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id?: string | null
          parent_agency_id?: string | null
          settings?: Json | null
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          city?: string | null
          code?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          imo_id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          parent_agency_id?: string | null
          settings?: Json | null
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agencies_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_parent_agency_id_fkey"
            columns: ["parent_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_requests: {
        Row: {
          approver_id: string
          created_agency_id: string | null
          created_at: string
          current_agency_id: string
          id: string
          imo_id: string
          proposed_code: string
          proposed_description: string | null
          proposed_name: string
          rejection_reason: string | null
          requested_at: string
          requester_id: string
          reviewed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approver_id: string
          created_agency_id?: string | null
          created_at?: string
          current_agency_id: string
          id?: string
          imo_id: string
          proposed_code: string
          proposed_description?: string | null
          proposed_name: string
          rejection_reason?: string | null
          requested_at?: string
          requester_id: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approver_id?: string
          created_agency_id?: string | null
          created_at?: string
          current_agency_id?: string
          id?: string
          imo_id?: string
          proposed_code?: string
          proposed_description?: string | null
          proposed_name?: string
          rejection_reason?: string | null
          requested_at?: string
          requester_id?: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_requests_created_agency_id_fkey"
            columns: ["created_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_requests_current_agency_id_fkey"
            columns: ["current_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_requests_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rule_evaluations: {
        Row: {
          affected_entity_id: string | null
          affected_entity_type: string | null
          affected_user_id: string | null
          comparison: Database["public"]["Enums"]["alert_comparison"]
          current_value: number | null
          evaluated_at: string
          evaluation_context: Json | null
          id: string
          notification_id: string | null
          rule_id: string
          threshold_value: number
          triggered: boolean
        }
        Insert: {
          affected_entity_id?: string | null
          affected_entity_type?: string | null
          affected_user_id?: string | null
          comparison: Database["public"]["Enums"]["alert_comparison"]
          current_value?: number | null
          evaluated_at?: string
          evaluation_context?: Json | null
          id?: string
          notification_id?: string | null
          rule_id: string
          threshold_value: number
          triggered: boolean
        }
        Update: {
          affected_entity_id?: string | null
          affected_entity_type?: string | null
          affected_user_id?: string | null
          comparison?: Database["public"]["Enums"]["alert_comparison"]
          current_value?: number | null
          evaluated_at?: string
          evaluation_context?: Json | null
          id?: string
          notification_id?: string | null
          rule_id?: string
          threshold_value?: number
          triggered?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "alert_rule_evaluations_affected_user_id_fkey"
            columns: ["affected_user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rule_evaluations_affected_user_id_fkey"
            columns: ["affected_user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rule_evaluations_affected_user_id_fkey"
            columns: ["affected_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rule_evaluations_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rule_evaluations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rule_processing: {
        Row: {
          rule_id: string
          started_at: string
          worker_id: string | null
        }
        Insert: {
          rule_id: string
          started_at?: string
          worker_id?: string | null
        }
        Update: {
          rule_id?: string
          started_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_rule_processing_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: true
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          agency_id: string | null
          applies_to_downlines: boolean
          applies_to_self: boolean
          applies_to_team: boolean
          comparison: Database["public"]["Enums"]["alert_comparison"]
          consecutive_triggers: number
          cooldown_hours: number
          created_at: string
          description: string | null
          id: string
          imo_id: string | null
          is_active: boolean
          last_triggered_at: string | null
          metric: Database["public"]["Enums"]["alert_metric"]
          name: string
          notify_email: boolean
          notify_in_app: boolean
          owner_id: string
          threshold_unit: string | null
          threshold_value: number
          trigger_count: number
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          applies_to_downlines?: boolean
          applies_to_self?: boolean
          applies_to_team?: boolean
          comparison: Database["public"]["Enums"]["alert_comparison"]
          consecutive_triggers?: number
          cooldown_hours?: number
          created_at?: string
          description?: string | null
          id?: string
          imo_id?: string | null
          is_active?: boolean
          last_triggered_at?: string | null
          metric: Database["public"]["Enums"]["alert_metric"]
          name: string
          notify_email?: boolean
          notify_in_app?: boolean
          owner_id: string
          threshold_unit?: string | null
          threshold_value: number
          trigger_count?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          applies_to_downlines?: boolean
          applies_to_self?: boolean
          applies_to_team?: boolean
          comparison?: Database["public"]["Enums"]["alert_comparison"]
          consecutive_triggers?: number
          cooldown_hours?: number
          created_at?: string
          description?: string | null
          id?: string
          imo_id?: string | null
          is_active?: boolean
          last_triggered_at?: string | null
          metric?: Database["public"]["Enums"]["alert_metric"]
          name?: string
          notify_email?: boolean
          notify_in_app?: boolean
          owner_id?: string
          threshold_unit?: string | null
          threshold_value?: number
          trigger_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rules_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rules_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          action_type: string | null
          agency_id: string | null
          changed_fields: string[] | null
          created_at: string
          description: string | null
          id: string
          imo_id: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          performed_by: string | null
          performed_by_email: string | null
          performed_by_name: string | null
          record_id: string
          source: Database["public"]["Enums"]["audit_source"]
          table_name: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          action_type?: string | null
          agency_id?: string | null
          changed_fields?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          imo_id?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          performed_by_email?: string | null
          performed_by_name?: string | null
          record_id: string
          source?: Database["public"]["Enums"]["audit_source"]
          table_name: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          action_type?: string | null
          agency_id?: string | null
          changed_fields?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          imo_id?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          performed_by_email?: string | null
          performed_by_name?: string | null
          record_id?: string
          source?: Database["public"]["Enums"]["audit_source"]
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_email_campaigns: {
        Row: {
          bounced_count: number
          clicked_count: number
          completed_at: string | null
          created_at: string | null
          delivered_count: number
          failed_count: number
          id: string
          name: string
          opened_count: number
          recipient_count: number
          recipient_filter: Json | null
          recipient_source: string
          scheduled_for: string | null
          send_rate: number | null
          sent_count: number
          started_at: string | null
          status: string
          subject_override: string | null
          template_id: string | null
          unsubscribed_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bounced_count?: number
          clicked_count?: number
          completed_at?: string | null
          created_at?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          name: string
          opened_count?: number
          recipient_count?: number
          recipient_filter?: Json | null
          recipient_source: string
          scheduled_for?: string | null
          send_rate?: number | null
          sent_count?: number
          started_at?: string | null
          status?: string
          subject_override?: string | null
          template_id?: string | null
          unsubscribed_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bounced_count?: number
          clicked_count?: number
          completed_at?: string | null
          created_at?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          name?: string
          opened_count?: number
          recipient_count?: number
          recipient_filter?: Json | null
          recipient_source?: string
          scheduled_for?: string | null
          send_rate?: number | null
          sent_count?: number
          started_at?: string | null
          status?: string
          subject_override?: string | null
          template_id?: string | null
          unsubscribed_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_email_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_email_recipients: {
        Row: {
          campaign_id: string
          contact_id: string | null
          contact_type: string | null
          created_at: string | null
          email_address: string
          email_id: string | null
          error_message: string | null
          first_name: string | null
          id: string
          last_name: string | null
          sent_at: string | null
          status: string
          variables: Json | null
        }
        Insert: {
          campaign_id: string
          contact_id?: string | null
          contact_type?: string | null
          created_at?: string | null
          email_address: string
          email_id?: string | null
          error_message?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          sent_at?: string | null
          status?: string
          variables?: Json | null
        }
        Update: {
          campaign_id?: string
          contact_id?: string | null
          contact_type?: string | null
          created_at?: string | null
          email_address?: string
          email_id?: string | null
          error_message?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          sent_at?: string | null
          status?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_email_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bulk_email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_email_recipients_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "user_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      carriers: {
        Row: {
          code: string | null
          commission_structure: Json | null
          contact_info: Json | null
          created_at: string | null
          id: string
          imo_id: string | null
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          commission_structure?: Json | null
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          imo_id?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          commission_structure?: Json | null
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          imo_id?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carriers_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
        ]
      }
      chargebacks: {
        Row: {
          chargeback_amount: number
          chargeback_date: string
          commission_id: string | null
          created_at: string | null
          id: string
          reason: string | null
          resolution_date: string | null
          resolution_notes: string | null
          status: Database["public"]["Enums"]["chargeback_status"] | null
          updated_at: string | null
        }
        Insert: {
          chargeback_amount: number
          chargeback_date: string
          commission_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          resolution_date?: string | null
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["chargeback_status"] | null
          updated_at?: string | null
        }
        Update: {
          chargeback_amount?: number
          chargeback_date?: string
          commission_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          resolution_date?: string | null
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["chargeback_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chargebacks_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commission_earning_detail"
            referencedColumns: ["commission_id"]
          },
          {
            foreignKeyName: "chargebacks_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commission_earning_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chargebacks_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          advance_months: number
          amount: number
          chargeback_amount: number | null
          chargeback_date: string | null
          chargeback_reason: string | null
          created_at: string | null
          earned_amount: number
          id: string
          imo_id: string | null
          last_payment_date: string | null
          months_paid: number
          notes: string | null
          payment_date: string | null
          policy_id: string | null
          status: string
          type: string
          unearned_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          advance_months?: number
          amount: number
          chargeback_amount?: number | null
          chargeback_date?: string | null
          chargeback_reason?: string | null
          created_at?: string | null
          earned_amount?: number
          id?: string
          imo_id?: string | null
          last_payment_date?: string | null
          months_paid?: number
          notes?: string | null
          payment_date?: string | null
          policy_id?: string | null
          status?: string
          type: string
          unearned_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          advance_months?: number
          amount?: number
          chargeback_amount?: number | null
          chargeback_date?: string | null
          chargeback_reason?: string | null
          created_at?: string | null
          earned_amount?: number
          id?: string
          imo_id?: string | null
          last_payment_date?: string | null
          months_paid?: number
          notes?: string | null
          payment_date?: string | null
          policy_id?: string | null
          status?: string
          type?: string
          unearned_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_preferences: {
        Row: {
          contact_id: string
          contact_type: string
          created_at: string | null
          do_not_contact: boolean | null
          email_opt_in: boolean | null
          id: string
          preferred_channel: string | null
          slack_enabled: boolean | null
          sms_opt_in: boolean | null
          unsubscribe_reason: string | null
          unsubscribed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          contact_type: string
          created_at?: string | null
          do_not_contact?: boolean | null
          email_opt_in?: boolean | null
          id?: string
          preferred_channel?: string | null
          slack_enabled?: boolean | null
          sms_opt_in?: boolean | null
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          contact_type?: string
          created_at?: string | null
          do_not_contact?: boolean | null
          email_opt_in?: boolean | null
          id?: string
          preferred_channel?: string | null
          slack_enabled?: boolean | null
          sms_opt_in?: boolean | null
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comp_guide: {
        Row: {
          bonus_percentage: number | null
          carrier_id: string | null
          commission_percentage: number
          contract_level: number
          created_at: string | null
          effective_date: string
          expiration_date: string | null
          id: string
          imo_id: string | null
          maximum_premium: number | null
          minimum_premium: number | null
          product_id: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          updated_at: string | null
        }
        Insert: {
          bonus_percentage?: number | null
          carrier_id?: string | null
          commission_percentage: number
          contract_level: number
          created_at?: string | null
          effective_date: string
          expiration_date?: string | null
          id?: string
          imo_id?: string | null
          maximum_premium?: number | null
          minimum_premium?: number | null
          product_id?: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
        }
        Update: {
          bonus_percentage?: number | null
          carrier_id?: string | null
          commission_percentage?: number
          contract_level?: number
          created_at?: string | null
          effective_date?: string
          expiration_date?: string | null
          id?: string
          imo_id?: string | null
          maximum_premium?: number | null
          minimum_premium?: number | null
          product_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comp_guide_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comp_guide_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comp_guide_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      constants: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      contact_favorites: {
        Row: {
          client_id: string | null
          contact_user_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          contact_user_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          contact_user_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_favorites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_favorites_contact_user_id_fkey"
            columns: ["contact_user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_favorites_contact_user_id_fkey"
            columns: ["contact_user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_favorites_contact_user_id_fkey"
            columns: ["contact_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_labels: {
        Row: {
          color: string
          created_at: string | null
          icon: string | null
          id: string
          is_system: boolean
          message_count: number
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          message_count?: number
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          message_count?: number
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_labels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string | null
          error_message: string | null
          id: string
          recipient_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_quota_tracking: {
        Row: {
          date: string
          emails_sent: number | null
          id: string
          provider: string
          user_id: string
        }
        Insert: {
          date?: string
          emails_sent?: number | null
          id?: string
          provider: string
          user_id: string
        }
        Update: {
          date?: string
          emails_sent?: number | null
          id?: string
          provider?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_quota_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_quota_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_quota_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_scheduled: {
        Row: {
          created_at: string | null
          email_id: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          processed_at: string | null
          retry_count: number | null
          scheduled_for: string
          status: string
          timezone: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_id?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          processed_at?: string | null
          retry_count?: number | null
          scheduled_for: string
          status?: string
          timezone?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_id?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          processed_at?: string | null
          retry_count?: number | null
          scheduled_for?: string
          status?: string
          timezone?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_scheduled_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "user_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_scheduled_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_signatures: {
        Row: {
          content_html: string
          content_text: string
          created_at: string | null
          id: string
          include_social_links: boolean | null
          is_default: boolean
          name: string
          social_links: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_html: string
          content_text: string
          created_at?: string | null
          id?: string
          include_social_links?: boolean | null
          is_default?: boolean
          name: string
          social_links?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_html?: string
          content_text?: string
          created_at?: string | null
          id?: string
          include_social_links?: boolean | null
          is_default?: boolean
          name?: string
          social_links?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_snippets: {
        Row: {
          category: string | null
          content_html: string
          content_text: string
          created_at: string | null
          id: string
          last_used_at: string | null
          name: string
          shortcut: string | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content_html: string
          content_text: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          shortcut?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          content_html?: string
          content_text?: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          shortcut?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_snippets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          blocks: Json | null
          body_html: string
          body_text: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_block_template: boolean | null
          is_global: boolean | null
          name: string
          subject: string
          updated_at: string | null
          usage_count: number | null
          variables: string[] | null
        }
        Insert: {
          blocks?: Json | null
          body_html: string
          body_text?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_block_template?: boolean | null
          is_global?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: string[] | null
        }
        Update: {
          blocks?: Json | null
          body_html?: string
          body_text?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_block_template?: boolean | null
          is_global?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean
          is_starred: boolean
          labels: string[] | null
          last_message_at: string
          message_count: number
          participant_emails: string[]
          snippet: string | null
          subject: string
          subject_hash: string
          unread_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean
          is_starred?: boolean
          labels?: string[] | null
          last_message_at?: string
          message_count?: number
          participant_emails?: string[]
          snippet?: string | null
          subject: string
          subject_hash: string
          unread_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean
          is_starred?: boolean
          labels?: string[] | null
          last_message_at?: string
          message_count?: number
          participant_emails?: string[]
          snippet?: string | null
          subject?: string
          subject_hash?: string
          unread_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_tracking_events: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          email_id: string
          event_type: string
          id: string
          ip_address: unknown
          link_index: number | null
          link_url: string | null
          tracking_id: string
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          email_id: string
          event_type: string
          id?: string
          ip_address?: unknown
          link_index?: number | null
          link_url?: string | null
          tracking_id: string
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          email_id?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          link_index?: number | null
          link_url?: string | null
          tracking_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_tracking_events_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "user_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_tracking_links: {
        Row: {
          click_count: number | null
          created_at: string | null
          email_id: string
          first_clicked_at: string | null
          id: string
          link_index: number
          link_text: string | null
          original_url: string
          tracking_id: string
        }
        Insert: {
          click_count?: number | null
          created_at?: string | null
          email_id: string
          first_clicked_at?: string | null
          id?: string
          link_index: number
          link_text?: string | null
          original_url: string
          tracking_id: string
        }
        Update: {
          click_count?: number | null
          created_at?: string | null
          email_id?: string
          first_clicked_at?: string | null
          id?: string
          link_index?: number
          link_text?: string | null
          original_url?: string
          tracking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_tracking_links_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "user_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_triggers: {
        Row: {
          created_at: string | null
          created_by: string | null
          delay_minutes: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_id: string
          trigger_config: Json
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_id?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_triggers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_triggers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_triggers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_triggers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_watch_subscriptions: {
        Row: {
          created_at: string | null
          expiration: string | null
          history_id: string | null
          id: string
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expiration?: string | null
          history_id?: string | null
          id?: string
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expiration?: string | null
          history_id?: string | null
          id?: string
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_watch_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_watch_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_watch_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_webhook_events: {
        Row: {
          created_at: string | null
          email_id: string | null
          event_id: string
          event_type: string
          id: string
          message_id: string | null
          payload: Json | null
          processed_at: string | null
          provider: string
        }
        Insert: {
          created_at?: string | null
          email_id?: string | null
          event_id: string
          event_type: string
          id?: string
          message_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          provider: string
        }
        Update: {
          created_at?: string | null
          email_id?: string | null
          event_id?: string
          event_type?: string
          id?: string
          message_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_webhook_events_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "user_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_templates: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          expense_type: Database["public"]["Enums"]["expense_type"]
          id: string
          is_tax_deductible: boolean
          notes: string | null
          recurring_frequency: string | null
          template_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description?: string | null
          expense_type?: Database["public"]["Enums"]["expense_type"]
          id?: string
          is_tax_deductible?: boolean
          notes?: string | null
          recurring_frequency?: string | null
          template_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          expense_type?: Database["public"]["Enums"]["expense_type"]
          id?: string
          is_tax_deductible?: boolean
          notes?: string | null
          recurring_frequency?: string | null
          template_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_expense_templates_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          agency_id: string | null
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string
          expense_type: Database["public"]["Enums"]["expense_type"]
          id: string
          imo_id: string | null
          is_recurring: boolean | null
          is_tax_deductible: boolean
          name: string
          notes: string | null
          receipt_url: string | null
          recurring_end_date: string | null
          recurring_frequency: string | null
          recurring_group_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          amount: number
          category: string
          created_at?: string | null
          date: string
          description: string
          expense_type?: Database["public"]["Enums"]["expense_type"]
          id?: string
          imo_id?: string | null
          is_recurring?: boolean | null
          is_tax_deductible?: boolean
          name: string
          notes?: string | null
          receipt_url?: string | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          recurring_group_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string
          expense_type?: Database["public"]["Enums"]["expense_type"]
          id?: string
          imo_id?: string | null
          is_recurring?: boolean | null
          is_tax_deductible?: boolean
          name?: string
          notes?: string | null
          receipt_url?: string | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          recurring_group_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
        ]
      }
      hierarchy_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitee_email: string
          invitee_id: string | null
          inviter_id: string
          message: string | null
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email: string
          invitee_id?: string | null
          inviter_id: string
          message?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email?: string
          invitee_id?: string | null
          inviter_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hierarchy_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hierarchy_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      imos: {
        Row: {
          city: string | null
          code: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          state: string | null
          street_address: string | null
          updated_at: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          city?: string | null
          code: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          city?: string | null
          code?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      join_requests: {
        Row: {
          agency_id: string | null
          approver_id: string
          created_at: string
          id: string
          imo_id: string
          message: string | null
          rejection_reason: string | null
          requested_at: string
          requested_upline_id: string | null
          requester_id: string
          reviewed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          approver_id: string
          created_at?: string
          id?: string
          imo_id: string
          message?: string | null
          rejection_reason?: string | null
          requested_at?: string
          requested_upline_id?: string | null
          requester_id: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          approver_id?: string
          created_at?: string
          id?: string
          imo_id?: string
          message?: string | null
          rejection_reason?: string | null
          requested_at?: string
          requested_upline_id?: string | null
          requester_id?: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_requested_upline_id_fkey"
            columns: ["requested_upline_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_requested_upline_id_fkey"
            columns: ["requested_upline_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_requested_upline_id_fkey"
            columns: ["requested_upline_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          last_message_at: string | null
          participant_ids: string[]
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          last_message_at?: string | null
          participant_ids: string[]
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          last_message_at?: string | null
          participant_ids?: string[]
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read_by: string[] | null
          sender_id: string
          thread_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read_by?: string[] | null
          sender_id: string
          thread_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read_by?: string[] | null
          sender_id?: string
          thread_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_digest_log: {
        Row: {
          email_message_id: string | null
          email_sent_to: string
          error_message: string | null
          id: string
          notification_count: number
          notification_ids: string[]
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          email_message_id?: string | null
          email_sent_to: string
          error_message?: string | null
          id?: string
          notification_count: number
          notification_ids: string[]
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          email_message_id?: string | null
          email_sent_to?: string
          error_message?: string | null
          id?: string
          notification_count?: number
          notification_ids?: string[]
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_digest_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_digest_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_digest_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          browser_push_enabled: boolean | null
          browser_push_subscription: Json | null
          created_at: string | null
          email_digest_enabled: boolean | null
          email_digest_frequency: string | null
          email_digest_time: string | null
          email_digest_timezone: string | null
          id: string
          in_app_enabled: boolean | null
          last_digest_sent_at: string | null
          notify_on_click: boolean | null
          notify_on_open: boolean | null
          notify_on_reply: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          browser_push_enabled?: boolean | null
          browser_push_subscription?: Json | null
          created_at?: string | null
          email_digest_enabled?: boolean | null
          email_digest_frequency?: string | null
          email_digest_time?: string | null
          email_digest_timezone?: string | null
          id?: string
          in_app_enabled?: boolean | null
          last_digest_sent_at?: string | null
          notify_on_click?: boolean | null
          notify_on_open?: boolean | null
          notify_on_reply?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          browser_push_enabled?: boolean | null
          browser_push_subscription?: Json | null
          created_at?: string | null
          email_digest_enabled?: boolean | null
          email_digest_frequency?: string | null
          email_digest_time?: string | null
          email_digest_timezone?: string | null
          id?: string
          in_app_enabled?: boolean | null
          last_digest_sent_at?: string | null
          notify_on_click?: boolean | null
          notify_on_open?: boolean | null
          notify_on_reply?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          message: string | null
          metadata: Json | null
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_phases: {
        Row: {
          blocked_reason: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          phase_name: string
          phase_order: number
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          phase_name: string
          phase_order: number
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          phase_name?: string
          phase_order?: number
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_phases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_phases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_phases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      override_commissions: {
        Row: {
          advance_months: number | null
          agency_id: string | null
          base_agent_id: string
          base_commission_amount: number
          base_comp_level: number
          carrier_id: string
          chargeback_amount: number | null
          chargeback_date: string | null
          chargeback_reason: string | null
          created_at: string | null
          earned_amount: number | null
          hierarchy_depth: number
          id: string
          imo_id: string | null
          months_paid: number | null
          override_agent_id: string
          override_commission_amount: number
          override_comp_level: number
          payment_date: string | null
          policy_id: string
          policy_premium: number
          product_id: string | null
          status: string
          unearned_amount: number | null
          updated_at: string | null
        }
        Insert: {
          advance_months?: number | null
          agency_id?: string | null
          base_agent_id: string
          base_commission_amount: number
          base_comp_level: number
          carrier_id: string
          chargeback_amount?: number | null
          chargeback_date?: string | null
          chargeback_reason?: string | null
          created_at?: string | null
          earned_amount?: number | null
          hierarchy_depth: number
          id?: string
          imo_id?: string | null
          months_paid?: number | null
          override_agent_id: string
          override_commission_amount: number
          override_comp_level: number
          payment_date?: string | null
          policy_id: string
          policy_premium: number
          product_id?: string | null
          status?: string
          unearned_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          advance_months?: number | null
          agency_id?: string | null
          base_agent_id?: string
          base_commission_amount?: number
          base_comp_level?: number
          carrier_id?: string
          chargeback_amount?: number | null
          chargeback_date?: string | null
          chargeback_reason?: string | null
          created_at?: string | null
          earned_amount?: number | null
          hierarchy_depth?: number
          id?: string
          imo_id?: string | null
          months_paid?: number | null
          override_agent_id?: string
          override_commission_amount?: number
          override_comp_level?: number
          payment_date?: string | null
          policy_id?: string
          policy_premium?: number
          product_id?: string | null
          status?: string
          unearned_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "override_commissions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_commissions_base_agent_id_fkey"
            columns: ["base_agent_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_commissions_base_agent_id_fkey"
            columns: ["base_agent_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_commissions_base_agent_id_fkey"
            columns: ["base_agent_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_commissions_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_commissions_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_commissions_override_agent_id_fkey"
            columns: ["override_agent_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_commissions_override_agent_id_fkey"
            columns: ["override_agent_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_commissions_override_agent_id_fkey"
            columns: ["override_agent_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_commissions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_commissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          resource: string
          scope: string | null
        }
        Insert: {
          action: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          resource: string
          scope?: string | null
        }
        Update: {
          action?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          resource?: string
          scope?: string | null
        }
        Relationships: []
      }
      phase_checklist_items: {
        Row: {
          can_be_completed_by: string
          created_at: string | null
          document_type: string | null
          external_link: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          item_description: string | null
          item_name: string
          item_order: number
          item_type: string
          metadata: Json | null
          phase_id: string
          requires_verification: boolean | null
          updated_at: string | null
          verification_by: string | null
        }
        Insert: {
          can_be_completed_by: string
          created_at?: string | null
          document_type?: string | null
          external_link?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          item_description?: string | null
          item_name: string
          item_order: number
          item_type: string
          metadata?: Json | null
          phase_id: string
          requires_verification?: boolean | null
          updated_at?: string | null
          verification_by?: string | null
        }
        Update: {
          can_be_completed_by?: string
          created_at?: string | null
          document_type?: string | null
          external_link?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          item_description?: string | null
          item_name?: string
          item_order?: number
          item_type?: string
          metadata?: Json | null
          phase_id?: string
          requires_verification?: boolean | null
          updated_at?: string | null
          verification_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phase_checklist_items_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "pipeline_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_phases: {
        Row: {
          auto_advance: boolean | null
          created_at: string | null
          estimated_days: number | null
          id: string
          is_active: boolean | null
          phase_description: string | null
          phase_name: string
          phase_order: number
          required_approver_role: string | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          auto_advance?: boolean | null
          created_at?: string | null
          estimated_days?: number | null
          id?: string
          is_active?: boolean | null
          phase_description?: string | null
          phase_name: string
          phase_order: number
          required_approver_role?: string | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          auto_advance?: boolean | null
          created_at?: string | null
          estimated_days?: number | null
          id?: string
          is_active?: boolean | null
          phase_description?: string | null
          phase_name?: string
          phase_order?: number
          required_approver_role?: string | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_phases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pipeline_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          imo_id: string | null
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          imo_id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          imo_id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_templates_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          agency_id: string | null
          annual_premium: number | null
          cancellation_date: string | null
          cancellation_reason: string | null
          carrier_id: string
          client_id: string | null
          commission_percentage: number | null
          created_at: string | null
          effective_date: string
          expiration_date: string | null
          id: string
          imo_id: string | null
          monthly_premium: number
          notes: string | null
          payment_frequency:
            | Database["public"]["Enums"]["payment_frequency"]
            | null
          policy_number: string
          product: Database["public"]["Enums"]["product_type"]
          product_id: string | null
          referral_source: string | null
          status: string
          term_length: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          annual_premium?: number | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          carrier_id: string
          client_id?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          effective_date: string
          expiration_date?: string | null
          id?: string
          imo_id?: string | null
          monthly_premium: number
          notes?: string | null
          payment_frequency?:
            | Database["public"]["Enums"]["payment_frequency"]
            | null
          policy_number: string
          product: Database["public"]["Enums"]["product_type"]
          product_id?: string | null
          referral_source?: string | null
          status?: string
          term_length?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          annual_premium?: number | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          carrier_id?: string
          client_id?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          effective_date?: string
          expiration_date?: string | null
          id?: string
          imo_id?: string | null
          monthly_premium?: number
          notes?: string | null
          payment_frequency?:
            | Database["public"]["Enums"]["payment_frequency"]
            | null
          policy_number?: string
          product?: Database["public"]["Enums"]["product_type"]
          product_id?: string | null
          referral_source?: string | null
          status?: string
          term_length?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_commission_overrides: {
        Row: {
          bonus_percentage: number | null
          commission_percentage: number
          comp_level: Database["public"]["Enums"]["comp_level"]
          created_at: string | null
          effective_date: string
          expiration_date: string | null
          id: string
          notes: string | null
          product_id: string
          updated_at: string | null
        }
        Insert: {
          bonus_percentage?: number | null
          commission_percentage: number
          comp_level: Database["public"]["Enums"]["comp_level"]
          created_at?: string | null
          effective_date?: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          product_id: string
          updated_at?: string | null
        }
        Update: {
          bonus_percentage?: number | null
          commission_percentage?: number
          comp_level?: Database["public"]["Enums"]["comp_level"]
          created_at?: string | null
          effective_date?: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_commission_overrides_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          carrier_id: string
          code: string | null
          commission_percentage: number | null
          created_at: string | null
          description: string | null
          id: string
          imo_id: string | null
          is_active: boolean | null
          max_age: number | null
          max_premium: number | null
          metadata: Json | null
          min_age: number | null
          min_premium: number | null
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          updated_at: string | null
        }
        Insert: {
          carrier_id: string
          code?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          imo_id?: string | null
          is_active?: boolean | null
          max_age?: number | null
          max_premium?: number | null
          metadata?: Json | null
          min_age?: number | null
          min_premium?: number | null
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
        }
        Update: {
          carrier_id?: string
          code?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          imo_id?: string | null
          is_active?: boolean | null
          max_age?: number | null
          max_premium?: number | null
          metadata?: Json | null
          min_age?: number | null
          min_premium?: number | null
          name?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
        ]
      }
      recruit_checklist_progress: {
        Row: {
          agency_id: string | null
          checklist_item_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          document_id: string | null
          id: string
          imo_id: string | null
          metadata: Json | null
          notes: string | null
          rejection_reason: string | null
          status: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          agency_id?: string | null
          checklist_item_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          imo_id?: string | null
          metadata?: Json | null
          notes?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          agency_id?: string | null
          checklist_item_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          imo_id?: string | null
          metadata?: Json | null
          notes?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruit_checklist_progress_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_checklist_progress_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "phase_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_checklist_progress_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_checklist_progress_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_checklist_progress_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_checklist_progress_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_checklist_progress_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_checklist_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_checklist_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_checklist_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_checklist_progress_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_checklist_progress_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_checklist_progress_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recruit_phase_progress: {
        Row: {
          agency_id: string | null
          blocked_reason: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          imo_id: string | null
          notes: string | null
          phase_id: string
          started_at: string | null
          status: string
          template_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          imo_id?: string | null
          notes?: string | null
          phase_id: string
          started_at?: string | null
          status?: string
          template_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          imo_id?: string | null
          notes?: string | null
          phase_id?: string
          started_at?: string | null
          status?: string
          template_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruit_phase_progress_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_phase_progress_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_phase_progress_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "pipeline_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_phase_progress_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pipeline_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_phase_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_phase_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_phase_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_system_role: boolean | null
          name: string
          parent_role_id: string | null
          respects_hierarchy: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_system_role?: boolean | null
          name: string
          parent_role_id?: string | null
          respects_hierarchy?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_system_role?: boolean | null
          name?: string
          parent_role_id?: string | null
          respects_hierarchy?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_parent_role_id_fkey"
            columns: ["parent_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_report_deliveries: {
        Row: {
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          mailgun_message_id: string | null
          recipients_sent: Json
          report_period_end: string
          report_period_start: string
          schedule_id: string
          status: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          mailgun_message_id?: string | null
          recipients_sent?: Json
          report_period_end: string
          report_period_start: string
          schedule_id: string
          status?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          mailgun_message_id?: string | null
          recipients_sent?: Json
          report_period_end?: string
          report_period_start?: string
          schedule_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_report_deliveries_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          agency_id: string | null
          consecutive_failures: number
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          export_format: string
          frequency: Database["public"]["Enums"]["report_frequency"]
          id: string
          imo_id: string | null
          include_charts: boolean
          include_insights: boolean
          include_summary: boolean
          is_active: boolean
          last_delivery: string | null
          next_delivery: string
          owner_id: string
          preferred_time: string
          recipients: Json
          report_config: Json
          report_type: string
          schedule_name: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          consecutive_failures?: number
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          export_format?: string
          frequency: Database["public"]["Enums"]["report_frequency"]
          id?: string
          imo_id?: string | null
          include_charts?: boolean
          include_insights?: boolean
          include_summary?: boolean
          is_active?: boolean
          last_delivery?: string | null
          next_delivery: string
          owner_id: string
          preferred_time?: string
          recipients?: Json
          report_config?: Json
          report_type: string
          schedule_name: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          consecutive_failures?: number
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          export_format?: string
          frequency?: Database["public"]["Enums"]["report_frequency"]
          id?: string
          imo_id?: string | null
          include_charts?: boolean
          include_insights?: boolean
          include_summary?: boolean
          is_active?: boolean
          last_delivery?: string | null
          next_delivery?: string
          owner_id?: string
          preferred_time?: string
          recipients?: Json
          report_config?: Json
          report_type?: string
          schedule_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string | null
          currency: string | null
          default_commission_rate: number | null
          email_template_limit: number | null
          fiscal_year_start: number | null
          id: string
          notifications_enabled: boolean | null
          tax_rate: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          default_commission_rate?: number | null
          email_template_limit?: number | null
          fiscal_year_start?: number | null
          id?: string
          notifications_enabled?: boolean | null
          tax_rate?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          default_commission_rate?: number | null
          email_template_limit?: number | null
          fiscal_year_start?: number | null
          id?: string
          notifications_enabled?: boolean | null
          tax_rate?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_data: Json
          event_name: string | null
          event_type: string
          id: string
          lemon_event_id: string | null
          lemon_webhook_id: string | null
          processed_at: string | null
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_data?: Json
          event_name?: string | null
          event_type: string
          id?: string
          lemon_event_id?: string | null
          lemon_webhook_id?: string | null
          processed_at?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_data?: Json
          event_name?: string | null
          event_type?: string
          id?: string
          lemon_event_id?: string | null
          lemon_webhook_id?: string | null
          processed_at?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          billing_reason: string | null
          card_brand: string | null
          card_last_four: string | null
          created_at: string
          currency: string
          discount_amount: number
          id: string
          invoice_url: string | null
          lemon_invoice_id: string | null
          lemon_order_id: string | null
          lemon_subscription_id: string | null
          paid_at: string | null
          receipt_url: string | null
          refund_amount: number | null
          refunded_at: string | null
          status: string
          subscription_id: string | null
          tax_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_reason?: string | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          id?: string
          invoice_url?: string | null
          lemon_invoice_id?: string | null
          lemon_order_id?: string | null
          lemon_subscription_id?: string | null
          paid_at?: string | null
          receipt_url?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          status?: string
          subscription_id?: string | null
          tax_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_reason?: string | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          id?: string
          invoice_url?: string | null
          lemon_invoice_id?: string | null
          lemon_order_id?: string | null
          lemon_subscription_id?: string | null
          paid_at?: string | null
          receipt_url?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          status?: string
          subscription_id?: string | null
          tax_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          analytics_sections: string[]
          created_at: string
          description: string | null
          display_name: string
          email_limit: number
          features: Json
          id: string
          is_active: boolean
          lemon_product_id: string | null
          lemon_variant_id_annual: string | null
          lemon_variant_id_monthly: string | null
          name: string
          price_annual: number
          price_monthly: number
          sms_enabled: boolean
          sort_order: number
          team_size_limit: number | null
          updated_at: string
        }
        Insert: {
          analytics_sections?: string[]
          created_at?: string
          description?: string | null
          display_name: string
          email_limit?: number
          features?: Json
          id?: string
          is_active?: boolean
          lemon_product_id?: string | null
          lemon_variant_id_annual?: string | null
          lemon_variant_id_monthly?: string | null
          name: string
          price_annual?: number
          price_monthly?: number
          sms_enabled?: boolean
          sort_order?: number
          team_size_limit?: number | null
          updated_at?: string
        }
        Update: {
          analytics_sections?: string[]
          created_at?: string
          description?: string | null
          display_name?: string
          email_limit?: number
          features?: Json
          id?: string
          is_active?: boolean
          lemon_product_id?: string | null
          lemon_variant_id_annual?: string | null
          lemon_variant_id_monthly?: string | null
          name?: string
          price_annual?: number
          price_monthly?: number
          sms_enabled?: boolean
          sort_order?: number
          team_size_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      system_audit_log: {
        Row: {
          action: string
          data: Json | null
          id: string
          performed_at: string | null
          performed_by: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          data?: Json | null
          id?: string
          performed_at?: string | null
          performed_by?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          data?: Json | null
          id?: string
          performed_at?: string | null
          performed_by?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trigger_event_types: {
        Row: {
          available_variables: Json | null
          category: string
          created_at: string | null
          description: string | null
          event_name: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          available_variables?: Json | null
          category: string
          created_at?: string | null
          description?: string | null
          event_name: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          available_variables?: Json | null
          category?: string
          created_at?: string | null
          description?: string | null
          event_name?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          count: number
          created_at: string
          id: string
          metric: string
          overage_amount: number
          overage_charged: boolean
          period_end: string
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          metric: string
          overage_amount?: number
          overage_charged?: boolean
          period_end: string
          period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          metric?: string
          overage_amount?: number
          overage_charged?: boolean
          period_end?: string
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          performed_by: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_by?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string
          expires_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          notes: string | null
          required: boolean | null
          status: string
          storage_path: string
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type: string
          expires_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          required?: boolean | null
          status?: string
          storage_path: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string
          expires_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          required?: boolean | null
          status?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_email_attachments: {
        Row: {
          created_at: string | null
          email_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          email_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path: string
        }
        Update: {
          created_at?: string | null
          email_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_email_attachments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "user_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      user_email_oauth_tokens: {
        Row: {
          access_token_encrypted: string
          created_at: string | null
          email_address: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          provider: string
          refresh_token_encrypted: string | null
          scopes: string[] | null
          token_expiry: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string | null
          email_address: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          provider: string
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string | null
          email_address?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          provider?: string
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_email_oauth_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_oauth_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_oauth_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_emails: {
        Row: {
          attachment_count: number | null
          body_html: string | null
          body_text: string | null
          campaign_id: string | null
          cc_addresses: string[] | null
          click_count: number | null
          created_at: string | null
          delivered_at: string | null
          failed_reason: string | null
          first_clicked_at: string | null
          first_opened_at: string | null
          from_address: string | null
          has_attachments: boolean | null
          id: string
          in_reply_to_header: string | null
          is_incoming: boolean | null
          is_read: boolean | null
          labels: string[] | null
          message_id_header: string | null
          metadata: Json | null
          open_count: number | null
          opened_at: string | null
          provider: string | null
          provider_message_id: string | null
          references_header: string[] | null
          reply_to_id: string | null
          scheduled_for: string | null
          sender_id: string | null
          sent_at: string | null
          signature_id: string | null
          source: string | null
          status: string
          subject: string
          thread_id: string | null
          to_addresses: string[] | null
          tracking_id: string | null
          updated_at: string | null
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          attachment_count?: number | null
          body_html?: string | null
          body_text?: string | null
          campaign_id?: string | null
          cc_addresses?: string[] | null
          click_count?: number | null
          created_at?: string | null
          delivered_at?: string | null
          failed_reason?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          from_address?: string | null
          has_attachments?: boolean | null
          id?: string
          in_reply_to_header?: string | null
          is_incoming?: boolean | null
          is_read?: boolean | null
          labels?: string[] | null
          message_id_header?: string | null
          metadata?: Json | null
          open_count?: number | null
          opened_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          references_header?: string[] | null
          reply_to_id?: string | null
          scheduled_for?: string | null
          sender_id?: string | null
          sent_at?: string | null
          signature_id?: string | null
          source?: string | null
          status?: string
          subject: string
          thread_id?: string | null
          to_addresses?: string[] | null
          tracking_id?: string | null
          updated_at?: string | null
          user_id: string
          workflow_id?: string | null
        }
        Update: {
          attachment_count?: number | null
          body_html?: string | null
          body_text?: string | null
          campaign_id?: string | null
          cc_addresses?: string[] | null
          click_count?: number | null
          created_at?: string | null
          delivered_at?: string | null
          failed_reason?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          from_address?: string | null
          has_attachments?: boolean | null
          id?: string
          in_reply_to_header?: string | null
          is_incoming?: boolean | null
          is_read?: boolean | null
          labels?: string[] | null
          message_id_header?: string | null
          metadata?: Json | null
          open_count?: number | null
          opened_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          references_header?: string[] | null
          reply_to_id?: string | null
          scheduled_for?: string | null
          sender_id?: string | null
          sent_at?: string | null
          signature_id?: string | null
          source?: string | null
          status?: string
          subject?: string
          thread_id?: string | null
          to_addresses?: string[] | null
          tracking_id?: string | null
          updated_at?: string | null
          user_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_emails_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "user_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_emails_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_emails_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_emails_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_emails_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "email_signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mailbox_settings: {
        Row: {
          auto_reply_enabled: boolean | null
          auto_reply_message: string | null
          auto_reply_subject: string | null
          created_at: string | null
          display_name: string | null
          id: string
          notification_email_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          auto_reply_subject?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          notification_email_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          auto_reply_subject?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          notification_email_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mailbox_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mailbox_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mailbox_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          agency_id: string | null
          agent_status: Database["public"]["Enums"]["agent_status"] | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          city: string | null
          contract_level: number | null
          created_at: string | null
          current_onboarding_phase: string | null
          custom_permissions: Json | null
          date_of_birth: string | null
          denial_reason: string | null
          denied_at: string | null
          email: string
          facebook_handle: string | null
          first_name: string | null
          hierarchy_depth: number | null
          hierarchy_path: string | null
          id: string
          imo_id: string | null
          instagram_url: string | null
          instagram_username: string | null
          is_admin: boolean
          is_super_admin: boolean | null
          last_name: string | null
          license_expiration: string | null
          license_number: string | null
          licensing_info: Json | null
          linkedin_url: string | null
          linkedin_username: string | null
          npn: string | null
          onboarding_completed_at: string | null
          onboarding_started_at: string | null
          onboarding_status: string | null
          personal_website: string | null
          phone: string | null
          pipeline_template_id: string | null
          profile_photo_url: string | null
          recruiter_id: string | null
          referral_source: string | null
          resident_state: string | null
          roles: string[] | null
          state: string | null
          street_address: string | null
          subscription_tier: string
          updated_at: string | null
          upline_id: string | null
          zip: string | null
        }
        Insert: {
          agency_id?: string | null
          agent_status?: Database["public"]["Enums"]["agent_status"] | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          contract_level?: number | null
          created_at?: string | null
          current_onboarding_phase?: string | null
          custom_permissions?: Json | null
          date_of_birth?: string | null
          denial_reason?: string | null
          denied_at?: string | null
          email: string
          facebook_handle?: string | null
          first_name?: string | null
          hierarchy_depth?: number | null
          hierarchy_path?: string | null
          id?: string
          imo_id?: string | null
          instagram_url?: string | null
          instagram_username?: string | null
          is_admin?: boolean
          is_super_admin?: boolean | null
          last_name?: string | null
          license_expiration?: string | null
          license_number?: string | null
          licensing_info?: Json | null
          linkedin_url?: string | null
          linkedin_username?: string | null
          npn?: string | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_status?: string | null
          personal_website?: string | null
          phone?: string | null
          pipeline_template_id?: string | null
          profile_photo_url?: string | null
          recruiter_id?: string | null
          referral_source?: string | null
          resident_state?: string | null
          roles?: string[] | null
          state?: string | null
          street_address?: string | null
          subscription_tier?: string
          updated_at?: string | null
          upline_id?: string | null
          zip?: string | null
        }
        Update: {
          agency_id?: string | null
          agent_status?: Database["public"]["Enums"]["agent_status"] | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          contract_level?: number | null
          created_at?: string | null
          current_onboarding_phase?: string | null
          custom_permissions?: Json | null
          date_of_birth?: string | null
          denial_reason?: string | null
          denied_at?: string | null
          email?: string
          facebook_handle?: string | null
          first_name?: string | null
          hierarchy_depth?: number | null
          hierarchy_path?: string | null
          id?: string
          imo_id?: string | null
          instagram_url?: string | null
          instagram_username?: string | null
          is_admin?: boolean
          is_super_admin?: boolean | null
          last_name?: string | null
          license_expiration?: string | null
          license_number?: string | null
          licensing_info?: Json | null
          linkedin_url?: string | null
          linkedin_username?: string | null
          npn?: string | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_status?: string | null
          personal_website?: string | null
          phone?: string | null
          pipeline_template_id?: string | null
          profile_photo_url?: string | null
          recruiter_id?: string | null
          referral_source?: string | null
          resident_state?: string | null
          roles?: string[] | null
          state?: string | null
          street_address?: string | null
          subscription_tier?: string
          updated_at?: string | null
          upline_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_pipeline_template_id_fkey"
            columns: ["pipeline_template_id"]
            isOneToOne: false
            referencedRelation: "pipeline_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_upline_id_fkey"
            columns: ["upline_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_upline_id_fkey"
            columns: ["upline_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_upline_id_fkey"
            columns: ["upline_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          billing_interval: string
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          grandfathered_until: string | null
          id: string
          lemon_customer_id: string | null
          lemon_order_id: string | null
          lemon_subscription_id: string | null
          plan_id: string
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grandfathered_until?: string | null
          id?: string
          lemon_customer_id?: string | null
          lemon_order_id?: string | null
          lemon_subscription_id?: string | null
          plan_id: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grandfathered_until?: string | null
          id?: string
          lemon_customer_id?: string | null
          lemon_order_id?: string | null
          lemon_subscription_id?: string | null
          plan_id?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_targets: {
        Row: {
          achievements: Json | null
          annual_income_target: number | null
          annual_policies_target: number | null
          avg_premium_target: number | null
          created_at: string | null
          expense_ratio_target: number | null
          id: string
          last_milestone_date: string | null
          monthly_expense_target: number | null
          monthly_income_target: number | null
          monthly_policies_target: number | null
          persistency_13_month_target: number | null
          persistency_25_month_target: number | null
          quarterly_income_target: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          achievements?: Json | null
          annual_income_target?: number | null
          annual_policies_target?: number | null
          avg_premium_target?: number | null
          created_at?: string | null
          expense_ratio_target?: number | null
          id?: string
          last_milestone_date?: string | null
          monthly_expense_target?: number | null
          monthly_income_target?: number | null
          monthly_policies_target?: number | null
          persistency_13_month_target?: number | null
          persistency_25_month_target?: number | null
          quarterly_income_target?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievements?: Json | null
          annual_income_target?: number | null
          annual_policies_target?: number | null
          avg_premium_target?: number | null
          created_at?: string | null
          expense_ratio_target?: number | null
          id?: string
          last_milestone_date?: string | null
          monthly_expense_target?: number | null
          monthly_income_target?: number | null
          monthly_policies_target?: number | null
          persistency_13_month_target?: number | null
          persistency_25_month_target?: number | null
          quarterly_income_target?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_actions: {
        Row: {
          action_order: number
          action_type: string
          conditions: Json | null
          config: Json
          created_at: string | null
          delay_minutes: number | null
          id: string
          max_retries: number | null
          retry_on_failure: boolean | null
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          action_order: number
          action_type: string
          conditions?: Json | null
          config?: Json
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          max_retries?: number | null
          retry_on_failure?: boolean | null
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          action_order?: number
          action_type?: string
          conditions?: Json | null
          config?: Json
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          max_retries?: number | null
          retry_on_failure?: boolean | null
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_actions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_email_tracking: {
        Row: {
          date: string | null
          error_message: string | null
          id: string
          recipient_email: string
          recipient_type: string
          sent_at: string | null
          success: boolean | null
          user_id: string | null
          workflow_id: string | null
        }
        Insert: {
          date?: string | null
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_type: string
          sent_at?: string | null
          success?: boolean | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          date?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_type?: string
          sent_at?: string | null
          success?: boolean | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_email_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_email_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_email_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_email_tracking_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_events: {
        Row: {
          context: Json | null
          created_at: string | null
          event_name: string
          fired_at: string | null
          id: string
          workflows_triggered: number | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          event_name: string
          fired_at?: string | null
          id?: string
          workflows_triggered?: number | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          event_name?: string
          fired_at?: string | null
          id?: string
          workflows_triggered?: number | null
        }
        Relationships: []
      }
      workflow_rate_limits: {
        Row: {
          created_at: string | null
          daily_email_limit: number | null
          daily_workflow_runs_limit: number | null
          id: string
          is_unlimited: boolean | null
          max_recipients_per_action: number | null
          per_recipient_daily_limit: number | null
          per_workflow_hourly_limit: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          daily_email_limit?: number | null
          daily_workflow_runs_limit?: number | null
          id?: string
          is_unlimited?: boolean | null
          max_recipients_per_action?: number | null
          per_recipient_daily_limit?: number | null
          per_workflow_hourly_limit?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          daily_email_limit?: number | null
          daily_workflow_runs_limit?: number | null
          id?: string
          is_unlimited?: boolean | null
          max_recipients_per_action?: number | null
          per_recipient_daily_limit?: number | null
          per_workflow_hourly_limit?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          actions_completed: number | null
          actions_executed: Json | null
          actions_failed: number | null
          completed_at: string | null
          context: Json | null
          created_at: string | null
          duration_ms: number | null
          emails_sent: number | null
          error: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          started_at: string | null
          status: string
          trigger_source: string | null
          workflow_id: string
        }
        Insert: {
          actions_completed?: number | null
          actions_executed?: Json | null
          actions_failed?: number | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          emails_sent?: number | null
          error?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_source?: string | null
          workflow_id: string
        }
        Update: {
          actions_completed?: number | null
          actions_executed?: Json | null
          actions_failed?: number | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          emails_sent?: number | null
          error?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_source?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          name: string
          rating: number | null
          updated_at: string | null
          usage_count: number | null
          workflow_config: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name: string
          rating?: number | null
          updated_at?: string | null
          usage_count?: number | null
          workflow_config: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name?: string
          rating?: number | null
          updated_at?: string | null
          usage_count?: number | null
          workflow_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_triggers: {
        Row: {
          created_at: string | null
          event_config: Json | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          next_trigger_at: string | null
          schedule_config: Json | null
          trigger_type: string
          updated_at: string | null
          webhook_config: Json | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          event_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          next_trigger_at?: string | null
          schedule_config?: Json | null
          trigger_type: string
          updated_at?: string | null
          webhook_config?: Json | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          event_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          next_trigger_at?: string | null
          schedule_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          webhook_config?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          actions: Json
          category: string | null
          conditions: Json | null
          config: Json
          cooldown_minutes: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          imo_id: string | null
          is_org_template: boolean
          last_modified_by: string | null
          max_runs_per_day: number | null
          max_runs_per_recipient: number | null
          name: string
          priority: number | null
          status: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json
          category?: string | null
          conditions?: Json | null
          config?: Json
          cooldown_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          imo_id?: string | null
          is_org_template?: boolean
          last_modified_by?: string | null
          max_runs_per_day?: number | null
          max_runs_per_recipient?: number | null
          name: string
          priority?: number | null
          status?: string | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          category?: string | null
          conditions?: Json | null
          config?: Json
          cooldown_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          imo_id?: string | null
          is_org_template?: boolean
          last_modified_by?: string | null
          max_runs_per_day?: number | null
          max_runs_per_recipient?: number | null
          name?: string
          priority?: number | null
          status?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_imo_id_fkey"
            columns: ["imo_id"]
            isOneToOne: false
            referencedRelation: "imos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_user_profiles: {
        Row: {
          agent_status: Database["public"]["Enums"]["agent_status"] | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          city: string | null
          contract_level: number | null
          created_at: string | null
          current_onboarding_phase: string | null
          custom_permissions: Json | null
          date_of_birth: string | null
          denial_reason: string | null
          denied_at: string | null
          email: string | null
          facebook_handle: string | null
          first_name: string | null
          hierarchy_depth: number | null
          hierarchy_path: string | null
          id: string | null
          instagram_url: string | null
          instagram_username: string | null
          is_admin: boolean | null
          last_name: string | null
          license_expiration: string | null
          license_number: string | null
          licensing_info: Json | null
          linkedin_url: string | null
          linkedin_username: string | null
          npn: string | null
          onboarding_completed_at: string | null
          onboarding_started_at: string | null
          onboarding_status: string | null
          personal_website: string | null
          phone: string | null
          pipeline_template_id: string | null
          profile_photo_url: string | null
          recruiter_id: string | null
          referral_source: string | null
          resident_state: string | null
          roles: string[] | null
          state: string | null
          street_address: string | null
          updated_at: string | null
          upline_id: string | null
          zip: string | null
        }
        Insert: {
          agent_status?: Database["public"]["Enums"]["agent_status"] | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          contract_level?: number | null
          created_at?: string | null
          current_onboarding_phase?: string | null
          custom_permissions?: Json | null
          date_of_birth?: string | null
          denial_reason?: string | null
          denied_at?: string | null
          email?: string | null
          facebook_handle?: string | null
          first_name?: string | null
          hierarchy_depth?: number | null
          hierarchy_path?: string | null
          id?: string | null
          instagram_url?: string | null
          instagram_username?: string | null
          is_admin?: boolean | null
          last_name?: string | null
          license_expiration?: string | null
          license_number?: string | null
          licensing_info?: Json | null
          linkedin_url?: string | null
          linkedin_username?: string | null
          npn?: string | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_status?: string | null
          personal_website?: string | null
          phone?: string | null
          pipeline_template_id?: string | null
          profile_photo_url?: string | null
          recruiter_id?: string | null
          referral_source?: string | null
          resident_state?: string | null
          roles?: string[] | null
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          upline_id?: string | null
          zip?: string | null
        }
        Update: {
          agent_status?: Database["public"]["Enums"]["agent_status"] | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          contract_level?: number | null
          created_at?: string | null
          current_onboarding_phase?: string | null
          custom_permissions?: Json | null
          date_of_birth?: string | null
          denial_reason?: string | null
          denied_at?: string | null
          email?: string | null
          facebook_handle?: string | null
          first_name?: string | null
          hierarchy_depth?: number | null
          hierarchy_path?: string | null
          id?: string | null
          instagram_url?: string | null
          instagram_username?: string | null
          is_admin?: boolean | null
          last_name?: string | null
          license_expiration?: string | null
          license_number?: string | null
          licensing_info?: Json | null
          linkedin_url?: string | null
          linkedin_username?: string | null
          npn?: string | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_status?: string | null
          personal_website?: string | null
          phone?: string | null
          pipeline_template_id?: string | null
          profile_photo_url?: string | null
          recruiter_id?: string | null
          referral_source?: string | null
          resident_state?: string | null
          roles?: string[] | null
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          upline_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_pipeline_template_id_fkey"
            columns: ["pipeline_template_id"]
            isOneToOne: false
            referencedRelation: "pipeline_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_upline_id_fkey"
            columns: ["upline_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_upline_id_fkey"
            columns: ["upline_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_upline_id_fkey"
            columns: ["upline_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_chargeback_summary: {
        Row: {
          at_risk_amount: number | null
          chargeback_rate_percentage: number | null
          charged_back_count: number | null
          high_risk_count: number | null
          total_advances: number | null
          total_chargeback_amount: number | null
          total_chargebacks: number | null
          total_earned: number | null
          user_id: string | null
        }
        Relationships: []
      }
      commission_earning_detail: {
        Row: {
          advance_amount: number | null
          advance_months: number | null
          annual_premium: number | null
          chargeback_amount: number | null
          chargeback_risk_level: string | null
          commission_id: string | null
          earned_amount: number | null
          effective_date: string | null
          is_fully_earned: boolean | null
          monthly_earning_rate: number | null
          months_paid: number | null
          months_remaining: number | null
          policy_id: string | null
          policy_status: string | null
          status: string | null
          unearned_amount: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_earning_status: {
        Row: {
          advance_amount: number | null
          advance_months: number | null
          chargeback_amount: number | null
          chargeback_date: string | null
          chargeback_reason: string | null
          chargeback_risk: string | null
          created_at: string | null
          earned_amount: number | null
          id: string | null
          is_fully_earned: boolean | null
          last_payment_date: string | null
          monthly_earning_rate: number | null
          months_paid: number | null
          months_remaining: number | null
          percentage_earned: number | null
          policy_id: string | null
          status: string | null
          type: string | null
          unearned_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          advance_amount?: number | null
          advance_months?: number | null
          chargeback_amount?: number | null
          chargeback_date?: string | null
          chargeback_reason?: string | null
          chargeback_risk?: never
          created_at?: string | null
          earned_amount?: number | null
          id?: string | null
          is_fully_earned?: never
          last_payment_date?: string | null
          monthly_earning_rate?: never
          months_paid?: number | null
          months_remaining?: never
          percentage_earned?: never
          policy_id?: string | null
          status?: string | null
          type?: string | null
          unearned_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          advance_amount?: number | null
          advance_months?: number | null
          chargeback_amount?: number | null
          chargeback_date?: string | null
          chargeback_reason?: string | null
          chargeback_risk?: never
          created_at?: string | null
          earned_amount?: number | null
          id?: string | null
          is_fully_earned?: never
          last_payment_date?: string | null
          monthly_earning_rate?: never
          months_paid?: number | null
          months_remaining?: never
          percentage_earned?: never
          policy_id?: string | null
          status?: string | null
          type?: string | null
          unearned_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_earning_summary: {
        Row: {
          at_risk_count: number | null
          avg_months_paid: number | null
          fully_earned_count: number | null
          portfolio_earned_percentage: number | null
          total_advances: number | null
          total_chargebacks: number | null
          total_commissions: number | null
          total_earned: number | null
          total_unearned: number | null
          user_id: string | null
        }
        Relationships: []
      }
      mv_carrier_performance: {
        Row: {
          active_policies: number | null
          avg_commission_amount: number | null
          avg_commission_rate_pct: number | null
          avg_premium: number | null
          cancelled_policies: number | null
          carrier_id: string | null
          carrier_name: string | null
          commission_count: number | null
          lapsed_policies: number | null
          latest_policy_update: string | null
          persistency_rate: number | null
          policies_13mo_plus: number | null
          total_commission_amount: number | null
          total_policies: number | null
          total_premium: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_client_ltv: {
        Row: {
          active_policies: number | null
          active_premium: number | null
          avg_commission_per_policy: number | null
          avg_policy_age_months: number | null
          avg_premium_per_policy: number | null
          cancelled_policies: number | null
          client_id: string | null
          client_name: string | null
          client_tier: string | null
          cross_sell_opportunity: boolean | null
          email: string | null
          first_policy_date: string | null
          lapsed_policies: number | null
          latest_policy_date: string | null
          paid_commission: number | null
          total_commission: number | null
          total_policies: number | null
          total_premium: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_cohort_retention: {
        Row: {
          active_premium: number | null
          cancelled_count: number | null
          cohort_month: string | null
          cohort_size: number | null
          lapsed_count: number | null
          months_since_issue: number | null
          retention_rate: number | null
          still_active: number | null
          total_premium: number | null
          user_id: string | null
        }
        Relationships: []
      }
      mv_commission_aging: {
        Row: {
          aging_bucket: string | null
          avg_at_risk: number | null
          bucket_order: number | null
          commission_count: number | null
          policy_count: number | null
          risk_level: string | null
          total_at_risk: number | null
          total_commission: number | null
          total_earned: number | null
          user_id: string | null
        }
        Relationships: []
      }
      mv_daily_production: {
        Row: {
          active_policies: number | null
          avg_premium: number | null
          cancelled_policies: number | null
          lapsed_policies: number | null
          max_premium: number | null
          min_premium: number | null
          production_date: string | null
          total_policies: number | null
          total_premium: number | null
          user_id: string | null
        }
        Relationships: []
      }
      mv_expense_summary: {
        Row: {
          avg_amount: number | null
          category: string | null
          expense_month: string | null
          expense_type: Database["public"]["Enums"]["expense_type"] | null
          max_amount: number | null
          min_amount: number | null
          recurring_amount: number | null
          recurring_count: number | null
          total_amount: number | null
          transaction_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      mv_product_performance: {
        Row: {
          active_policies: number | null
          avg_commission: number | null
          avg_commission_rate_pct: number | null
          avg_premium: number | null
          lapsed_policies: number | null
          persistency_rate: number | null
          product_id: string | null
          product_name: string | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          total_commission: number | null
          total_policies: number | null
          total_premium: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_production_velocity: {
        Row: {
          month_start: string | null
          monthly_avg_premium: number | null
          monthly_policies: number | null
          monthly_premium: number | null
          user_id: string | null
          week_start: string | null
          weekly_avg_premium: number | null
          weekly_policies: number | null
          weekly_premium: number | null
        }
        Relationships: []
      }
      override_commission_summary: {
        Row: {
          charged_back_amount: number | null
          earned_amount: number | null
          override_agent_id: string | null
          paid_amount: number | null
          pending_amount: number | null
          total_earned: number | null
          total_override_amount: number | null
          total_overrides: number | null
          total_unearned: number | null
        }
        Relationships: [
          {
            foreignKeyName: "override_commissions_override_agent_id_fkey"
            columns: ["override_agent_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_commissions_override_agent_id_fkey"
            columns: ["override_agent_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_commissions_override_agent_id_fkey"
            columns: ["override_agent_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unearned_commission_summary: {
        Row: {
          at_risk_count: number | null
          avg_months_paid: number | null
          fully_earned_count: number | null
          portfolio_earned_percentage: number | null
          total_advances: number | null
          total_chargebacks: number | null
          total_commissions: number | null
          total_earned: number | null
          total_unearned: number | null
          user_id: string | null
        }
        Relationships: []
      }
      user_management_view: {
        Row: {
          agent_status: Database["public"]["Enums"]["agent_status"] | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          city: string | null
          contract_level: number | null
          created_at: string | null
          current_onboarding_phase: string | null
          custom_permissions: Json | null
          date_of_birth: string | null
          denial_reason: string | null
          denied_at: string | null
          email: string | null
          facebook_handle: string | null
          first_name: string | null
          hierarchy_depth: number | null
          hierarchy_path: string | null
          id: string | null
          in_recruiting_pipeline: boolean | null
          in_users_list: boolean | null
          instagram_url: string | null
          instagram_username: string | null
          is_admin: boolean | null
          is_super_admin: boolean | null
          last_name: string | null
          license_expiration: string | null
          license_number: string | null
          licensing_info: Json | null
          linkedin_url: string | null
          linkedin_username: string | null
          npn: string | null
          onboarding_completed_at: string | null
          onboarding_started_at: string | null
          onboarding_status: string | null
          personal_website: string | null
          phone: string | null
          pipeline_template_id: string | null
          primary_role: string | null
          profile_photo_url: string | null
          recruiter_id: string | null
          referral_source: string | null
          resident_state: string | null
          roles: string[] | null
          state: string | null
          street_address: string | null
          updated_at: string | null
          upline_id: string | null
          zip: string | null
        }
        Insert: {
          agent_status?: Database["public"]["Enums"]["agent_status"] | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          contract_level?: number | null
          created_at?: string | null
          current_onboarding_phase?: string | null
          custom_permissions?: Json | null
          date_of_birth?: string | null
          denial_reason?: string | null
          denied_at?: string | null
          email?: string | null
          facebook_handle?: string | null
          first_name?: string | null
          hierarchy_depth?: number | null
          hierarchy_path?: string | null
          id?: string | null
          in_recruiting_pipeline?: never
          in_users_list?: never
          instagram_url?: string | null
          instagram_username?: string | null
          is_admin?: boolean | null
          is_super_admin?: boolean | null
          last_name?: string | null
          license_expiration?: string | null
          license_number?: string | null
          licensing_info?: Json | null
          linkedin_url?: string | null
          linkedin_username?: string | null
          npn?: string | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_status?: string | null
          personal_website?: string | null
          phone?: string | null
          pipeline_template_id?: string | null
          primary_role?: never
          profile_photo_url?: string | null
          recruiter_id?: string | null
          referral_source?: string | null
          resident_state?: string | null
          roles?: string[] | null
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          upline_id?: string | null
          zip?: string | null
        }
        Update: {
          agent_status?: Database["public"]["Enums"]["agent_status"] | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          contract_level?: number | null
          created_at?: string | null
          current_onboarding_phase?: string | null
          custom_permissions?: Json | null
          date_of_birth?: string | null
          denial_reason?: string | null
          denied_at?: string | null
          email?: string | null
          facebook_handle?: string | null
          first_name?: string | null
          hierarchy_depth?: number | null
          hierarchy_path?: string | null
          id?: string | null
          in_recruiting_pipeline?: never
          in_users_list?: never
          instagram_url?: string | null
          instagram_username?: string | null
          is_admin?: boolean | null
          is_super_admin?: boolean | null
          last_name?: string | null
          license_expiration?: string | null
          license_number?: string | null
          licensing_info?: Json | null
          linkedin_url?: string | null
          linkedin_username?: string | null
          npn?: string | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_status?: string | null
          personal_website?: string | null
          phone?: string | null
          pipeline_template_id?: string | null
          primary_role?: never
          profile_photo_url?: string | null
          recruiter_id?: string | null
          referral_source?: string | null
          resident_state?: string | null
          roles?: string[] | null
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          upline_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_pipeline_template_id_fkey"
            columns: ["pipeline_template_id"]
            isOneToOne: false
            referencedRelation: "pipeline_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_upline_id_fkey"
            columns: ["upline_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_upline_id_fkey"
            columns: ["upline_id"]
            isOneToOne: false
            referencedRelation: "user_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_upline_id_fkey"
            columns: ["upline_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          agent_code: string | null
          contract_comp_level: number | null
          created_at: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          license_number: string | null
          license_state: string | null
          name: string | null
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          agent_code?: never
          contract_comp_level?: never
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: never
          license_number?: never
          license_state?: never
          name?: never
          notes?: never
          phone?: never
          updated_at?: string | null
        }
        Update: {
          agent_code?: never
          contract_comp_level?: never
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: never
          license_number?: never
          license_state?: never
          name?: never
          notes?: never
          phone?: never
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_to_read_by: {
        Args: { message_id: string; user_id: string }
        Returns: undefined
      }
      admin_approve_user: {
        Args: { approver_id: string; target_user_id: string }
        Returns: boolean
      }
      admin_delete_user: { Args: { target_user_id: string }; Returns: Json }
      admin_deleteuser: { Args: { target_user_id: string }; Returns: Json }
      admin_deny_user: {
        Args: { approver_id: string; reason: string; target_user_id: string }
        Returns: boolean
      }
      admin_get_all_users: {
        Args: never
        Returns: {
          approval_status: string
          approved_at: string
          approved_by: string
          city: string
          contract_level: number
          created_at: string
          current_onboarding_phase: string
          denial_reason: string
          denied_at: string
          email: string
          first_name: string
          full_name: string
          hierarchy_depth: number
          hierarchy_path: string
          id: string
          instagram_url: string
          is_admin: boolean
          last_name: string
          license_expiration: string
          license_number: string
          linkedin_url: string
          npn: string
          onboarding_status: string
          phone: string
          resident_state: string
          roles: string[]
          state: string
          street_address: string
          updated_at: string
          upline_id: string
          zip: string
        }[]
      }
      admin_get_pending_users: {
        Args: never
        Returns: {
          approval_status: string
          approved_at: string
          approved_by: string
          contract_level: number
          created_at: string
          denial_reason: string
          denied_at: string
          email: string
          full_name: string
          hierarchy_depth: number
          hierarchy_path: string
          id: string
          is_admin: boolean
          roles: string[]
          updated_at: string
          upline_id: string
        }[]
      }
      admin_get_user_by_id: { Args: { p_user_id: string }; Returns: Json }
      admin_get_user_profile: {
        Args: { target_user_id: string }
        Returns: {
          approval_status: string
          approved_at: string
          approved_by: string
          contract_level: number
          created_at: string
          denial_reason: string
          denied_at: string
          email: string
          full_name: string
          hierarchy_depth: number
          hierarchy_path: string
          id: string
          is_admin: boolean
          roles: string[]
          updated_at: string
          upline_id: string
        }[]
      }
      admin_set_admin_role: {
        Args: { new_is_admin: boolean; target_user_id: string }
        Returns: boolean
      }
      admin_set_pending_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      admin_update_user: {
        Args: { p_updates: Json; p_user_id: string }
        Returns: Json
      }
      approve_agency_request: {
        Args: { p_request_id: string }
        Returns: string
      }
      approve_join_request: {
        Args: {
          p_agency_id?: string
          p_request_id: string
          p_upline_id?: string
        }
        Returns: undefined
      }
      assign_user_role: {
        Args: {
          p_contract_level?: number
          p_is_recruit?: boolean
          p_requested_role?: string
          p_user_id: string
        }
        Returns: string[]
      }
      calculate_chargeback_on_policy_lapse: {
        Args: { p_lapse_date?: string; p_policy_id: string }
        Returns: Json
      }
      calculate_client_age: { Args: { birth_date: string }; Returns: number }
      calculate_commission_advance: {
        Args: {
          p_advance_months: number
          p_annual_premium: number
          p_commission_percentage: number
          p_contract_level?: number
        }
        Returns: number
      }
      calculate_earned_amount: {
        Args: {
          p_advance_months: number
          p_amount: number
          p_months_paid: number
        }
        Returns: number
      }
      calculate_months_paid: {
        Args: { p_effective_date: string; p_end_date?: string }
        Returns: number
      }
      calculate_next_delivery: {
        Args: {
          p_day_of_month: number
          p_day_of_week: number
          p_frequency: Database["public"]["Enums"]["report_frequency"]
          p_from_date?: string
          p_preferred_time: string
        }
        Returns: string
      }
      calculate_next_run_time: {
        Args: {
          p_day_of_month?: number
          p_day_of_week?: number
          p_from_time?: string
          p_run_time: string
          p_schedule_type: string
          p_timezone: string
        }
        Returns: string
      }
      calculate_unearned_amount: {
        Args: {
          p_advance_months: number
          p_amount: number
          p_months_paid: number
        }
        Returns: number
      }
      can_manage_workflows: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      can_request_agency: { Args: never; Returns: boolean }
      can_submit_join_request: { Args: never; Returns: boolean }
      can_workflow_run: {
        Args: { p_recipient_id?: string; p_workflow_id: string }
        Returns: boolean
      }
      check_auth_identity: {
        Args: { check_email: string }
        Returns: {
          created_at: string
          email: string
          id: string
          provider: string
          user_id: string
        }[]
      }
      check_email_exists: {
        Args: { target_email: string }
        Returns: {
          email_exists: boolean
          error_message: string
          user_id: string
        }[]
      }
      check_email_quota: {
        Args: { p_limit?: number; p_provider: string; p_user_id: string }
        Returns: boolean
      }
      check_is_imo_admin: { Args: never; Returns: boolean }
      check_team_size_limit: { Args: { p_user_id: string }; Returns: Json }
      check_user_template_limit: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      check_workflow_email_rate_limit: {
        Args: {
          p_recipient_count?: number
          p_recipient_email: string
          p_user_id: string
          p_workflow_id: string
        }
        Returns: Json
      }
      cleanup_expired_invitations: { Args: never; Returns: number }
      cleanup_old_audit_logs: {
        Args: never
        Returns: {
          deleted_financial: number
          deleted_non_financial: number
          total_deleted: number
        }[]
      }
      cleanup_old_reports: {
        Args: { max_reports_per_user?: number }
        Returns: number
      }
      clone_org_template: {
        Args: { p_new_name: string; p_template_id: string }
        Returns: string
      }
      complete_scheduled_delivery: {
        Args: {
          p_delivery_id: string
          p_error_message?: string
          p_mailgun_message_id?: string
          p_schedule_id: string
          p_success: boolean
        }
        Returns: boolean
      }
      create_alert_notification_safe: {
        Args: {
          p_comparison: string
          p_current_value: number
          p_entity_id?: string
          p_entity_type?: string
          p_message: string
          p_metric: string
          p_rule_id: string
          p_threshold_value: number
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_alert_rule: {
        Args: {
          p_applies_to_downlines?: boolean
          p_applies_to_self?: boolean
          p_applies_to_team?: boolean
          p_comparison?: Database["public"]["Enums"]["alert_comparison"]
          p_cooldown_hours?: number
          p_description?: string
          p_metric?: Database["public"]["Enums"]["alert_metric"]
          p_name: string
          p_notify_email?: boolean
          p_notify_in_app?: boolean
          p_threshold_unit?: string
          p_threshold_value?: number
        }
        Returns: {
          agency_id: string | null
          applies_to_downlines: boolean
          applies_to_self: boolean
          applies_to_team: boolean
          comparison: Database["public"]["Enums"]["alert_comparison"]
          consecutive_triggers: number
          cooldown_hours: number
          created_at: string
          description: string | null
          id: string
          imo_id: string | null
          is_active: boolean
          last_triggered_at: string | null
          metric: Database["public"]["Enums"]["alert_metric"]
          name: string
          notify_email: boolean
          notify_in_app: boolean
          owner_id: string
          threshold_unit: string | null
          threshold_value: number
          trigger_count: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "alert_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_org_workflow_template: {
        Args: {
          p_actions: Json
          p_category: string
          p_conditions: Json
          p_config: Json
          p_cooldown_minutes?: number
          p_description: string
          p_max_runs_per_day?: number
          p_max_runs_per_recipient?: number
          p_name: string
          p_priority?: number
          p_trigger_type: string
        }
        Returns: string
      }
      create_scheduled_report: {
        Args: {
          p_day_of_month?: number
          p_day_of_week?: number
          p_export_format?: string
          p_frequency: Database["public"]["Enums"]["report_frequency"]
          p_include_charts?: boolean
          p_include_insights?: boolean
          p_include_summary?: boolean
          p_preferred_time?: string
          p_recipients?: Json
          p_report_config?: Json
          p_report_type: string
          p_schedule_name: string
        }
        Returns: string
      }
      create_workflow_run: {
        Args: { context_param?: Json; workflow_id_param: string }
        Returns: string
      }
      delete_alert_rule: { Args: { p_rule_id: string }; Returns: boolean }
      delete_orphan_identity: { Args: { del_email: string }; Returns: Json }
      email_subject_hash: { Args: { subject: string }; Returns: string }
      ensure_system_labels: { Args: { p_user_id: string }; Returns: undefined }
      expire_old_invitations: {
        Args: never
        Returns: {
          expired_count: number
        }[]
      }
      get_agencies_for_join: {
        Args: { p_imo_id: string }
        Returns: {
          code: string
          description: string
          id: string
          name: string
        }[]
      }
      get_agency_dashboard_metrics: {
        Args: { p_agency_id?: string }
        Returns: {
          active_policies: number
          agency_id: string
          agency_name: string
          agent_count: number
          avg_production_per_agent: number
          imo_id: string
          top_producer_id: string
          top_producer_name: string
          top_producer_premium: number
          total_annual_premium: number
          total_commissions_ytd: number
          total_earned_ytd: number
          total_unearned: number
        }[]
      }
      get_agency_metrics: { Args: { p_agency_id: string }; Returns: Json }
      get_agency_override_summary: {
        Args: { p_agency_id?: string }
        Returns: {
          agency_id: string
          agency_name: string
          avg_override_per_policy: number
          chargeback_amount: number
          earned_amount: number
          paid_amount: number
          pending_amount: number
          top_earner_amount: number
          top_earner_id: string
          top_earner_name: string
          total_override_amount: number
          total_override_count: number
          unique_downlines: number
          unique_uplines: number
        }[]
      }
      get_agency_production_by_agent: {
        Args: { p_agency_id?: string }
        Returns: {
          active_policies: number
          agent_email: string
          agent_id: string
          agent_name: string
          commissions_ytd: number
          contract_level: number
          earned_ytd: number
          joined_date: string
          pct_of_agency_production: number
          total_annual_premium: number
          unearned_amount: number
        }[]
      }
      get_agency_recruiting_summary: {
        Args: { p_agency_id: string }
        Returns: Json
      }
      get_alert_rule_history: {
        Args: { p_limit?: number; p_rule_id: string }
        Returns: {
          affected_entity_id: string
          affected_entity_type: string
          affected_user_id: string
          affected_user_name: string
          comparison: Database["public"]["Enums"]["alert_comparison"]
          current_value: number
          evaluated_at: string
          id: string
          notification_id: string
          threshold_value: number
          triggered: boolean
        }[]
      }
      get_alertable_metrics: {
        Args: never
        Returns: {
          available_for_downlines: boolean
          available_for_self: boolean
          available_for_team: boolean
          default_comparison: string
          default_threshold: number
          default_unit: string
          description: string
          label: string
          metric: string
        }[]
      }
      get_at_risk_commissions: {
        Args: { p_risk_threshold?: number; p_user_id: string }
        Returns: {
          advance_amount: number
          commission_id: string
          earned_amount: number
          effective_date: string
          months_paid: number
          policy_id: string
          policy_status: string
          risk_level: string
          unearned_amount: number
        }[]
      }
      get_audit_action_types: {
        Args: never
        Returns: {
          action_type: string
          count: number
        }[]
      }
      get_audit_log_detail: {
        Args: { p_audit_id: string }
        Returns: {
          action: Database["public"]["Enums"]["audit_action"]
          action_type: string
          agency_id: string
          changed_fields: string[]
          created_at: string
          description: string
          id: string
          imo_id: string
          metadata: Json
          new_data: Json
          old_data: Json
          performed_by: string
          performed_by_email: string
          performed_by_name: string
          record_id: string
          source: Database["public"]["Enums"]["audit_source"]
          table_name: string
        }[]
      }
      get_audit_logs: {
        Args: {
          p_action?: string
          p_action_type?: string
          p_end_date?: string
          p_page?: number
          p_page_size?: number
          p_performed_by?: string
          p_record_id?: string
          p_search?: string
          p_start_date?: string
          p_table_name?: string
        }
        Returns: {
          action: Database["public"]["Enums"]["audit_action"]
          action_type: string
          agency_id: string
          changed_fields: string[]
          created_at: string
          description: string
          id: string
          imo_id: string
          performed_by: string
          performed_by_email: string
          performed_by_name: string
          record_id: string
          source: Database["public"]["Enums"]["audit_source"]
          table_name: string
          total_count: number
        }[]
      }
      get_audit_performers: {
        Args: never
        Returns: {
          action_count: number
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_audit_tables: {
        Args: never
        Returns: {
          count: number
          table_name: string
        }[]
      }
      get_available_imos_for_join: {
        Args: never
        Returns: {
          code: string
          description: string
          id: string
          name: string
        }[]
      }
      get_clients_with_stats: {
        Args: never
        Returns: {
          active_policy_count: number
          address: string
          avg_premium: number
          created_at: string
          date_of_birth: string
          email: string
          id: string
          last_policy_date: string
          name: string
          notes: string
          phone: string
          policy_count: number
          status: string
          total_premium: number
          updated_at: string
          user_id: string
        }[]
      }
      get_commissions_for_threshold_check: {
        Args: {
          p_end_date: string
          p_rule_id: string
          p_start_date: string
          p_user_ids: string[]
        }
        Returns: {
          agent_id: string
          total_commission: number
        }[]
      }
      get_current_user_hierarchy_path: { Args: never; Returns: string }
      get_current_user_profile_id: { Args: never; Returns: string }
      get_downline_clients_with_stats: {
        Args: never
        Returns: {
          active_policy_count: number
          address: string
          avg_premium: number
          created_at: string
          date_of_birth: string
          email: string
          id: string
          last_policy_date: string
          name: string
          notes: string
          owner_name: string
          phone: string
          policy_count: number
          status: string
          total_premium: number
          updated_at: string
          user_id: string
        }[]
      }
      get_downline_expense_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          business_amount: number
          expense_count: number
          owner_name: string
          personal_amount: number
          tax_deductible_amount: number
          total_amount: number
          user_id: string
        }[]
      }
      get_downline_expenses: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          expense_type: Database["public"]["Enums"]["expense_type"]
          id: string
          is_recurring: boolean
          is_tax_deductible: boolean
          name: string
          owner_name: string
          user_id: string
        }[]
      }
      get_downline_ids: {
        Args: { target_user_id: string }
        Returns: {
          downline_id: string
        }[]
      }
      get_downline_targets: {
        Args: never
        Returns: {
          annual_income_target: number
          annual_policies_target: number
          avg_premium_target: number
          created_at: string
          expense_ratio_target: number
          id: string
          monthly_expense_target: number
          monthly_income_target: number
          monthly_policies_target: number
          owner_name: string
          persistency_13_month_target: number
          persistency_25_month_target: number
          quarterly_income_target: number
          updated_at: string
          user_id: string
        }[]
      }
      get_downline_with_emails: {
        Args: { p_max_count?: number; p_user_id: string }
        Returns: {
          email: string
          id: string
        }[]
      }
      get_due_alert_rules: {
        Args: { p_batch_size?: number; p_worker_id?: string }
        Returns: {
          agency_id: string
          applies_to_downlines: boolean
          applies_to_self: boolean
          applies_to_team: boolean
          comparison: Database["public"]["Enums"]["alert_comparison"]
          cooldown_hours: number
          id: string
          imo_id: string
          last_triggered_at: string
          metric: Database["public"]["Enums"]["alert_metric"]
          notify_email: boolean
          notify_in_app: boolean
          owner_id: string
          threshold_unit: string
          threshold_value: number
        }[]
      }
      get_due_scheduled_reports: {
        Args: never
        Returns: {
          agency_id: string
          day_of_month: number
          day_of_week: number
          export_format: string
          frequency: Database["public"]["Enums"]["report_frequency"]
          id: string
          imo_id: string
          include_charts: boolean
          include_insights: boolean
          include_summary: boolean
          owner_id: string
          preferred_time: string
          recipients: Json
          report_config: Json
          report_type: string
          schedule_name: string
        }[]
      }
      get_eligible_recipients: {
        Args: { p_agency_id?: string; p_imo_id?: string }
        Returns: {
          agency_name: string
          email: string
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_imo_admin: { Args: { p_imo_id: string }; Returns: string }
      get_imo_clients_with_stats: {
        Args: never
        Returns: {
          active_policy_count: number
          address: string
          avg_premium: number
          created_at: string
          date_of_birth: string
          email: string
          id: string
          last_policy_date: string
          name: string
          notes: string
          owner_name: string
          phone: string
          policy_count: number
          status: string
          total_premium: number
          updated_at: string
          user_id: string
        }[]
      }
      get_imo_dashboard_metrics: {
        Args: never
        Returns: {
          agency_count: number
          agent_count: number
          avg_production_per_agent: number
          imo_id: string
          imo_name: string
          total_active_policies: number
          total_annual_premium: number
          total_commissions_ytd: number
          total_earned_ytd: number
          total_unearned: number
        }[]
      }
      get_imo_expense_by_category: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          avg_amount: number
          category: string
          expense_count: number
          total_amount: number
        }[]
      }
      get_imo_expense_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          agency_name: string
          business_amount: number
          expense_count: number
          owner_name: string
          personal_amount: number
          tax_deductible_amount: number
          total_amount: number
          user_id: string
        }[]
      }
      get_imo_metrics: { Args: { p_imo_id: string }; Returns: Json }
      get_imo_override_summary: {
        Args: never
        Returns: {
          avg_override_per_policy: number
          chargeback_amount: number
          earned_amount: number
          imo_id: string
          imo_name: string
          paid_amount: number
          pending_amount: number
          total_override_amount: number
          total_override_count: number
          unique_downlines: number
          unique_uplines: number
        }[]
      }
      get_imo_production_by_agency: {
        Args: never
        Returns: {
          active_policies: number
          agency_code: string
          agency_id: string
          agency_name: string
          agent_count: number
          avg_production: number
          commissions_ytd: number
          owner_name: string
          pct_of_imo_production: number
          total_annual_premium: number
        }[]
      }
      get_imo_recruiting_summary: { Args: { p_imo_id: string }; Returns: Json }
      get_imo_targets: {
        Args: never
        Returns: {
          agency_name: string
          annual_income_target: number
          annual_policies_target: number
          avg_premium_target: number
          created_at: string
          expense_ratio_target: number
          id: string
          monthly_expense_target: number
          monthly_income_target: number
          monthly_policies_target: number
          owner_name: string
          persistency_13_month_target: number
          persistency_25_month_target: number
          quarterly_income_target: number
          updated_at: string
          user_id: string
        }[]
      }
      get_imo_workflow_templates: {
        Args: never
        Returns: {
          actions: Json
          category: string
          conditions: Json
          config: Json
          cooldown_minutes: number
          created_at: string
          created_by: string
          created_by_name: string
          description: string
          id: string
          max_runs_per_day: number
          max_runs_per_recipient: number
          name: string
          priority: number
          status: string
          trigger_type: string
          updated_at: string
        }[]
      }
      get_license_expirations_for_check: {
        Args: {
          p_rule_id: string
          p_user_ids: string[]
          p_warning_days: number
        }
        Returns: {
          days_until_expiration: number
          license_expiration: string
          user_id: string
          user_name: string
        }[]
      }
      get_message_stats: { Args: { p_user_id: string }; Returns: Json }
      get_my_agency_id: { Args: never; Returns: string }
      get_my_alert_rules: {
        Args: never
        Returns: {
          agency_id: string
          applies_to_downlines: boolean
          applies_to_self: boolean
          applies_to_team: boolean
          comparison: Database["public"]["Enums"]["alert_comparison"]
          cooldown_hours: number
          created_at: string
          description: string
          id: string
          imo_id: string
          is_active: boolean
          last_triggered_at: string
          metric: Database["public"]["Enums"]["alert_metric"]
          name: string
          notify_email: boolean
          notify_in_app: boolean
          owner_id: string
          owner_name: string
          threshold_unit: string
          threshold_value: number
          trigger_count: number
          updated_at: string
        }[]
      }
      get_my_imo_id: { Args: never; Returns: string }
      get_my_notification_preferences: {
        Args: never
        Returns: {
          browser_push_enabled: boolean | null
          browser_push_subscription: Json | null
          created_at: string | null
          email_digest_enabled: boolean | null
          email_digest_frequency: string | null
          email_digest_time: string | null
          email_digest_timezone: string | null
          id: string
          in_app_enabled: boolean | null
          last_digest_sent_at: string | null
          notify_on_click: boolean | null
          notify_on_open: boolean | null
          notify_on_reply: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_scheduled_reports: {
        Args: never
        Returns: {
          consecutive_failures: number
          created_at: string
          day_of_month: number
          day_of_week: number
          export_format: string
          failed_deliveries: number
          frequency: Database["public"]["Enums"]["report_frequency"]
          id: string
          include_charts: boolean
          include_insights: boolean
          include_summary: boolean
          is_active: boolean
          last_delivery: string
          next_delivery: string
          preferred_time: string
          recipients: Json
          report_config: Json
          report_type: string
          schedule_name: string
          successful_deliveries: number
          total_deliveries: number
        }[]
      }
      get_or_create_usage_tracking: {
        Args: { p_metric: string; p_user_id: string }
        Returns: {
          count: number
          created_at: string
          id: string
          metric: string
          overage_amount: number
          overage_charged: boolean
          period_end: string
          period_start: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "usage_tracking"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_overrides_by_agency: {
        Args: never
        Returns: {
          agency_code: string
          agency_id: string
          agency_name: string
          earned_amount: number
          override_count: number
          paid_amount: number
          pct_of_imo_overrides: number
          pending_amount: number
          total_amount: number
        }[]
      }
      get_overrides_by_agent: {
        Args: { p_agency_id?: string }
        Returns: {
          agent_email: string
          agent_id: string
          agent_name: string
          avg_per_override: number
          earned_amount: number
          override_count: number
          paid_amount: number
          pct_of_agency_overrides: number
          pending_amount: number
          total_amount: number
        }[]
      }
      get_pending_agency_request_count: { Args: never; Returns: number }
      get_pending_join_request_count: { Args: never; Returns: number }
      get_pipeline_template_for_user: {
        Args: {
          p_agent_status: Database["public"]["Enums"]["agent_status"]
          p_roles: string[]
        }
        Returns: string
      }
      get_plan_by_lemon_variant: {
        Args: { p_variant_id: string }
        Returns: {
          analytics_sections: string[]
          created_at: string
          description: string | null
          display_name: string
          email_limit: number
          features: Json
          id: string
          is_active: boolean
          lemon_product_id: string | null
          lemon_variant_id_annual: string | null
          lemon_variant_id_monthly: string | null
          name: string
          price_annual: number
          price_monthly: number
          sms_enabled: boolean
          sort_order: number
          team_size_limit: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscription_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_policies_for_lapse_check: {
        Args: {
          p_rule_id: string
          p_user_ids: string[]
          p_warning_days: number
        }
        Returns: {
          agent_id: string
          days_until_lapse: number
          lapse_date: string
          policy_id: string
          policy_number: string
        }[]
      }
      get_policies_paginated: {
        Args: {
          p_carrier_id?: string
          p_cursor?: string
          p_limit?: number
          p_product_id?: string
          p_status?: string
          p_user_id?: string
        }
        Returns: {
          annual_premium: number
          carrier_id: string
          carrier_name: string
          client: Json
          commission_percentage: number
          created_at: string
          effective_date: string
          id: string
          payment_frequency: Database["public"]["Enums"]["payment_frequency"]
          policy_number: string
          product: Database["public"]["Enums"]["product_type"]
          product_id: string
          product_name: string
          status: Database["public"]["Enums"]["policy_status"]
          user_id: string
        }[]
      }
      get_policy_count: {
        Args: {
          p_carrier_id?: string
          p_product_id?: string
          p_status?: string
          p_user_id?: string
        }
        Returns: number
      }
      get_policy_counts_for_check: {
        Args: {
          p_end_date: string
          p_rule_id: string
          p_start_date: string
          p_user_ids: string[]
        }
        Returns: {
          agent_id: string
          policy_count: number
        }[]
      }
      get_product_commission_rate: {
        Args: {
          p_comp_level: Database["public"]["Enums"]["comp_level"]
          p_date?: string
          p_product_id: string
        }
        Returns: number
      }
      get_recruiting_by_agency: { Args: { p_imo_id: string }; Returns: Json }
      get_recruiting_by_recruiter: {
        Args: { p_agency_id: string }
        Returns: Json
      }
      get_role_permissions_with_inheritance: {
        Args: { p_role_id: string }
        Returns: {
          inherited_from_role_name: string
          permission_action: string
          permission_code: string
          permission_description: string
          permission_id: string
          permission_resource: string
          permission_scope: string
          permission_type: string
        }[]
      }
      get_schedule_delivery_history: {
        Args: { p_limit?: number; p_schedule_id: string }
        Returns: {
          created_at: string
          delivered_at: string
          error_message: string
          id: string
          recipients_sent: Json
          report_period_end: string
          report_period_start: string
          status: string
        }[]
      }
      get_upline_chain: {
        Args: { p_max_depth?: number; p_user_id: string }
        Returns: {
          depth: number
          email: string
          id: string
        }[]
      }
      get_user_commission_profile: {
        Args: { p_lookback_months?: number; p_user_id: string }
        Returns: {
          calculated_at: string
          contract_level: number
          data_quality: string
          product_breakdown: Json
          simple_avg_rate: number
          weighted_avg_rate: number
        }[]
      }
      get_user_permissions: {
        Args: { target_user_id: string }
        Returns: {
          code: string
        }[]
      }
      get_user_profile: {
        Args: { user_id: string }
        Returns: {
          agent_code: string
          contract_comp_level: number
          created_at: string
          email: string
          id: string
          is_active: boolean
          license_number: string
          license_state: string
          name: string
          notes: string
          phone: string
          updated_at: string
        }[]
      }
      get_user_subscription_tier: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_upline_and_recruiter_ids: {
        Args: { user_id: string }
        Returns: {
          recruiter_id: string
          upline_id: string
        }[]
      }
      get_valid_users_for_rule: {
        Args: { p_rule_id: string; p_user_ids: string[] }
        Returns: string[]
      }
      get_workflow_email_usage: { Args: { p_user_id: string }; Returns: Json }
      getuser_commission_profile: {
        Args: { p_lookback_months?: number; puser_id: string }
        Returns: {
          calculated_at: string
          contract_level: number
          data_quality: string
          product_breakdown: Json
          simple_avg_rate: number
          weighted_avg_rate: number
        }[]
      }
      hard_delete_user: {
        Args: {
          p_confirm_text: string
          p_deleted_by: string
          p_user_id: string
        }
        Returns: Json
      }
      has_downlines: { Args: never; Returns: boolean }
      has_permission: {
        Args: { permission_code: string; target_user_id: string }
        Returns: boolean
      }
      has_role:
        | { Args: { role_to_check: string }; Returns: boolean }
        | {
            Args: { role_name: string; target_user_id: string }
            Returns: boolean
          }
      hierarchy_path_array: { Args: { path: string }; Returns: string[] }
      increment_email_quota: {
        Args: { p_provider: string; p_user_id: string }
        Returns: number
      }
      increment_usage: {
        Args: { p_increment?: number; p_metric: string; p_user_id: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user:
        | { Args: never; Returns: boolean }
        | { Args: { target_user_id?: string }; Returns: boolean }
      is_agency_owner:
        | { Args: never; Returns: boolean }
        | { Args: { p_agency_id?: string }; Returns: boolean }
      is_agency_owner_of: {
        Args: { target_agency_id: string }
        Returns: boolean
      }
      is_caller_admin: { Args: never; Returns: boolean }
      is_contact_favorited: {
        Args: {
          p_client_id?: string
          p_contact_user_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_direct_downline_of_owner: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_imo_admin: { Args: never; Returns: boolean }
      is_same_agency: { Args: { target_user_id: string }; Returns: boolean }
      is_same_imo: { Args: { target_user_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_upline_of: { Args: { target_user_id: string }; Returns: boolean }
      is_user_approved: { Args: never; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: Database["public"]["Enums"]["audit_action"]
          p_action_type: string
          p_changed_fields?: string[]
          p_description?: string
          p_metadata?: Json
          p_new_data?: Json
          p_old_data?: Json
          p_record_id: string
          p_table_name: string
        }
        Returns: string
      }
      lookup_user_by_email: {
        Args: { p_email: string }
        Returns: {
          email: string
          id: string
          is_approved: boolean
          upline_id: string
        }[]
      }
      mark_policy_cancelled: {
        Args: {
          p_cancellation_date?: string
          p_cancellation_reason?: string
          p_policy_id: string
        }
        Returns: Json
      }
      mark_policy_lapsed: {
        Args: {
          p_lapse_date?: string
          p_lapse_reason?: string
          p_policy_id: string
        }
        Returns: Json
      }
      mark_thread_read: { Args: { p_thread_id: string }; Returns: undefined }
      normalize_email_subject: { Args: { subject: string }; Returns: string }
      process_lemon_subscription_event: {
        Args: {
          p_billing_interval: string
          p_cancelled_at: string
          p_current_period_end: string
          p_current_period_start: string
          p_event_data: Json
          p_event_name: string
          p_event_type: string
          p_lemon_customer_id: string
          p_lemon_event_id: string
          p_lemon_order_id: string
          p_lemon_subscription_id: string
          p_lemon_variant_id: string
          p_status: string
          p_trial_ends_at: string
          p_user_id: string
        }
        Returns: string
      }
      process_pending_workflow_runs: {
        Args: never
        Returns: {
          message: string
          run_id: string
          status: string
          workflow_id: string
        }[]
      }
      process_workflow_trigger: {
        Args: { p_context: Json; p_event_name: string }
        Returns: undefined
      }
      record_alert_evaluation: {
        Args: {
          p_affected_entity_id?: string
          p_affected_entity_type?: string
          p_affected_user_id?: string
          p_current_value: number
          p_evaluation_context?: Json
          p_notification_id?: string
          p_rule_id: string
          p_triggered: boolean
        }
        Returns: {
          affected_entity_id: string | null
          affected_entity_type: string | null
          affected_user_id: string | null
          comparison: Database["public"]["Enums"]["alert_comparison"]
          current_value: number | null
          evaluated_at: string
          evaluation_context: Json | null
          id: string
          notification_id: string | null
          rule_id: string
          threshold_value: number
          triggered: boolean
        }
        SetofOptions: {
          from: "*"
          to: "alert_rule_evaluations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_email_click: {
        Args: {
          p_city?: string
          p_country?: string
          p_device_type?: string
          p_ip_address?: unknown
          p_link_tracking_id: string
          p_user_agent?: string
        }
        Returns: string
      }
      record_email_open: {
        Args: {
          p_city?: string
          p_country?: string
          p_device_type?: string
          p_ip_address?: unknown
          p_tracking_id: string
          p_user_agent?: string
        }
        Returns: boolean
      }
      record_lemon_payment: {
        Args: {
          p_amount: number
          p_billing_reason: string
          p_card_brand: string
          p_card_last_four: string
          p_currency: string
          p_discount_amount: number
          p_invoice_url: string
          p_lemon_invoice_id: string
          p_lemon_order_id: string
          p_lemon_subscription_id: string
          p_paid_at: string
          p_receipt_url: string
          p_status: string
          p_tax_amount: number
          p_user_id: string
        }
        Returns: string
      }
      record_workflow_email: {
        Args: {
          p_error_message?: string
          p_recipient_email: string
          p_recipient_type: string
          p_success?: boolean
          p_user_id: string
          p_workflow_id: string
        }
        Returns: string
      }
      refresh_all_report_materialized_views: { Args: never; Returns: undefined }
      regenerate_override_commissions: {
        Args: { p_policy_id: string }
        Returns: number
      }
      reject_agency_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      reject_join_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      release_alert_rules: { Args: { p_rule_ids: string[] }; Returns: number }
      resolve_join_request_approver: {
        Args: { p_agency_id?: string; p_imo_id: string; p_upline_id?: string }
        Returns: string
      }
      safe_uuid_from_text: { Args: { input: string }; Returns: string }
      save_workflow_as_org_template: {
        Args: { p_workflow_id: string }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      test_rls_for_user: {
        Args: { test_user_id: string }
        Returns: {
          policy_number: string
          user_id: string
          would_pass: boolean
        }[]
      }
      toggle_alert_rule_active: {
        Args: { p_is_active: boolean; p_rule_id: string }
        Returns: {
          agency_id: string | null
          applies_to_downlines: boolean
          applies_to_self: boolean
          applies_to_team: boolean
          comparison: Database["public"]["Enums"]["alert_comparison"]
          consecutive_triggers: number
          cooldown_hours: number
          created_at: string
          description: string | null
          id: string
          imo_id: string | null
          is_active: boolean
          last_triggered_at: string | null
          metric: Database["public"]["Enums"]["alert_metric"]
          name: string
          notify_email: boolean
          notify_in_app: boolean
          owner_id: string
          threshold_unit: string | null
          threshold_value: number
          trigger_count: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "alert_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      trigger_workflows_for_event: {
        Args: { context_data: Json; event_name_param: string }
        Returns: undefined
      }
      update_alert_rule: {
        Args: {
          p_applies_to_downlines?: boolean
          p_applies_to_self?: boolean
          p_applies_to_team?: boolean
          p_cooldown_hours?: number
          p_description?: string
          p_is_active?: boolean
          p_name?: string
          p_notify_email?: boolean
          p_notify_in_app?: boolean
          p_rule_id: string
          p_threshold_unit?: string
          p_threshold_value?: number
        }
        Returns: {
          agency_id: string | null
          applies_to_downlines: boolean
          applies_to_self: boolean
          applies_to_team: boolean
          comparison: Database["public"]["Enums"]["alert_comparison"]
          consecutive_triggers: number
          cooldown_hours: number
          created_at: string
          description: string | null
          id: string
          imo_id: string | null
          is_active: boolean
          last_triggered_at: string | null
          metric: Database["public"]["Enums"]["alert_metric"]
          name: string
          notify_email: boolean
          notify_in_app: boolean
          owner_id: string
          threshold_unit: string | null
          threshold_value: number
          trigger_count: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "alert_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_notification_preferences: {
        Args: {
          p_browser_push_enabled?: boolean
          p_email_digest_enabled?: boolean
          p_email_digest_frequency?: string
          p_email_digest_time?: string
          p_email_digest_timezone?: string
          p_in_app_enabled?: boolean
          p_quiet_hours_enabled?: boolean
          p_quiet_hours_end?: string
          p_quiet_hours_start?: string
        }
        Returns: {
          browser_push_enabled: boolean | null
          browser_push_subscription: Json | null
          created_at: string | null
          email_digest_enabled: boolean | null
          email_digest_frequency: string | null
          email_digest_time: string | null
          email_digest_timezone: string | null
          id: string
          in_app_enabled: boolean | null
          last_digest_sent_at: string | null
          notify_on_click: boolean | null
          notify_on_open: boolean | null
          notify_on_reply: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_override_earned_amount: {
        Args: { p_months_paid: number; p_policy_id: string }
        Returns: undefined
      }
      update_scheduled_report: {
        Args: {
          p_day_of_month?: number
          p_day_of_week?: number
          p_export_format?: string
          p_frequency?: Database["public"]["Enums"]["report_frequency"]
          p_include_charts?: boolean
          p_include_insights?: boolean
          p_include_summary?: boolean
          p_is_active?: boolean
          p_preferred_time?: string
          p_recipients?: Json
          p_report_config?: Json
          p_schedule_id: string
          p_schedule_name?: string
        }
        Returns: boolean
      }
      update_user_metadata: {
        Args: { metadata: Json; user_id: string }
        Returns: undefined
      }
      user_has_analytics_section: {
        Args: { p_section: string; p_user_id: string }
        Returns: boolean
      }
      user_has_feature: {
        Args: { p_feature: string; p_user_id: string }
        Returns: boolean
      }
      validate_invitation_acceptance: {
        Args: { p_invitation_id: string; p_invitee_id: string }
        Returns: {
          error_message: string
          valid: boolean
        }[]
      }
      validate_invitation_eligibility: {
        Args: { p_invitee_email: string; p_inviter_id: string }
        Returns: Json
      }
      validate_schedule_recipients: {
        Args: { p_agency_id: string; p_imo_id: string; p_recipients: Json }
        Returns: boolean
      }
    }
    Enums: {
      agent_status: "unlicensed" | "licensed" | "not_applicable"
      alert_comparison: "lt" | "lte" | "gt" | "gte" | "eq"
      alert_metric:
        | "policy_lapse_warning"
        | "target_miss_risk"
        | "commission_threshold"
        | "new_policy_count"
        | "recruit_stall"
        | "override_change"
        | "team_production_drop"
        | "persistency_warning"
        | "license_expiration"
      audit_action: "INSERT" | "UPDATE" | "DELETE"
      audit_source: "trigger" | "application"
      chargeback_status: "pending" | "resolved" | "disputed"
      commission_status:
        | "pending"
        | "paid"
        | "reversed"
        | "disputed"
        | "clawback"
        | "charged_back"
      comp_level: "street" | "release" | "enhanced" | "premium"
      expense_category:
        | "insurance_leads"
        | "software_tools"
        | "office_remote"
        | "professional_services"
        | "marketing"
        | "uncategorized"
      expense_type: "personal" | "business"
      file_type: "csv" | "pdf" | "xlsx"
      payment_frequency: "monthly" | "quarterly" | "semi_annual" | "annual"
      policy_status: "active" | "pending" | "lapsed" | "cancelled" | "expired"
      product_type:
        | "term_life"
        | "whole_life"
        | "universal_life"
        | "variable_life"
        | "health"
        | "disability"
        | "annuity"
        | "indexed_universal_life"
        | "participating_whole_life"
      report_frequency: "weekly" | "monthly" | "quarterly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_status: ["unlicensed", "licensed", "not_applicable"],
      alert_comparison: ["lt", "lte", "gt", "gte", "eq"],
      alert_metric: [
        "policy_lapse_warning",
        "target_miss_risk",
        "commission_threshold",
        "new_policy_count",
        "recruit_stall",
        "override_change",
        "team_production_drop",
        "persistency_warning",
        "license_expiration",
      ],
      audit_action: ["INSERT", "UPDATE", "DELETE"],
      audit_source: ["trigger", "application"],
      chargeback_status: ["pending", "resolved", "disputed"],
      commission_status: [
        "pending",
        "paid",
        "reversed",
        "disputed",
        "clawback",
        "charged_back",
      ],
      comp_level: ["street", "release", "enhanced", "premium"],
      expense_category: [
        "insurance_leads",
        "software_tools",
        "office_remote",
        "professional_services",
        "marketing",
        "uncategorized",
      ],
      expense_type: ["personal", "business"],
      file_type: ["csv", "pdf", "xlsx"],
      payment_frequency: ["monthly", "quarterly", "semi_annual", "annual"],
      policy_status: ["active", "pending", "lapsed", "cancelled", "expired"],
      product_type: [
        "term_life",
        "whole_life",
        "universal_life",
        "variable_life",
        "health",
        "disability",
        "annuity",
        "indexed_universal_life",
        "participating_whole_life",
      ],
      report_frequency: ["weekly", "monthly", "quarterly"],
    },
  },
} as const
