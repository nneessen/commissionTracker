export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
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
          name: string;
          updated_at: string | null;
        };
        Insert: {
          code?: string | null;
          commission_structure?: Json | null;
          contact_info?: Json | null;
          created_at?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          code?: string | null;
          commission_structure?: Json | null;
          contact_info?: Json | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      carriers_backup_20251103: {
        Row: {
          code: string | null;
          commission_structure: Json | null;
          contact_info: Json | null;
          created_at: string | null;
          id: string | null;
          name: string | null;
          updated_at: string | null;
        };
        Insert: {
          code?: string | null;
          commission_structure?: Json | null;
          contact_info?: Json | null;
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          updated_at?: string | null;
        };
        Update: {
          code?: string | null;
          commission_structure?: Json | null;
          contact_info?: Json | null;
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
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
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
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
          rate: number | null;
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
          rate?: number | null;
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
          rate?: number | null;
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
      comp_guide_backup_20251103: {
        Row: {
          bonus_percentage: number | null;
          carrier_id: string | null;
          commission_percentage: number | null;
          comp_level: Database["public"]["Enums"]["comp_level"] | null;
          created_at: string | null;
          effective_date: string | null;
          expiration_date: string | null;
          id: string | null;
          maximum_premium: number | null;
          minimum_premium: number | null;
          product_type: Database["public"]["Enums"]["product_type"] | null;
          updated_at: string | null;
        };
        Insert: {
          bonus_percentage?: number | null;
          carrier_id?: string | null;
          commission_percentage?: number | null;
          comp_level?: Database["public"]["Enums"]["comp_level"] | null;
          created_at?: string | null;
          effective_date?: string | null;
          expiration_date?: string | null;
          id?: string | null;
          maximum_premium?: number | null;
          minimum_premium?: number | null;
          product_type?: Database["public"]["Enums"]["product_type"] | null;
          updated_at?: string | null;
        };
        Update: {
          bonus_percentage?: number | null;
          carrier_id?: string | null;
          commission_percentage?: number | null;
          comp_level?: Database["public"]["Enums"]["comp_level"] | null;
          created_at?: string | null;
          effective_date?: string | null;
          expiration_date?: string | null;
          id?: string | null;
          maximum_premium?: number | null;
          minimum_premium?: number | null;
          product_type?: Database["public"]["Enums"]["product_type"] | null;
          updated_at?: string | null;
        };
        Relationships: [];
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
      expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string | null;
          date: string;
          description: string;
          id: string;
          is_recurring: boolean | null;
          notes: string | null;
          receipt_url: string | null;
          recurring_frequency: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string | null;
          date: string;
          description: string;
          id?: string;
          is_recurring?: boolean | null;
          notes?: string | null;
          receipt_url?: string | null;
          recurring_frequency?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string | null;
          date?: string;
          description?: string;
          id?: string;
          is_recurring?: boolean | null;
          notes?: string | null;
          receipt_url?: string | null;
          recurring_frequency?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      policies: {
        Row: {
          annual_premium: number | null;
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
          status: string;
          term_length: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          annual_premium?: number | null;
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
          status?: string;
          term_length?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          annual_premium?: number | null;
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
      products_backup_20251103: {
        Row: {
          carrier_id: string | null;
          code: string | null;
          commission_percentage: number | null;
          created_at: string | null;
          description: string | null;
          id: string | null;
          is_active: boolean | null;
          max_age: number | null;
          max_premium: number | null;
          metadata: Json | null;
          min_age: number | null;
          min_premium: number | null;
          name: string | null;
          product_type: Database["public"]["Enums"]["product_type"] | null;
          updated_at: string | null;
        };
        Insert: {
          carrier_id?: string | null;
          code?: string | null;
          commission_percentage?: number | null;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          is_active?: boolean | null;
          max_age?: number | null;
          max_premium?: number | null;
          metadata?: Json | null;
          min_age?: number | null;
          min_premium?: number | null;
          name?: string | null;
          product_type?: Database["public"]["Enums"]["product_type"] | null;
          updated_at?: string | null;
        };
        Update: {
          carrier_id?: string | null;
          code?: string | null;
          commission_percentage?: number | null;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          is_active?: boolean | null;
          max_age?: number | null;
          max_premium?: number | null;
          metadata?: Json | null;
          min_age?: number | null;
          min_premium?: number | null;
          name?: string | null;
          product_type?: Database["public"]["Enums"]["product_type"] | null;
          updated_at?: string | null;
        };
        Relationships: [];
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
    };
    Views: {
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
      calculate_earned_amount: {
        Args: {
          p_advance_months: number;
          p_amount: number;
          p_months_paid: number;
        };
        Returns: number;
      };
      calculate_unearned_amount: {
        Args: {
          p_advance_months: number;
          p_amount: number;
          p_months_paid: number;
        };
        Returns: number;
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
      update_user_metadata: {
        Args: { metadata: Json; user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      chargeback_status: "pending" | "resolved" | "disputed";
      commission_status: "pending" | "paid" | "reversed" | "disputed";
      comp_level: "street" | "release" | "enhanced" | "premium";
      expense_category:
        | "insurance_leads"
        | "software_tools"
        | "office_remote"
        | "professional_services"
        | "marketing"
        | "uncategorized";
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
      commission_status: ["pending", "paid", "reversed", "disputed"],
      comp_level: ["street", "release", "enhanced", "premium"],
      expense_category: [
        "insurance_leads",
        "software_tools",
        "office_remote",
        "professional_services",
        "marketing",
        "uncategorized",
      ],
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
