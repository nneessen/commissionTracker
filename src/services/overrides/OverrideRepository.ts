// src/services/overrides/OverrideRepository.ts
import { BaseRepository } from "../base/BaseRepository";
import { TABLES } from "../base/supabase";

// ---------------------------------------------------------------------------
// Type definitions for override queries
// ---------------------------------------------------------------------------

export interface OverrideCommission {
  id: string;
  policy_id: string;
  base_agent_id: string;
  override_agent_id: string;
  base_commission_amount: number;
  override_commission_amount: number;
  base_comp_level: number;
  override_comp_level: number;
  hierarchy_depth: number;
  carrier_id: string;
  product_id: string | null;
  policy_premium: number;
  status: string;
  advance_months: number | null;
  months_paid: number | null;
  earned_amount: number | null;
  unearned_amount: number | null;
  chargeback_amount: number | null;
  chargeback_date: string | null;
  chargeback_reason: string | null;
  payment_date: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface OverrideMetricRow {
  base_agent_id: string;
  override_agent_id?: string;
  override_commission_amount: number | string | null;
  status: string | null;
  created_at?: string;
}

export interface CreateOverrideData {
  policy_id: string;
  base_agent_id: string;
  override_agent_id: string;
  base_commission_amount: number;
  override_commission_amount: number;
  base_comp_level: number;
  override_comp_level: number;
  hierarchy_depth: number;
  carrier_id: string;
  product_id?: string | null;
  policy_premium: number;
  status?: string;
  advance_months?: number | null;
}

export interface UpdateOverrideData {
  status?: string;
  months_paid?: number;
  earned_amount?: number;
  unearned_amount?: number;
  chargeback_amount?: number;
  chargeback_date?: string;
  chargeback_reason?: string;
  payment_date?: string;
}

/**
 * Repository for override_commissions table
 * Handles all override commission data access
 */
export class OverrideRepository extends BaseRepository<
  OverrideCommission,
  CreateOverrideData,
  UpdateOverrideData
> {
  constructor() {
    super(TABLES.OVERRIDE_COMMISSIONS);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB record has dynamic schema
  protected transformFromDB(dbRecord: any): OverrideCommission {
    return {
      id: dbRecord.id,
      policy_id: dbRecord.policy_id,
      base_agent_id: dbRecord.base_agent_id,
      override_agent_id: dbRecord.override_agent_id,
      base_commission_amount: parseFloat(dbRecord.base_commission_amount || 0),
      override_commission_amount: parseFloat(
        dbRecord.override_commission_amount || 0,
      ),
      base_comp_level: dbRecord.base_comp_level,
      override_comp_level: dbRecord.override_comp_level,
      hierarchy_depth: dbRecord.hierarchy_depth,
      carrier_id: dbRecord.carrier_id,
      product_id: dbRecord.product_id,
      policy_premium: parseFloat(dbRecord.policy_premium || 0),
      status: dbRecord.status,
      advance_months: dbRecord.advance_months,
      months_paid: dbRecord.months_paid,
      earned_amount: dbRecord.earned_amount
        ? parseFloat(dbRecord.earned_amount)
        : null,
      unearned_amount: dbRecord.unearned_amount
        ? parseFloat(dbRecord.unearned_amount)
        : null,
      chargeback_amount: dbRecord.chargeback_amount
        ? parseFloat(dbRecord.chargeback_amount)
        : null,
      chargeback_date: dbRecord.chargeback_date,
      chargeback_reason: dbRecord.chargeback_reason,
      payment_date: dbRecord.payment_date,
      created_at: dbRecord.created_at
        ? new Date(dbRecord.created_at)
        : undefined,
      updated_at: dbRecord.updated_at
        ? new Date(dbRecord.updated_at)
        : undefined,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- transform function requires flexible typing
  protected transformToDB(data: Partial<CreateOverrideData>): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB record has dynamic schema
    const dbData: any = {};

    if (data.policy_id !== undefined) dbData.policy_id = data.policy_id;
    if (data.base_agent_id !== undefined)
      dbData.base_agent_id = data.base_agent_id;
    if (data.override_agent_id !== undefined)
      dbData.override_agent_id = data.override_agent_id;
    if (data.base_commission_amount !== undefined)
      dbData.base_commission_amount = data.base_commission_amount;
    if (data.override_commission_amount !== undefined)
      dbData.override_commission_amount = data.override_commission_amount;
    if (data.base_comp_level !== undefined)
      dbData.base_comp_level = data.base_comp_level;
    if (data.override_comp_level !== undefined)
      dbData.override_comp_level = data.override_comp_level;
    if (data.hierarchy_depth !== undefined)
      dbData.hierarchy_depth = data.hierarchy_depth;
    if (data.carrier_id !== undefined) dbData.carrier_id = data.carrier_id;
    if (data.product_id !== undefined) dbData.product_id = data.product_id;
    if (data.policy_premium !== undefined)
      dbData.policy_premium = data.policy_premium;
    if (data.status !== undefined) dbData.status = data.status;
    if (data.advance_months !== undefined)
      dbData.advance_months = data.advance_months;

    return dbData;
  }

  // -------------------------------------------------------------------------
  // QUERY METHODS (used by hierarchy service)
  // -------------------------------------------------------------------------

  /**
   * Find overrides by base agent ID
   */
  async findByBaseAgentId(baseAgentId: string): Promise<OverrideMetricRow[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("base_agent_id, override_commission_amount, status")
        .eq("base_agent_id", baseAgentId);

      if (error) {
        throw this.handleError(error, "findByBaseAgentId");
      }

      return (data as OverrideMetricRow[]) || [];
    } catch (error) {
      throw this.wrapError(error, "findByBaseAgentId");
    }
  }

  /**
   * Find overrides by multiple base agent IDs (batch)
   */
  async findByBaseAgentIds(
    baseAgentIds: string[],
  ): Promise<OverrideMetricRow[]> {
    if (baseAgentIds.length === 0) return [];

    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("base_agent_id, override_commission_amount, status")
        .in("base_agent_id", baseAgentIds);

      if (error) {
        throw this.handleError(error, "findByBaseAgentIds");
      }

      return (data as OverrideMetricRow[]) || [];
    } catch (error) {
      throw this.wrapError(error, "findByBaseAgentIds");
    }
  }

  /**
   * Find overrides by override agent ID (income for this agent)
   * @param overrideAgentId - ID of the agent receiving overrides
   * @param startDate - Optional start date filter
   * @param activeOnly - If true, only include overrides for active policies (default: true)
   */
  async findByOverrideAgentId(
    overrideAgentId: string,
    startDate?: string,
    activeOnly: boolean = true,
  ): Promise<OverrideMetricRow[]> {
    try {
      // If filtering by active policies, we need to join with policies table
      if (activeOnly) {
        let query = this.client
          .from(this.tableName)
          .select(
            `
            override_agent_id,
            override_commission_amount,
            status,
            created_at,
            policy:policies!inner(status)
          `,
          )
          .eq("override_agent_id", overrideAgentId)
          .eq("policy.status", "active");

        if (startDate) {
          query = query.gte("created_at", startDate);
        }

        const { data, error } = await query;

        if (error) {
          throw this.handleError(error, "findByOverrideAgentId");
        }

        // Extract only the fields we need (exclude joined policy data)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((data || []) as any[]).map((row) => ({
          override_agent_id: row.override_agent_id,
          override_commission_amount: row.override_commission_amount,
          status: row.status,
          created_at: row.created_at,
        })) as OverrideMetricRow[];
      }

      // Without active filter
      let query = this.client
        .from(this.tableName)
        .select(
          "override_agent_id, override_commission_amount, status, created_at",
        )
        .eq("override_agent_id", overrideAgentId);

      if (startDate) {
        query = query.gte("created_at", startDate);
      }

      const { data, error } = await query;

      if (error) {
        throw this.handleError(error, "findByOverrideAgentId");
      }

      return (data as OverrideMetricRow[]) || [];
    } catch (error) {
      throw this.wrapError(error, "findByOverrideAgentId");
    }
  }

  /**
   * Find overrides for agent (as either base or override agent) within date range
   * @param agentId - ID of the agent (either base or override)
   * @param startDate - Start date filter
   * @param activeOnly - If true, only include overrides for active policies (default: true)
   */
  async findForAgentInRange(
    agentId: string,
    startDate: string,
    activeOnly: boolean = true,
  ): Promise<OverrideMetricRow[]> {
    try {
      // If filtering by active policies, we need to join with policies table
      if (activeOnly) {
        const { data, error } = await this.client
          .from(this.tableName)
          .select(
            `
            override_commission_amount,
            override_agent_id,
            base_agent_id,
            policy:policies!inner(status)
          `,
          )
          .or(`override_agent_id.eq.${agentId},base_agent_id.eq.${agentId}`)
          .eq("policy.status", "active")
          .gte("created_at", startDate);

        if (error) {
          throw this.handleError(error, "findForAgentInRange");
        }

        // Extract only the fields we need (exclude joined policy data)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((data || []) as any[]).map((row) => ({
          override_agent_id: row.override_agent_id,
          base_agent_id: row.base_agent_id,
          override_commission_amount: row.override_commission_amount,
        })) as OverrideMetricRow[];
      }

      // Without active filter
      const { data, error } = await this.client
        .from(this.tableName)
        .select("override_commission_amount, override_agent_id, base_agent_id")
        .or(`override_agent_id.eq.${agentId},base_agent_id.eq.${agentId}`)
        .gte("created_at", startDate);

      if (error) {
        throw this.handleError(error, "findForAgentInRange");
      }

      return (data as OverrideMetricRow[]) || [];
    } catch (error) {
      throw this.wrapError(error, "findForAgentInRange");
    }
  }

  /**
   * Find overrides by base agent ID within date range
   */
  async findByBaseAgentIdInRange(
    baseAgentId: string,
    startDate: string,
  ): Promise<OverrideMetricRow[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("override_commission_amount")
        .eq("base_agent_id", baseAgentId)
        .gte("created_at", startDate);

      if (error) {
        throw this.handleError(error, "findByBaseAgentIdInRange");
      }

      return (data as OverrideMetricRow[]) || [];
    } catch (error) {
      throw this.wrapError(error, "findByBaseAgentIdInRange");
    }
  }

  /**
   * Find overrides by override agent ID within date range (income agent earns)
   * Used for agent detail page to show "Override Income"
   * Only counts overrides with status 'earned' or 'paid' (base commission must be paid)
   */
  async findByOverrideAgentIdInRange(
    overrideAgentId: string,
    startDate: string,
  ): Promise<OverrideMetricRow[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("override_commission_amount")
        .eq("override_agent_id", overrideAgentId)
        .gte("created_at", startDate)
        .in("status", ["earned", "paid"]); // Only count earned/paid overrides

      if (error) {
        throw this.handleError(error, "findByOverrideAgentIdInRange");
      }

      return (data as OverrideMetricRow[]) || [];
    } catch (error) {
      throw this.wrapError(error, "findByOverrideAgentIdInRange");
    }
  }

  /**
   * Find overrides where a specific override agent earns from base agent(s)
   * Used for team table to show "Overrides I earn from this agent"
   * Only counts overrides with status 'earned' or 'paid' (base commission must be paid)
   * Supports both single baseAgentId and batch mode with array of baseAgentIds
   */
  async findByOverrideAndBaseAgentInRange(
    overrideAgentId: string,
    baseAgentIds: string | string[],
    startDate: string,
  ): Promise<OverrideMetricRow[]> {
    const ids = Array.isArray(baseAgentIds) ? baseAgentIds : [baseAgentIds];
    if (ids.length === 0) return [];

    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("base_agent_id, override_commission_amount")
        .eq("override_agent_id", overrideAgentId)
        .in("base_agent_id", ids)
        .gte("created_at", startDate)
        .in("status", ["earned", "paid"]); // Only count earned/paid overrides

      if (error) {
        throw this.handleError(error, "findByOverrideAndBaseAgentInRange");
      }

      return (data as OverrideMetricRow[]) || [];
    } catch (error) {
      throw this.wrapError(error, "findByOverrideAndBaseAgentInRange");
    }
  }

  /**
   * Find overrides by policy ID
   */
  async findByPolicyId(policyId: string): Promise<OverrideCommission[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("policy_id", policyId)
        .order("hierarchy_depth", { ascending: true });

      if (error) {
        throw this.handleError(error, "findByPolicyId");
      }

      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findByPolicyId");
    }
  }

  /**
   * Find overrides for an override agent (income they receive)
   */
  async findByOverrideAgent(
    overrideAgentId: string,
  ): Promise<OverrideCommission[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("override_agent_id", overrideAgentId)
        .order("created_at", { ascending: false });

      if (error) {
        throw this.handleError(error, "findByOverrideAgent");
      }

      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findByOverrideAgent");
    }
  }
}

export const overrideRepository = new OverrideRepository();
