export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      carriers: {
        Row: {
          commission_rates: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          commission_rates?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          commission_rates?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
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
          policy_id: string | null
          reason: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          chargeback_amount: number
          chargeback_date: string
          commission_id?: string | null
          created_at?: string | null
          id?: string
          policy_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          chargeback_amount?: number
          chargeback_date?: string
          commission_id?: string | null
          created_at?: string | null
          id?: string
          policy_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chargebacks_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chargebacks_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chargebacks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: Json | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
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
          advance_months: number | null
          carrier_id: string | null
          commission_amount: number
          created_at: string | null
          earned_amount: number | null
          id: string
          is_advance: boolean | null
          months_paid: number | null
          notes: string | null
          payment_date: string | null
          policy_id: string | null
          status: string | null
          unearned_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          advance_months?: number | null
          carrier_id?: string | null
          commission_amount: number
          created_at?: string | null
          earned_amount?: number | null
          id?: string
          is_advance?: boolean | null
          months_paid?: number | null
          notes?: string | null
          payment_date?: string | null
          policy_id?: string | null
          status?: string | null
          unearned_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          advance_months?: number | null
          carrier_id?: string | null
          commission_amount?: number
          created_at?: string | null
          earned_amount?: number | null
          id?: string
          is_advance?: boolean | null
          months_paid?: number | null
          notes?: string | null
          payment_date?: string | null
          policy_id?: string | null
          status?: string | null
          unearned_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
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
          contract_level: number
          created_at: string | null
          effective_date: string
          expiration_date: string | null
          id: string
          product_id: string | null
          product_type: string | null
          updated_at: string | null
        }
        Insert: {
          bonus_percentage?: number | null
          carrier_id?: string | null
          commission_percentage: number
          contract_level: number
          created_at?: string | null
          effective_date?: string
          expiration_date?: string | null
          id?: string
          product_id?: string | null
          product_type?: string | null
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
          product_id?: string | null
          product_type?: string | null
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
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: number
        }
        Update: {
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
          category: string | null
          created_at: string | null
          description: string | null
          expense_date: string
          expense_type: string | null
          id: string
          is_recurring: boolean | null
          name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          expense_date: string
          expense_type?: string | null
          id?: string
          is_recurring?: boolean | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          expense_date?: string
          expense_type?: string | null
          id?: string
          is_recurring?: boolean | null
          name?: string | null
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
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          advance_months: number | null
          annual_premium: number
          carrier_id: string
          client_id: string | null
          commission_percentage: number | null
          created_at: string | null
          created_by: string | null
          effective_date: string
          expiration_date: string | null
          id: string
          monthly_premium: number | null
          notes: string | null
          payment_frequency: string | null
          policy_number: string
          product: string | null
          product_id: string | null
          referral_source: string | null
          status: string | null
          term_length: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          advance_months?: number | null
          annual_premium: number
          carrier_id: string
          client_id?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          created_by?: string | null
          effective_date: string
          expiration_date?: string | null
          id?: string
          monthly_premium?: number | null
          notes?: string | null
          payment_frequency?: string | null
          policy_number: string
          product?: string | null
          product_id?: string | null
          referral_source?: string | null
          status?: string | null
          term_length?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          advance_months?: number | null
          annual_premium?: number
          carrier_id?: string
          client_id?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          expiration_date?: string | null
          id?: string
          monthly_premium?: number | null
          notes?: string | null
          payment_frequency?: string | null
          policy_number?: string
          product?: string | null
          product_id?: string | null
          referral_source?: string | null
          status?: string | null
          term_length?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
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
            foreignKeyName: "policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      products: {
        Row: {
          carrier_id: string
          code: string | null
          commission_percentage: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          product_type: string
          updated_at: string | null
        }
        Insert: {
          carrier_id: string
          code?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          product_type: string
          updated_at?: string | null
        }
        Update: {
          carrier_id?: string
          code?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          product_type?: string
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
        ]
      }
      recruit_phase_progress: {
        Row: {
          blocked_reason: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          phase_id: string
          started_at: string | null
          status: string
          template_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          phase_id: string
          started_at?: string | null
          status?: string
          template_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
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
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          user_id: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          user_id?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          user_id?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          agent_status: Database["public"]["Enums"]["agent_status"] | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          denial_reason: string | null
          denied_at: string | null
          email: string
          id: string
          is_admin: boolean
          licensing_info: Json | null
          pipeline_template_id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_status?: Database["public"]["Enums"]["agent_status"] | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          denial_reason?: string | null
          denied_at?: string | null
          email: string
          id: string
          is_admin?: boolean
          licensing_info?: Json | null
          pipeline_template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_status?: Database["public"]["Enums"]["agent_status"] | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          denial_reason?: string | null
          denied_at?: string | null
          email?: string
          id?: string
          is_admin?: boolean
          licensing_info?: Json | null
          pipeline_template_id?: string | null
          updated_at?: string | null
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
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_pipeline_template_id_fkey"
            columns: ["pipeline_template_id"]
            isOneToOne: false
            referencedRelation: "pipeline_templates"
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
    }
    Views: {
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
      calculate_commission_advance: {
        Args: {
          p_annual_premium: number
          p_commission_percentage: number
          p_advance_months: number
          p_contract_level?: number
        }
        Returns: number
      }
      get_pipeline_template_for_user: {
        Args: {
          p_agent_status: Database["public"]["Enums"]["agent_status"]
          p_roles: string[]
        }
        Returns: string
      }
      get_user_profile: {
        Args: {
          user_id: string
        }
        Returns: {
          id: string
          email: string
          name: string
          phone: string
          contract_comp_level: number
          is_active: boolean
          agent_code: string
          license_number: string
          license_state: string
          notes: string
          created_at: string
          updated_at: string
        }[]
      }
      is_user_approved: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_user_metadata: {
        Args: {
          user_id: string
          metadata: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      agent_status: "unlicensed" | "licensed" | "not_applicable"
      product_type:
        | "life"
        | "annuity"
        | "disability"
        | "long_term_care"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
