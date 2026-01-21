export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      carriers: {
        Row: {
          code: string | null;
          commission_structure: Json | null;
          contact_info: Json | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          code?: string | null;
          commission_structure?: Json | null;
          contact_info?: Json | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          code?: string | null;
          commission_structure?: Json | null;
          contact_info?: Json | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      chargebacks: {
        Row: {
          chargeback_amount: number;
          chargeback_date: string;
          commission_id: string | null;
          created_at: string | null;
          id: string;
          reason: string | null;
          resolution_date: string | null;
          resolution_notes: string | null;
          status: Database["public"]["Enums"]["chargeback_status"] | null;
          updated_at: string | null;
        };
        Insert: {
          chargeback_amount: number;
          chargeback_date: string;
          commission_id?: string | null;
          created_at?: string | null;
          id?: string;
          reason?: string | null;
          resolution_date?: string | null;
          resolution_notes?: string | null;
          status?: Database["public"]["Enums"]["chargeback_status"] | null;
          updated_at?: string | null;
        };
        Update: {
          chargeback_amount?: number;
          chargeback_date?: string;
          commission_id?: string | null;
          created_at?: string | null;
          id?: string;
          reason?: string | null;
          resolution_date?: string | null;
          resolution_notes?: string | null;
          status?: Database["public"]["Enums"]["chargeback_status"] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chargebacks_commission_id_fkey";
            columns: ["commission_id"];
            isOneToOne: false;
            referencedRelation: "commission_earning_detail";
            referencedColumns: ["commission_id"];
          },
          {
            foreignKeyName: "chargebacks_commission_id_fkey";
            columns: ["commission_id"];
            isOneToOne: false;
            referencedRelation: "commission_earning_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chargebacks_commission_id_fkey";
            columns: ["commission_id"];
            isOneToOne: false;
            referencedRelation: "commissions";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          address: string | null;
          created_at: string | null;
          date_of_birth: string | null;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          status: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      commissions: {
        Row: {
          advance_months: number;
          amount: number;
          chargeback_amount: number | null;
          chargeback_date: string | null;
          chargeback_reason: string | null;
          created_at: string | null;
          earned_amount: number;
          id: string;
          last_payment_date: string | null;
          months_paid: number;
          notes: string | null;
          payment_date: string | null;
          policy_id: string | null;
          status: string;
          type: string;
          unearned_amount: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          advance_months?: number;
          amount: number;
          chargeback_amount?: number | null;
          chargeback_date?: string | null;
          chargeback_reason?: string | null;
          created_at?: string | null;
          earned_amount?: number;
          id?: string;
          last_payment_date?: string | null;
          months_paid?: number;
          notes?: string | null;
          payment_date?: string | null;
          policy_id?: string | null;
          status?: string;
          type: string;
          unearned_amount?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          advance_months?: number;
          amount?: number;
          chargeback_amount?: number | null;
          chargeback_date?: string | null;
          chargeback_reason?: string | null;
          created_at?: string | null;
          earned_amount?: number;
          id?: string;
          last_payment_date?: string | null;
          months_paid?: number;
          notes?: string | null;
          payment_date?: string | null;
          policy_id?: string | null;
          status?: string;
          type?: string;
          unearned_amount?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commissions_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "policies";
            referencedColumns: ["id"];
          },
        ];
      };
      comp_guide: {
        Row: {
          bonus_percentage: number | null;
          carrier_id: string | null;
          commission_percentage: number;
          contract_level: number;
          created_at: string | null;
          effective_date: string;
          expiration_date: string | null;
          id: string;
          maximum_premium: number | null;
          minimum_premium: number | null;
          product_id: string | null;
          product_type: Database["public"]["Enums"]["product_type"];
          updated_at: string | null;
        };
        Insert: {
          bonus_percentage?: number | null;
          carrier_id?: string | null;
          commission_percentage: number;
          contract_level: number;
          created_at?: string | null;
          effective_date: string;
          expiration_date?: string | null;
          id?: string;
          maximum_premium?: number | null;
          minimum_premium?: number | null;
          product_id?: string | null;
          product_type: Database["public"]["Enums"]["product_type"];
          updated_at?: string | null;
        };
        Update: {
          bonus_percentage?: number | null;
          carrier_id?: string | null;
          commission_percentage?: number;
          contract_level?: number;
          created_at?: string | null;
          effective_date?: string;
          expiration_date?: string | null;
          id?: string;
          maximum_premium?: number | null;
          minimum_premium?: number | null;
          product_id?: string | null;
          product_type?: Database["public"]["Enums"]["product_type"];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comp_guide_carrier_id_fkey";
            columns: ["carrier_id"];
            isOneToOne: false;
            referencedRelation: "carriers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comp_guide_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      constants: {
        Row: {
          category: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          key: string;
          updated_at: string | null;
          value: number;
        };
        Insert: {
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          key: string;
          updated_at?: string | null;
          value: number;
        };
        Update: {
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          key?: string;
          updated_at?: string | null;
          value?: number;
        };
        Relationships: [];
      };
      email_queue: {
        Row: {
          attempts: number | null;
          body_html: string | null;
          created_at: string | null;
          email_id: string | null;
          error_message: string | null;
          id: string;
          max_attempts: number | null;
          recipient_user_id: string;
          scheduled_for: string;
          sender_user_id: string;
          sent_at: string | null;
          status: string | null;
          subject: string | null;
          template_id: string | null;
          trigger_id: string | null;
          updated_at: string | null;
          variables: Json | null;
        };
        Insert: {
          attempts?: number | null;
          body_html?: string | null;
          created_at?: string | null;
          email_id?: string | null;
          error_message?: string | null;
          id?: string;
          max_attempts?: number | null;
          recipient_user_id: string;
          scheduled_for: string;
          sender_user_id: string;
          sent_at?: string | null;
          status?: string | null;
          subject?: string | null;
          template_id?: string | null;
          trigger_id?: string | null;
          updated_at?: string | null;
          variables?: Json | null;
        };
        Update: {
          attempts?: number | null;
          body_html?: string | null;
          created_at?: string | null;
          email_id?: string | null;
          error_message?: string | null;
          id?: string;
          max_attempts?: number | null;
          recipient_user_id?: string;
          scheduled_for?: string;
          sender_user_id?: string;
          sent_at?: string | null;
          status?: string | null;
          subject?: string | null;
          template_id?: string | null;
          trigger_id?: string | null;
          updated_at?: string | null;
          variables?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_queue_email_id_fkey";
            columns: ["email_id"];
            isOneToOne: false;
            referencedRelation: "user_emails";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_queue_recipient_user_id_fkey";
            columns: ["recipient_user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_queue_sender_user_id_fkey";
            columns: ["sender_user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_queue_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "email_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_queue_trigger_id_fkey";
            columns: ["trigger_id"];
            isOneToOne: false;
            referencedRelation: "email_triggers";
            referencedColumns: ["id"];
          },
        ];
      };
      email_quota_tracking: {
        Row: {
          date: string;
          emails_sent: number | null;
          id: string;
          provider: string;
          user_id: string;
        };
        Insert: {
          date?: string;
          emails_sent?: number | null;
          id?: string;
          provider: string;
          user_id: string;
        };
        Update: {
          date?: string;
          emails_sent?: number | null;
          id?: string;
          provider?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_quota_tracking_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      email_templates: {
        Row: {
          body_html: string;
          body_text: string | null;
          category: string | null;
          created_at: string | null;
          created_by: string | null;
          id: string;
          is_active: boolean | null;
          is_global: boolean | null;
          name: string;
          subject: string;
          updated_at: string | null;
          usage_count: number | null;
          variables: string[] | null;
        };
        Insert: {
          body_html: string;
          body_text?: string | null;
          category?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_global?: boolean | null;
          name: string;
          subject: string;
          updated_at?: string | null;
          usage_count?: number | null;
          variables?: string[] | null;
        };
        Update: {
          body_html?: string;
          body_text?: string | null;
          category?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_global?: boolean | null;
          name?: string;
          subject?: string;
          updated_at?: string | null;
          usage_count?: number | null;
          variables?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      email_triggers: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          delay_minutes: number | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          template_id: string;
          trigger_config: Json;
          trigger_type: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          delay_minutes?: number | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          template_id: string;
          trigger_config: Json;
          trigger_type: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          delay_minutes?: number | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          template_id?: string;
          trigger_config?: Json;
          trigger_type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_triggers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_triggers_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "email_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      email_watch_subscriptions: {
        Row: {
          created_at: string | null;
          expiration: string | null;
          history_id: string | null;
          id: string;
          provider: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          expiration?: string | null;
          history_id?: string | null;
          id?: string;
          provider: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          expiration?: string | null;
          history_id?: string | null;
          id?: string;
          provider?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_watch_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_categories_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_templates: {
        Row: {
          amount: number;
          category: string;
          created_at: string | null;
          description: string | null;
          expense_type: Database["public"]["Enums"]["expense_type"];
          id: string;
          is_tax_deductible: boolean;
          notes: string | null;
          recurring_frequency: string | null;
          template_name: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string | null;
          description?: string | null;
          expense_type?: Database["public"]["Enums"]["expense_type"];
          id?: string;
          is_tax_deductible?: boolean;
          notes?: string | null;
          recurring_frequency?: string | null;
          template_name: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string | null;
          description?: string | null;
          expense_type?: Database["public"]["Enums"]["expense_type"];
          id?: string;
          is_tax_deductible?: boolean;
          notes?: string | null;
          recurring_frequency?: string | null;
          template_name?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_expense_templates_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string | null;
          date: string;
          description: string;
          expense_type: Database["public"]["Enums"]["expense_type"];
          id: string;
          is_recurring: boolean | null;
          is_tax_deductible: boolean;
          name: string;
          notes: string | null;
          receipt_url: string | null;
          recurring_end_date: string | null;
          recurring_frequency: string | null;
          recurring_group_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string | null;
          date: string;
          description: string;
          expense_type?: Database["public"]["Enums"]["expense_type"];
          id?: string;
          is_recurring?: boolean | null;
          is_tax_deductible?: boolean;
          name: string;
          notes?: string | null;
          receipt_url?: string | null;
          recurring_end_date?: string | null;
          recurring_frequency?: string | null;
          recurring_group_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string | null;
          date?: string;
          description?: string;
          expense_type?: Database["public"]["Enums"]["expense_type"];
          id?: string;
          is_recurring?: boolean | null;
          is_tax_deductible?: boolean;
          name?: string;
          notes?: string | null;
          receipt_url?: string | null;
          recurring_end_date?: string | null;
          recurring_frequency?: string | null;
          recurring_group_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      generated_reports: {
        Row: {
          created_at: string;
          filters: Json;
          generated_at: string;
          id: string;
          is_favorite: boolean;
          notes: string | null;
          report_type: string;
          schedule_id: string | null;
          sections: Json;
          source: string | null;
          subtitle: string | null;
          summary: Json;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          filters?: Json;
          generated_at?: string;
          id?: string;
          is_favorite?: boolean;
          notes?: string | null;
          report_type: string;
          schedule_id?: string | null;
          sections?: Json;
          source?: string | null;
          subtitle?: string | null;
          summary?: Json;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          filters?: Json;
          generated_at?: string;
          id?: string;
          is_favorite?: boolean;
          notes?: string | null;
          report_type?: string;
          schedule_id?: string | null;
          sections?: Json;
          source?: string | null;
          subtitle?: string | null;
          summary?: Json;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generated_reports_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "report_schedules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_reports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      hierarchy_invitations: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          invitee_email: string;
          invitee_id: string | null;
          inviter_id: string;
          message: string | null;
          responded_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          invitee_email: string;
          invitee_id?: string | null;
          inviter_id: string;
          message?: string | null;
          responded_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          invitee_email?: string;
          invitee_id?: string | null;
          inviter_id?: string;
          message?: string | null;
          responded_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hierarchy_invitations_invitee_id_fkey";
            columns: ["invitee_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hierarchy_invitations_inviter_id_fkey";
            columns: ["inviter_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      message_threads: {
        Row: {
          created_at: string | null;
          created_by: string;
          id: string;
          last_message_at: string | null;
          participant_ids: string[];
          subject: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by: string;
          id?: string;
          last_message_at?: string | null;
          participant_ids: string[];
          subject: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string;
          id?: string;
          last_message_at?: string | null;
          participant_ids?: string[];
          subject?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "message_threads_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          read_by: string[] | null;
          sender_id: string;
          thread_id: string;
          updated_at: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: string;
          read_by?: string[] | null;
          sender_id: string;
          thread_id: string;
          updated_at?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          read_by?: string[] | null;
          sender_id?: string;
          thread_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "message_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          expires_at: string | null;
          id: string;
          message: string | null;
          metadata: Json | null;
          read: boolean;
          title: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          message?: string | null;
          metadata?: Json | null;
          read?: boolean;
          title: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          message?: string | null;
          metadata?: Json | null;
          read?: boolean;
          title?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_phases: {
        Row: {
          blocked_reason: string | null;
          completed_at: string | null;
          created_at: string | null;
          id: string;
          notes: string | null;
          phase_name: string;
          phase_order: number;
          started_at: string | null;
          status: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          blocked_reason?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          phase_name: string;
          phase_order: number;
          started_at?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          blocked_reason?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          phase_name?: string;
          phase_order?: number;
          started_at?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_phases_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      override_commissions: {
        Row: {
          advance_months: number | null;
          base_agent_id: string;
          base_commission_amount: number;
          base_comp_level: number;
          carrier_id: string;
          chargeback_amount: number | null;
          chargeback_date: string | null;
          chargeback_reason: string | null;
          created_at: string | null;
          earned_amount: number | null;
          hierarchy_depth: number;
          id: string;
          months_paid: number | null;
          override_agent_id: string;
          override_commission_amount: number;
          override_comp_level: number;
          payment_date: string | null;
          policy_id: string;
          policy_premium: number;
          product_id: string | null;
          status: string;
          unearned_amount: number | null;
          updated_at: string | null;
        };
        Insert: {
          advance_months?: number | null;
          base_agent_id: string;
          base_commission_amount: number;
          base_comp_level: number;
          carrier_id: string;
          chargeback_amount?: number | null;
          chargeback_date?: string | null;
          chargeback_reason?: string | null;
          created_at?: string | null;
          earned_amount?: number | null;
          hierarchy_depth: number;
          id?: string;
          months_paid?: number | null;
          override_agent_id: string;
          override_commission_amount: number;
          override_comp_level: number;
          payment_date?: string | null;
          policy_id: string;
          policy_premium: number;
          product_id?: string | null;
          status?: string;
          unearned_amount?: number | null;
          updated_at?: string | null;
        };
        Update: {
          advance_months?: number | null;
          base_agent_id?: string;
          base_commission_amount?: number;
          base_comp_level?: number;
          carrier_id?: string;
          chargeback_amount?: number | null;
          chargeback_date?: string | null;
          chargeback_reason?: string | null;
          created_at?: string | null;
          earned_amount?: number | null;
          hierarchy_depth?: number;
          id?: string;
          months_paid?: number | null;
          override_agent_id?: string;
          override_commission_amount?: number;
          override_comp_level?: number;
          payment_date?: string | null;
          policy_id?: string;
          policy_premium?: number;
          product_id?: string | null;
          status?: string;
          unearned_amount?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "override_commissions_base_agent_id_fkey";
            columns: ["base_agent_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "override_commissions_carrier_id_fkey";
            columns: ["carrier_id"];
            isOneToOne: false;
            referencedRelation: "carriers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "override_commissions_override_agent_id_fkey";
            columns: ["override_agent_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "override_commissions_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "policies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "override_commissions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          action: string;
          code: string;
          created_at: string | null;
          description: string | null;
          id: string;
          resource: string;
          scope: string | null;
        };
        Insert: {
          action: string;
          code: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          resource: string;
          scope?: string | null;
        };
        Update: {
          action?: string;
          code?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          resource?: string;
          scope?: string | null;
        };
        Relationships: [];
      };
      phase_checklist_items: {
        Row: {
          can_be_completed_by: string;
          created_at: string | null;
          document_type: string | null;
          external_link: string | null;
          id: string;
          is_active: boolean | null;
          is_required: boolean | null;
          item_description: string | null;
          item_name: string;
          item_order: number;
          item_type: string;
          metadata: Json | null;
          phase_id: string;
          requires_verification: boolean | null;
          updated_at: string | null;
          verification_by: string | null;
        };
        Insert: {
          can_be_completed_by: string;
          created_at?: string | null;
          document_type?: string | null;
          external_link?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_required?: boolean | null;
          item_description?: string | null;
          item_name: string;
          item_order: number;
          item_type: string;
          metadata?: Json | null;
          phase_id: string;
          requires_verification?: boolean | null;
          updated_at?: string | null;
          verification_by?: string | null;
        };
        Update: {
          can_be_completed_by?: string;
          created_at?: string | null;
          document_type?: string | null;
          external_link?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_required?: boolean | null;
          item_description?: string | null;
          item_name?: string;
          item_order?: number;
          item_type?: string;
          metadata?: Json | null;
          phase_id?: string;
          requires_verification?: boolean | null;
          updated_at?: string | null;
          verification_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "phase_checklist_items_phase_id_fkey";
            columns: ["phase_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_phases";
            referencedColumns: ["id"];
          },
        ];
      };
      pipeline_phases: {
        Row: {
          auto_advance: boolean | null;
          created_at: string | null;
          estimated_days: number | null;
          id: string;
          is_active: boolean | null;
          phase_description: string | null;
          phase_name: string;
          phase_order: number;
          required_approver_role: string | null;
          template_id: string;
          updated_at: string | null;
        };
        Insert: {
          auto_advance?: boolean | null;
          created_at?: string | null;
          estimated_days?: number | null;
          id?: string;
          is_active?: boolean | null;
          phase_description?: string | null;
          phase_name: string;
          phase_order: number;
          required_approver_role?: string | null;
          template_id: string;
          updated_at?: string | null;
        };
        Update: {
          auto_advance?: boolean | null;
          created_at?: string | null;
          estimated_days?: number | null;
          id?: string;
          is_active?: boolean | null;
          phase_description?: string | null;
          phase_name?: string;
          phase_order?: number;
          required_approver_role?: string | null;
          template_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pipeline_phases_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      pipeline_templates: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          is_default: boolean | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_default?: boolean | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_default?: boolean | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pipeline_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      policies: {
        Row: {
          annual_premium: number | null;
          cancellation_date: string | null;
          cancellation_reason: string | null;
          carrier_id: string;
          client_id: string | null;
          commission_percentage: number | null;
          created_at: string | null;
          effective_date: string;
          expiration_date: string | null;
          id: string;
          monthly_premium: number;
          notes: string | null;
          payment_frequency:
            | Database["public"]["Enums"]["payment_frequency"]
            | null;
          policy_number: string;
          product: Database["public"]["Enums"]["product_type"];
          product_id: string | null;
          referral_source: string | null;
          status: string;
          term_length: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          annual_premium?: number | null;
          cancellation_date?: string | null;
          cancellation_reason?: string | null;
          carrier_id: string;
          client_id?: string | null;
          commission_percentage?: number | null;
          created_at?: string | null;
          effective_date: string;
          expiration_date?: string | null;
          id?: string;
          monthly_premium: number;
          notes?: string | null;
          payment_frequency?:
            | Database["public"]["Enums"]["payment_frequency"]
            | null;
          policy_number: string;
          product: Database["public"]["Enums"]["product_type"];
          product_id?: string | null;
          referral_source?: string | null;
          status?: string;
          term_length?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          annual_premium?: number | null;
          cancellation_date?: string | null;
          cancellation_reason?: string | null;
          carrier_id?: string;
          client_id?: string | null;
          commission_percentage?: number | null;
          created_at?: string | null;
          effective_date?: string;
          expiration_date?: string | null;
          id?: string;
          monthly_premium?: number;
          notes?: string | null;
          payment_frequency?:
            | Database["public"]["Enums"]["payment_frequency"]
            | null;
          policy_number?: string;
          product?: Database["public"]["Enums"]["product_type"];
          product_id?: string | null;
          referral_source?: string | null;
          status?: string;
          term_length?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "policies_carrier_id_fkey";
            columns: ["carrier_id"];
            isOneToOne: false;
            referencedRelation: "carriers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "policies_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "policies_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_commission_overrides: {
        Row: {
          bonus_percentage: number | null;
          commission_percentage: number;
          comp_level: Database["public"]["Enums"]["comp_level"];
          created_at: string | null;
          effective_date: string;
          expiration_date: string | null;
          id: string;
          notes: string | null;
          product_id: string;
          updated_at: string | null;
        };
        Insert: {
          bonus_percentage?: number | null;
          commission_percentage: number;
          comp_level: Database["public"]["Enums"]["comp_level"];
          created_at?: string | null;
          effective_date?: string;
          expiration_date?: string | null;
          id?: string;
          notes?: string | null;
          product_id: string;
          updated_at?: string | null;
        };
        Update: {
          bonus_percentage?: number | null;
          commission_percentage?: number;
          comp_level?: Database["public"]["Enums"]["comp_level"];
          created_at?: string | null;
          effective_date?: string;
          expiration_date?: string | null;
          id?: string;
          notes?: string | null;
          product_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_commission_overrides_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          carrier_id: string;
          code: string | null;
          commission_percentage: number | null;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          max_age: number | null;
          max_premium: number | null;
          metadata: Json | null;
          min_age: number | null;
          min_premium: number | null;
          name: string;
          product_type: Database["public"]["Enums"]["product_type"];
          updated_at: string | null;
        };
        Insert: {
          carrier_id: string;
          code?: string | null;
          commission_percentage?: number | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_age?: number | null;
          max_premium?: number | null;
          metadata?: Json | null;
          min_age?: number | null;
          min_premium?: number | null;
          name: string;
          product_type: Database["public"]["Enums"]["product_type"];
          updated_at?: string | null;
        };
        Update: {
          carrier_id?: string;
          code?: string | null;
          commission_percentage?: number | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_age?: number | null;
          max_premium?: number | null;
          metadata?: Json | null;
          min_age?: number | null;
          min_premium?: number | null;
          name?: string;
          product_type?: Database["public"]["Enums"]["product_type"];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_carrier_id_fkey";
            columns: ["carrier_id"];
            isOneToOne: false;
            referencedRelation: "carriers";
            referencedColumns: ["id"];
          },
        ];
      };
      recruit_checklist_progress: {
        Row: {
          checklist_item_id: string;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string | null;
          document_id: string | null;
          id: string;
          metadata: Json | null;
          notes: string | null;
          rejection_reason: string | null;
          status: string;
          updated_at: string | null;
          user_id: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          checklist_item_id: string;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          document_id?: string | null;
          id?: string;
          metadata?: Json | null;
          notes?: string | null;
          rejection_reason?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          checklist_item_id?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          document_id?: string | null;
          id?: string;
          metadata?: Json | null;
          notes?: string | null;
          rejection_reason?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recruit_checklist_progress_checklist_item_id_fkey";
            columns: ["checklist_item_id"];
            isOneToOne: false;
            referencedRelation: "phase_checklist_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recruit_checklist_progress_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recruit_checklist_progress_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "user_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recruit_checklist_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recruit_checklist_progress_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recruit_phase_progress: {
        Row: {
          blocked_reason: string | null;
          completed_at: string | null;
          created_at: string | null;
          id: string;
          notes: string | null;
          phase_id: string;
          started_at: string | null;
          status: string;
          template_id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          blocked_reason?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          phase_id: string;
          started_at?: string | null;
          status?: string;
          template_id: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          blocked_reason?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          phase_id?: string;
          started_at?: string | null;
          status?: string;
          template_id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recruit_phase_progress_phase_id_fkey";
            columns: ["phase_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_phases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recruit_phase_progress_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recruit_phase_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      report_annotations: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          report_id: string;
          section_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          report_id: string;
          section_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          report_id?: string;
          section_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_annotations_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "generated_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_annotations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      report_schedule_runs: {
        Row: {
          completed_at: string | null;
          created_at: string;
          duration_ms: number | null;
          email_error: string | null;
          email_sent: boolean | null;
          email_sent_at: string | null;
          error_message: string | null;
          id: string;
          report_ids: string[] | null;
          retry_attempted: boolean | null;
          schedule_id: string;
          scheduled_for: string;
          started_at: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          email_error?: string | null;
          email_sent?: boolean | null;
          email_sent_at?: string | null;
          error_message?: string | null;
          id?: string;
          report_ids?: string[] | null;
          retry_attempted?: boolean | null;
          schedule_id: string;
          scheduled_for: string;
          started_at?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          email_error?: string | null;
          email_sent?: boolean | null;
          email_sent_at?: string | null;
          error_message?: string | null;
          id?: string;
          report_ids?: string[] | null;
          retry_attempted?: boolean | null;
          schedule_id?: string;
          scheduled_for?: string;
          started_at?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_schedule_runs_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "report_schedules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_schedule_runs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      report_schedules: {
        Row: {
          auto_disabled_at: string | null;
          consecutive_failures: number;
          created_at: string;
          day_of_month: number | null;
          day_of_week: number | null;
          description: string | null;
          email_config: Json;
          failure_count: number;
          id: string;
          is_active: boolean;
          last_run_at: string | null;
          last_success_at: string | null;
          max_consecutive_failures: number;
          name: string;
          next_run_at: string | null;
          report_config: Json;
          run_count: number;
          run_time: string;
          schedule_type: string;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          auto_disabled_at?: string | null;
          consecutive_failures?: number;
          created_at?: string;
          day_of_month?: number | null;
          day_of_week?: number | null;
          description?: string | null;
          email_config?: Json;
          failure_count?: number;
          id?: string;
          is_active?: boolean;
          last_run_at?: string | null;
          last_success_at?: string | null;
          max_consecutive_failures?: number;
          name: string;
          next_run_at?: string | null;
          report_config?: Json;
          run_count?: number;
          run_time?: string;
          schedule_type: string;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          auto_disabled_at?: string | null;
          consecutive_failures?: number;
          created_at?: string;
          day_of_month?: number | null;
          day_of_week?: number | null;
          description?: string | null;
          email_config?: Json;
          failure_count?: number;
          id?: string;
          is_active?: boolean;
          last_run_at?: string | null;
          last_success_at?: string | null;
          max_consecutive_failures?: number;
          name?: string;
          next_run_at?: string | null;
          report_config?: Json;
          run_count?: number;
          run_time?: string;
          schedule_type?: string;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_schedules_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          created_at: string | null;
          permission_id: string;
          role_id: string;
        };
        Insert: {
          created_at?: string | null;
          permission_id: string;
          role_id: string;
        };
        Update: {
          created_at?: string | null;
          permission_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string | null;
          description: string | null;
          display_name: string;
          id: string;
          is_system_role: boolean | null;
          name: string;
          parent_role_id: string | null;
          respects_hierarchy: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          display_name: string;
          id?: string;
          is_system_role?: boolean | null;
          name: string;
          parent_role_id?: string | null;
          respects_hierarchy?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          display_name?: string;
          id?: string;
          is_system_role?: boolean | null;
          name?: string;
          parent_role_id?: string | null;
          respects_hierarchy?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "roles_parent_role_id_fkey";
            columns: ["parent_role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          created_at: string | null;
          currency: string | null;
          default_commission_rate: number | null;
          fiscal_year_start: number | null;
          id: string;
          notifications_enabled: boolean | null;
          tax_rate: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          currency?: string | null;
          default_commission_rate?: number | null;
          fiscal_year_start?: number | null;
          id?: string;
          notifications_enabled?: boolean | null;
          tax_rate?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          currency?: string | null;
          default_commission_rate?: number | null;
          fiscal_year_start?: number | null;
          id?: string;
          notifications_enabled?: boolean | null;
          tax_rate?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      user_activity_log: {
        Row: {
          action_type: string;
          created_at: string | null;
          details: Json | null;
          id: string;
          performed_by: string | null;
          user_id: string;
        };
        Insert: {
          action_type: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          performed_by?: string | null;
          user_id: string;
        };
        Update: {
          action_type?: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          performed_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_activity_log_performed_by_fkey";
            columns: ["performed_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_activity_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_documents: {
        Row: {
          created_at: string | null;
          document_name: string;
          document_type: string;
          expires_at: string | null;
          file_name: string;
          file_size: number | null;
          file_type: string | null;
          id: string;
          notes: string | null;
          required: boolean | null;
          status: string;
          storage_path: string;
          updated_at: string | null;
          uploaded_at: string | null;
          uploaded_by: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          document_name: string;
          document_type: string;
          expires_at?: string | null;
          file_name: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          notes?: string | null;
          required?: boolean | null;
          status?: string;
          storage_path: string;
          updated_at?: string | null;
          uploaded_at?: string | null;
          uploaded_by?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          document_name?: string;
          document_type?: string;
          expires_at?: string | null;
          file_name?: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          notes?: string | null;
          required?: boolean | null;
          status?: string;
          storage_path?: string;
          updated_at?: string | null;
          uploaded_at?: string | null;
          uploaded_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_documents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_email_attachments: {
        Row: {
          created_at: string | null;
          email_id: string;
          file_name: string;
          file_size: number | null;
          file_type: string | null;
          id: string;
          storage_path: string;
        };
        Insert: {
          created_at?: string | null;
          email_id: string;
          file_name: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          storage_path: string;
        };
        Update: {
          created_at?: string | null;
          email_id?: string;
          file_name?: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_email_attachments_email_id_fkey";
            columns: ["email_id"];
            isOneToOne: false;
            referencedRelation: "user_emails";
            referencedColumns: ["id"];
          },
        ];
      };
      user_email_oauth_tokens: {
        Row: {
          access_token_encrypted: string;
          created_at: string | null;
          email_address: string;
          id: string;
          is_active: boolean | null;
          last_used_at: string | null;
          provider: string;
          refresh_token_encrypted: string | null;
          scopes: string[] | null;
          token_expiry: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          access_token_encrypted: string;
          created_at?: string | null;
          email_address: string;
          id?: string;
          is_active?: boolean | null;
          last_used_at?: string | null;
          provider: string;
          refresh_token_encrypted?: string | null;
          scopes?: string[] | null;
          token_expiry?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          access_token_encrypted?: string;
          created_at?: string | null;
          email_address?: string;
          id?: string;
          is_active?: boolean | null;
          last_used_at?: string | null;
          provider?: string;
          refresh_token_encrypted?: string | null;
          scopes?: string[] | null;
          token_expiry?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_email_oauth_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_emails: {
        Row: {
          body_html: string | null;
          body_text: string | null;
          cc_addresses: string[] | null;
          created_at: string | null;
          delivered_at: string | null;
          failed_reason: string | null;
          from_address: string | null;
          id: string;
          is_incoming: boolean | null;
          labels: string[] | null;
          metadata: Json | null;
          opened_at: string | null;
          provider: string | null;
          provider_message_id: string | null;
          reply_to_id: string | null;
          sender_id: string | null;
          sent_at: string | null;
          status: string;
          subject: string;
          thread_id: string | null;
          to_addresses: string[] | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          body_html?: string | null;
          body_text?: string | null;
          cc_addresses?: string[] | null;
          created_at?: string | null;
          delivered_at?: string | null;
          failed_reason?: string | null;
          from_address?: string | null;
          id?: string;
          is_incoming?: boolean | null;
          labels?: string[] | null;
          metadata?: Json | null;
          opened_at?: string | null;
          provider?: string | null;
          provider_message_id?: string | null;
          reply_to_id?: string | null;
          sender_id?: string | null;
          sent_at?: string | null;
          status?: string;
          subject: string;
          thread_id?: string | null;
          to_addresses?: string[] | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          body_html?: string | null;
          body_text?: string | null;
          cc_addresses?: string[] | null;
          created_at?: string | null;
          delivered_at?: string | null;
          failed_reason?: string | null;
          from_address?: string | null;
          id?: string;
          is_incoming?: boolean | null;
          labels?: string[] | null;
          metadata?: Json | null;
          opened_at?: string | null;
          provider?: string | null;
          provider_message_id?: string | null;
          reply_to_id?: string | null;
          sender_id?: string | null;
          sent_at?: string | null;
          status?: string;
          subject?: string;
          thread_id?: string | null;
          to_addresses?: string[] | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_emails_reply_to_id_fkey";
            columns: ["reply_to_id"];
            isOneToOne: false;
            referencedRelation: "user_emails";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_emails_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_emails_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          approval_status: string;
          approved_at: string | null;
          approved_by: string | null;
          city: string | null;
          contract_level: number | null;
          created_at: string | null;
          current_onboarding_phase: string | null;
          custom_permissions: Json | null;
          date_of_birth: string | null;
          denial_reason: string | null;
          denied_at: string | null;
          email: string;
          facebook_handle: string | null;
          first_name: string | null;
          hierarchy_depth: number | null;
          hierarchy_path: string | null;
          id: string;
          instagram_url: string | null;
          instagram_username: string | null;
          is_admin: boolean;
          last_name: string | null;
          license_expiration: string | null;
          license_number: string | null;
          linkedin_url: string | null;
          linkedin_username: string | null;
          npn: string | null;
          onboarding_completed_at: string | null;
          onboarding_started_at: string | null;
          onboarding_status: string | null;
          personal_website: string | null;
          phone: string | null;
          profile_photo_url: string | null;
          recruiter_id: string | null;
          referral_source: string | null;
          resident_state: string | null;
          roles: string[] | null;
          state: string | null;
          street_address: string | null;
          updated_at: string | null;
          upline_id: string | null;
          user_id: string | null;
          zip: string | null;
        };
        Insert: {
          approval_status?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          city?: string | null;
          contract_level?: number | null;
          created_at?: string | null;
          current_onboarding_phase?: string | null;
          custom_permissions?: Json | null;
          date_of_birth?: string | null;
          denial_reason?: string | null;
          denied_at?: string | null;
          email: string;
          facebook_handle?: string | null;
          first_name?: string | null;
          hierarchy_depth?: number | null;
          hierarchy_path?: string | null;
          id?: string;
          instagram_url?: string | null;
          instagram_username?: string | null;
          is_admin?: boolean;
          last_name?: string | null;
          license_expiration?: string | null;
          license_number?: string | null;
          linkedin_url?: string | null;
          linkedin_username?: string | null;
          npn?: string | null;
          onboarding_completed_at?: string | null;
          onboarding_started_at?: string | null;
          onboarding_status?: string | null;
          personal_website?: string | null;
          phone?: string | null;
          profile_photo_url?: string | null;
          recruiter_id?: string | null;
          referral_source?: string | null;
          resident_state?: string | null;
          roles?: string[] | null;
          state?: string | null;
          street_address?: string | null;
          updated_at?: string | null;
          upline_id?: string | null;
          user_id?: string | null;
          zip?: string | null;
        };
        Update: {
          approval_status?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          city?: string | null;
          contract_level?: number | null;
          created_at?: string | null;
          current_onboarding_phase?: string | null;
          custom_permissions?: Json | null;
          date_of_birth?: string | null;
          denial_reason?: string | null;
          denied_at?: string | null;
          email?: string;
          facebook_handle?: string | null;
          first_name?: string | null;
          hierarchy_depth?: number | null;
          hierarchy_path?: string | null;
          id?: string;
          instagram_url?: string | null;
          instagram_username?: string | null;
          is_admin?: boolean;
          last_name?: string | null;
          license_expiration?: string | null;
          license_number?: string | null;
          linkedin_url?: string | null;
          linkedin_username?: string | null;
          npn?: string | null;
          onboarding_completed_at?: string | null;
          onboarding_started_at?: string | null;
          onboarding_status?: string | null;
          personal_website?: string | null;
          phone?: string | null;
          profile_photo_url?: string | null;
          recruiter_id?: string | null;
          referral_source?: string | null;
          resident_state?: string | null;
          roles?: string[] | null;
          state?: string | null;
          street_address?: string | null;
          updated_at?: string | null;
          upline_id?: string | null;
          user_id?: string | null;
          zip?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_profiles_recruiter_id_fkey";
            columns: ["recruiter_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_profiles_upline_id_fkey";
            columns: ["upline_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_targets: {
        Row: {
          achievements: Json | null;
          annual_income_target: number | null;
          annual_policies_target: number | null;
          avg_premium_target: number | null;
          created_at: string | null;
          expense_ratio_target: number | null;
          id: string;
          last_milestone_date: string | null;
          monthly_expense_target: number | null;
          monthly_income_target: number | null;
          monthly_policies_target: number | null;
          persistency_13_month_target: number | null;
          persistency_25_month_target: number | null;
          quarterly_income_target: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          achievements?: Json | null;
          annual_income_target?: number | null;
          annual_policies_target?: number | null;
          avg_premium_target?: number | null;
          created_at?: string | null;
          expense_ratio_target?: number | null;
          id?: string;
          last_milestone_date?: string | null;
          monthly_expense_target?: number | null;
          monthly_income_target?: number | null;
          monthly_policies_target?: number | null;
          persistency_13_month_target?: number | null;
          persistency_25_month_target?: number | null;
          quarterly_income_target?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          achievements?: Json | null;
          annual_income_target?: number | null;
          annual_policies_target?: number | null;
          avg_premium_target?: number | null;
          created_at?: string | null;
          expense_ratio_target?: number | null;
          id?: string;
          last_milestone_date?: string | null;
          monthly_expense_target?: number | null;
          monthly_income_target?: number | null;
          monthly_policies_target?: number | null;
          persistency_13_month_target?: number | null;
          persistency_25_month_target?: number | null;
          quarterly_income_target?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_targets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      commission_chargeback_summary: {
        Row: {
          at_risk_amount: number | null;
          chargeback_rate_percentage: number | null;
          charged_back_count: number | null;
          high_risk_count: number | null;
          total_advances: number | null;
          total_chargeback_amount: number | null;
          total_chargebacks: number | null;
          total_earned: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      commission_earning_detail: {
        Row: {
          advance_amount: number | null;
          advance_months: number | null;
          annual_premium: number | null;
          chargeback_amount: number | null;
          chargeback_risk_level: string | null;
          commission_id: string | null;
          earned_amount: number | null;
          effective_date: string | null;
          is_fully_earned: boolean | null;
          monthly_earning_rate: number | null;
          months_paid: number | null;
          months_remaining: number | null;
          policy_id: string | null;
          policy_status: string | null;
          status: string | null;
          unearned_amount: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commissions_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "policies";
            referencedColumns: ["id"];
          },
        ];
      };
      commission_earning_status: {
        Row: {
          advance_amount: number | null;
          advance_months: number | null;
          chargeback_amount: number | null;
          chargeback_date: string | null;
          chargeback_reason: string | null;
          chargeback_risk: string | null;
          created_at: string | null;
          earned_amount: number | null;
          id: string | null;
          is_fully_earned: boolean | null;
          last_payment_date: string | null;
          monthly_earning_rate: number | null;
          months_paid: number | null;
          months_remaining: number | null;
          percentage_earned: number | null;
          policy_id: string | null;
          status: string | null;
          type: string | null;
          unearned_amount: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          advance_amount?: number | null;
          advance_months?: number | null;
          chargeback_amount?: number | null;
          chargeback_date?: string | null;
          chargeback_reason?: string | null;
          chargeback_risk?: never;
          created_at?: string | null;
          earned_amount?: number | null;
          id?: string | null;
          is_fully_earned?: never;
          last_payment_date?: string | null;
          monthly_earning_rate?: never;
          months_paid?: number | null;
          months_remaining?: never;
          percentage_earned?: never;
          policy_id?: string | null;
          status?: string | null;
          type?: string | null;
          unearned_amount?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          advance_amount?: number | null;
          advance_months?: number | null;
          chargeback_amount?: number | null;
          chargeback_date?: string | null;
          chargeback_reason?: string | null;
          chargeback_risk?: never;
          created_at?: string | null;
          earned_amount?: number | null;
          id?: string | null;
          is_fully_earned?: never;
          last_payment_date?: string | null;
          monthly_earning_rate?: never;
          months_paid?: number | null;
          months_remaining?: never;
          percentage_earned?: never;
          policy_id?: string | null;
          status?: string | null;
          type?: string | null;
          unearned_amount?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commissions_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "policies";
            referencedColumns: ["id"];
          },
        ];
      };
      commission_earning_summary: {
        Row: {
          at_risk_count: number | null;
          avg_months_paid: number | null;
          fully_earned_count: number | null;
          portfolio_earned_percentage: number | null;
          total_advances: number | null;
          total_chargebacks: number | null;
          total_commissions: number | null;
          total_earned: number | null;
          total_unearned: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      mv_carrier_performance: {
        Row: {
          active_policies: number | null;
          avg_commission_amount: number | null;
          avg_commission_rate_pct: number | null;
          avg_premium: number | null;
          cancelled_policies: number | null;
          carrier_id: string | null;
          carrier_name: string | null;
          commission_count: number | null;
          lapsed_policies: number | null;
          latest_policy_update: string | null;
          persistency_rate: number | null;
          policies_13mo_plus: number | null;
          total_commission_amount: number | null;
          total_policies: number | null;
          total_premium: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "policies_carrier_id_fkey";
            columns: ["carrier_id"];
            isOneToOne: false;
            referencedRelation: "carriers";
            referencedColumns: ["id"];
          },
        ];
      };
      mv_client_ltv: {
        Row: {
          active_policies: number | null;
          active_premium: number | null;
          avg_commission_per_policy: number | null;
          avg_policy_age_months: number | null;
          avg_premium_per_policy: number | null;
          cancelled_policies: number | null;
          client_id: string | null;
          client_name: string | null;
          client_tier: string | null;
          cross_sell_opportunity: boolean | null;
          email: string | null;
          first_policy_date: string | null;
          lapsed_policies: number | null;
          latest_policy_date: string | null;
          paid_commission: number | null;
          total_commission: number | null;
          total_policies: number | null;
          total_premium: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "policies_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      mv_cohort_retention: {
        Row: {
          active_premium: number | null;
          cancelled_count: number | null;
          cohort_month: string | null;
          cohort_size: number | null;
          lapsed_count: number | null;
          months_since_issue: number | null;
          retention_rate: number | null;
          still_active: number | null;
          total_premium: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      mv_commission_aging: {
        Row: {
          aging_bucket: string | null;
          avg_at_risk: number | null;
          bucket_order: number | null;
          commission_count: number | null;
          policy_count: number | null;
          risk_level: string | null;
          total_at_risk: number | null;
          total_commission: number | null;
          total_earned: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      mv_daily_production: {
        Row: {
          active_policies: number | null;
          avg_premium: number | null;
          cancelled_policies: number | null;
          lapsed_policies: number | null;
          max_premium: number | null;
          min_premium: number | null;
          production_date: string | null;
          total_policies: number | null;
          total_premium: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      mv_expense_summary: {
        Row: {
          avg_amount: number | null;
          category: string | null;
          expense_month: string | null;
          expense_type: Database["public"]["Enums"]["expense_type"] | null;
          max_amount: number | null;
          min_amount: number | null;
          recurring_amount: number | null;
          recurring_count: number | null;
          total_amount: number | null;
          transaction_count: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      mv_product_performance: {
        Row: {
          active_policies: number | null;
          avg_commission: number | null;
          avg_commission_rate_pct: number | null;
          avg_premium: number | null;
          lapsed_policies: number | null;
          persistency_rate: number | null;
          product_id: string | null;
          product_name: string | null;
          product_type: Database["public"]["Enums"]["product_type"] | null;
          total_commission: number | null;
          total_policies: number | null;
          total_premium: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "policies_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      mv_production_velocity: {
        Row: {
          month_start: string | null;
          monthly_avg_premium: number | null;
          monthly_policies: number | null;
          monthly_premium: number | null;
          user_id: string | null;
          week_start: string | null;
          weekly_avg_premium: number | null;
          weekly_policies: number | null;
          weekly_premium: number | null;
        };
        Relationships: [];
      };
      override_commission_summary: {
        Row: {
          charged_back_amount: number | null;
          earned_amount: number | null;
          override_agent_id: string | null;
          paid_amount: number | null;
          pending_amount: number | null;
          total_earned: number | null;
          total_override_amount: number | null;
          total_overrides: number | null;
          total_unearned: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "override_commissions_override_agent_id_fkey";
            columns: ["override_agent_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      unearned_commission_summary: {
        Row: {
          at_risk_count: number | null;
          avg_months_paid: number | null;
          fully_earned_count: number | null;
          portfolio_earned_percentage: number | null;
          total_advances: number | null;
          total_chargebacks: number | null;
          total_commissions: number | null;
          total_earned: number | null;
          total_unearned: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          agent_code: string | null;
          contract_comp_level: number | null;
          created_at: string | null;
          email: string | null;
          id: string | null;
          is_active: boolean | null;
          license_number: string | null;
          license_state: string | null;
          name: string | null;
          notes: string | null;
          phone: string | null;
          updated_at: string | null;
        };
        Insert: {
          agent_code?: never;
          contract_comp_level?: never;
          created_at?: string | null;
          email?: string | null;
          id?: string | null;
          is_active?: never;
          license_number?: never;
          license_state?: never;
          name?: never;
          notes?: never;
          phone?: never;
          updated_at?: string | null;
        };
        Update: {
          agent_code?: never;
          contract_comp_level?: never;
          created_at?: string | null;
          email?: string | null;
          id?: string | null;
          is_active?: never;
          license_number?: never;
          license_state?: never;
          name?: never;
          notes?: never;
          phone?: never;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      add_to_read_by: {
        Args: { message_id: string; user_id: string };
        Returns: undefined;
      };
      admin_approve_user: {
        Args: { approver_id: string; target_user_id: string };
        Returns: boolean;
      };
      admin_deny_user: {
        Args: { approver_id: string; reason: string; target_user_id: string };
        Returns: boolean;
      };
      admin_get_all_users: {
        Args: never;
        Returns: {
          approval_status: string;
          approved_at: string;
          approved_by: string;
          contract_level: number;
          created_at: string;
          denial_reason: string;
          denied_at: string;
          email: string;
          full_name: string;
          hierarchy_depth: number;
          hierarchy_path: string;
          id: string;
          is_admin: boolean;
          roles: string[];
          updated_at: string;
          upline_id: string;
        }[];
      };
      admin_get_all_users_v2: {
        Args: never;
        Returns: {
          approval_status: string;
          approved_at: string;
          approved_by: string;
          created_at: string;
          denial_reason: string;
          denied_at: string;
          email: string;
          hierarchy_depth: number;
          hierarchy_path: string;
          id: string;
          is_admin: boolean;
          updated_at: string;
          upline_id: string;
        }[];
      };
      admin_get_pending_users: {
        Args: never;
        Returns: {
          approval_status: string;
          approved_at: string;
          approved_by: string;
          contract_level: number;
          created_at: string;
          denial_reason: string;
          denied_at: string;
          email: string;
          full_name: string;
          hierarchy_depth: number;
          hierarchy_path: string;
          id: string;
          is_admin: boolean;
          roles: string[];
          updated_at: string;
          upline_id: string;
        }[];
      };
      admin_get_user_profile: {
        Args: { target_user_id: string };
        Returns: {
          approval_status: string;
          approved_at: string;
          approved_by: string;
          contract_level: number;
          created_at: string;
          denial_reason: string;
          denied_at: string;
          email: string;
          full_name: string;
          hierarchy_depth: number;
          hierarchy_path: string;
          id: string;
          is_admin: boolean;
          roles: string[];
          updated_at: string;
          upline_id: string;
        }[];
      };
      admin_set_admin_role: {
        Args: { new_is_admin: boolean; target_user_id: string };
        Returns: boolean;
      };
      admin_set_pending_user: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      calculate_chargeback_on_policy_lapse: {
        Args: { p_lapse_date?: string; p_policy_id: string };
        Returns: Json;
      };
      calculate_client_age: { Args: { birth_date: string }; Returns: number };
      calculate_commission_advance: {
        Args: {
          p_advance_months: number;
          p_annual_premium: number;
          p_commission_percentage: number;
          p_contract_level?: number;
        };
        Returns: number;
      };
      calculate_earned_amount: {
        Args: {
          p_advance_months: number;
          p_amount: number;
          p_months_paid: number;
        };
        Returns: number;
      };
      calculate_months_paid: {
        Args: { p_effective_date: string; p_end_date?: string };
        Returns: number;
      };
      calculate_next_run_time: {
        Args: {
          p_day_of_month?: number;
          p_day_of_week?: number;
          p_from_time?: string;
          p_run_time: string;
          p_schedule_type: string;
          p_timezone: string;
        };
        Returns: string;
      };
      calculate_unearned_amount: {
        Args: {
          p_advance_months: number;
          p_amount: number;
          p_months_paid: number;
        };
        Returns: number;
      };
      check_email_exists: {
        Args: { target_email: string };
        Returns: {
          email_exists: boolean;
          error_message: string;
          user_id: string;
        }[];
      };
      check_email_quota: {
        Args: { p_limit?: number; p_provider: string; p_user_id: string };
        Returns: boolean;
      };
      cleanup_old_reports: {
        Args: { max_reports_per_user?: number };
        Returns: number;
      };
      expire_old_invitations: {
        Args: never;
        Returns: {
          expired_count: number;
        }[];
      };
      get_at_risk_commissions: {
        Args: { p_risk_threshold?: number; p_user_id: string };
        Returns: {
          advance_amount: number;
          commission_id: string;
          earned_amount: number;
          effective_date: string;
          months_paid: number;
          policy_id: string;
          policy_status: string;
          risk_level: string;
          unearned_amount: number;
        }[];
      };
      get_clients_with_stats: {
        Args: never;
        Returns: {
          active_policy_count: number;
          address: string;
          avg_premium: number;
          created_at: string;
          date_of_birth: string;
          email: string;
          id: string;
          last_policy_date: string;
          name: string;
          notes: string;
          phone: string;
          policy_count: number;
          status: string;
          total_premium: number;
          updated_at: string;
          user_id: string;
        }[];
      };
      get_downline_ids: {
        Args: { target_user_id: string };
        Returns: {
          downline_id: string;
        }[];
      };
      get_policies_paginated: {
        Args: {
          p_carrier_id?: string;
          p_cursor?: string;
          p_limit?: number;
          p_product_id?: string;
          p_status?: string;
          p_user_id?: string;
        };
        Returns: {
          annual_premium: number;
          carrier_id: string;
          carrier_name: string;
          client: Json;
          commission_percentage: number;
          created_at: string;
          effective_date: string;
          id: string;
          payment_frequency: Database["public"]["Enums"]["payment_frequency"];
          policy_number: string;
          product: Database["public"]["Enums"]["product_type"];
          product_id: string;
          product_name: string;
          status: Database["public"]["Enums"]["policy_status"];
          user_id: string;
        }[];
      };
      get_policy_count: {
        Args: {
          p_carrier_id?: string;
          p_product_id?: string;
          p_status?: string;
          p_user_id?: string;
        };
        Returns: number;
      };
      get_product_commission_rate: {
        Args: {
          p_comp_level: Database["public"]["Enums"]["comp_level"];
          p_date?: string;
          p_product_id: string;
        };
        Returns: number;
      };
      get_role_permissions_with_inheritance: {
        Args: { p_role_id: string };
        Returns: {
          inherited_from_role_name: string;
          permission_action: string;
          permission_code: string;
          permission_description: string;
          permission_id: string;
          permission_resource: string;
          permission_scope: string;
          permission_type: string;
        }[];
      };
      get_user_commission_profile: {
        Args: { p_lookback_months?: number; p_user_id: string };
        Returns: {
          calculated_at: string;
          contract_level: number;
          data_quality: string;
          product_breakdown: Json;
          simple_avg_rate: number;
          weighted_avg_rate: number;
        }[];
      };
      get_user_permissions: {
        Args: { target_user_id: string };
        Returns: {
          permission_code: string;
        }[];
      };
      get_user_profile: {
        Args: { user_id: string };
        Returns: {
          agent_code: string;
          contract_comp_level: number;
          created_at: string;
          email: string;
          id: string;
          is_active: boolean;
          license_number: string;
          license_state: string;
          name: string;
          notes: string;
          phone: string;
          updated_at: string;
        }[];
      };
      has_permission: {
        Args: { permission_code: string; target_user_id: string };
        Returns: boolean;
      };
      has_role: {
        Args: { role_name: string; target_user_id: string };
        Returns: boolean;
      };
      increment_email_quota: {
        Args: { p_provider: string; p_user_id: string };
        Returns: number;
      };
      is_admin: { Args: never; Returns: boolean };
      is_admin_user: { Args: { target_user_id?: string }; Returns: boolean };
      is_caller_admin: { Args: never; Returns: boolean };
      is_user_approved: { Args: never; Returns: boolean };
      lookup_user_by_email: {
        Args: { p_email: string };
        Returns: {
          email: string;
          id: string;
          is_approved: boolean;
          upline_id: string;
        }[];
      };
      mark_policy_cancelled: {
        Args: {
          p_cancellation_date?: string;
          p_cancellation_reason?: string;
          p_policy_id: string;
        };
        Returns: Json;
      };
      mark_policy_lapsed: {
        Args: {
          p_lapse_date?: string;
          p_lapse_reason?: string;
          p_policy_id: string;
        };
        Returns: Json;
      };
      refresh_all_report_materialized_views: {
        Args: never;
        Returns: undefined;
      };
      update_override_earned_amount: {
        Args: { p_months_paid: number; p_policy_id: string };
        Returns: undefined;
      };
      update_user_metadata: {
        Args: { metadata: Json; user_id: string };
        Returns: undefined;
      };
      validate_invitation_acceptance: {
        Args: { p_invitation_id: string; p_invitee_id: string };
        Returns: {
          error_message: string;
          valid: boolean;
        }[];
      };
      validate_invitation_eligibility: {
        Args: { p_invitee_email: string; p_inviter_id: string };
        Returns: {
          error_message: string;
          invitee_user_id: string;
          valid: boolean;
          warning_message: string;
        }[];
      };
    };
    Enums: {
      chargeback_status: "pending" | "resolved" | "disputed";
      commission_status:
        | "pending"
        | "paid"
        | "reversed"
        | "disputed"
        | "clawback"
        | "charged_back";
      comp_level: "street" | "release" | "enhanced" | "premium";
      expense_category:
        | "insurance_leads"
        | "software_tools"
        | "office_remote"
        | "professional_services"
        | "marketing"
        | "uncategorized";
      expense_type: "personal" | "business";
      file_type: "csv" | "pdf" | "xlsx";
      payment_frequency: "monthly" | "quarterly" | "semi_annual" | "annual";
      policy_status: "active" | "pending" | "lapsed" | "cancelled" | "expired";
      product_type:
        | "term_life"
        | "whole_life"
        | "universal_life"
        | "variable_life"
        | "health"
        | "disability"
        | "annuity";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
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
      ],
    },
  },
} as const;
