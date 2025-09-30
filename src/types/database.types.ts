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
      agent_settings: {
        Row: {
          agent_id: string | null
          created_at: string | null
          dashboard_layout: Json | null
          default_comp_level: Database["public"]["Enums"]["comp_level"] | null
          id: string
          notification_preferences: Json | null
          preferred_products:
            | Database["public"]["Enums"]["product_type"][]
            | null
          target_annual_policies: number | null
          target_monthly_income: number | null
          theme: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          dashboard_layout?: Json | null
          default_comp_level?: Database["public"]["Enums"]["comp_level"] | null
          id?: string
          notification_preferences?: Json | null
          preferred_products?:
            | Database["public"]["Enums"]["product_type"][]
            | null
          target_annual_policies?: number | null
          target_monthly_income?: number | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          dashboard_layout?: Json | null
          default_comp_level?: Database["public"]["Enums"]["comp_level"] | null
          id?: string
          notification_preferences?: Json | null
          preferred_products?:
            | Database["public"]["Enums"]["product_type"][]
            | null
          target_annual_policies?: number | null
          target_monthly_income?: number | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_settings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          comp_level: Database["public"]["Enums"]["comp_level"] | null
          created_at: string | null
          email: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          license_number: string | null
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comp_level?: Database["public"]["Enums"]["comp_level"] | null
          created_at?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comp_level?: Database["public"]["Enums"]["comp_level"] | null
          created_at?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      carriers: {
        Row: {
          code: string | null
          commission_structure: Json | null
          contact_info: Json | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          commission_structure?: Json | null
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          commission_structure?: Json | null
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string | null
          policy_id: string | null
          rate: number | null
          status: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          policy_id?: string | null
          rate?: number | null
          status?: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          policy_id?: string | null
          rate?: number | null
          status?: string
          type?: string
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
          {
            foreignKeyName: "commissions_user_id_fkey"
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
          comp_level: Database["public"]["Enums"]["comp_level"]
          created_at: string | null
          effective_date: string
          expiration_date: string | null
          id: string
          maximum_premium: number | null
          minimum_premium: number | null
          product_type: Database["public"]["Enums"]["product_type"]
          updated_at: string | null
        }
        Insert: {
          bonus_percentage?: number | null
          carrier_id?: string | null
          commission_percentage: number
          comp_level: Database["public"]["Enums"]["comp_level"]
          created_at?: string | null
          effective_date: string
          expiration_date?: string | null
          id?: string
          maximum_premium?: number | null
          minimum_premium?: number | null
          product_type: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
        }
        Update: {
          bonus_percentage?: number | null
          carrier_id?: string | null
          commission_percentage?: number
          comp_level?: Database["public"]["Enums"]["comp_level"]
          created_at?: string | null
          effective_date?: string
          expiration_date?: string | null
          id?: string
          maximum_premium?: number | null
          minimum_premium?: number | null
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
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          receipt_url: string | null
          recurring_frequency: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date: string
          description: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          annual_premium: number | null
          carrier: string
          client_id: string | null
          commission_rate: number | null
          created_at: string | null
          effective_date: string
          id: string
          notes: string | null
          policy_number: string
          premium: number
          renewal_date: string | null
          status: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          annual_premium?: number | null
          carrier: string
          client_id?: string | null
          commission_rate?: number | null
          created_at?: string | null
          effective_date: string
          id?: string
          notes?: string | null
          policy_number: string
          premium: number
          renewal_date?: string | null
          status?: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          annual_premium?: number | null
          carrier?: string
          client_id?: string | null
          commission_rate?: number | null
          created_at?: string | null
          effective_date?: string
          id?: string
          notes?: string | null
          policy_number?: string
          premium?: number
          renewal_date?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_user_id_fkey"
            columns: ["user_id"]
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
          fiscal_year_start?: number | null
          id?: string
          notifications_enabled?: boolean | null
          tax_rate?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      chargeback_status: "pending" | "resolved" | "disputed"
      commission_status: "pending" | "paid" | "reversed" | "disputed"
      comp_level: "street" | "release" | "enhanced" | "premium"
      expense_category:
        | "insurance_leads"
        | "software_tools"
        | "office_remote"
        | "professional_services"
        | "marketing"
        | "uncategorized"
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
        | "other"
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
        "other",
      ],
    },
  },
} as const
