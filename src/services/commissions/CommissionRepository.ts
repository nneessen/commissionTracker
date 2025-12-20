// src/services/commissions/CommissionRepository.ts
import { BaseRepository } from "../base/BaseRepository";
import { TABLES } from "../base/supabase";
import {
  Commission,
  CreateCommissionData,
  UpdateCommissionData,
} from "../../types/commission.types";
import { queryPerformance } from "../../utils/performance";
import { formatDateForDB } from "../../lib/date";

// ---------------------------------------------------------------------------
// Type definitions for lightweight metric queries
// ---------------------------------------------------------------------------

export interface CommissionMetricRow {
  user_id: string;
  amount: number | string | null;
  status: string | null;
  earned_amount: number | string | null;
}

export interface CommissionWithPolicy {
  id: string;
  user_id: string;
  amount: number | string | null;
  earned_amount: number | string | null;
  unearned_amount: number | string | null;
  chargeback_amount: number | string | null;
  advance_months: number | null;
  months_paid: number | null;
  status: string | null;
  type: string | null;
  created_at: string | null;
  policy: { policy_number: string } | null;
}

export class CommissionRepository extends BaseRepository<
  Commission,
  CreateCommissionData,
  UpdateCommissionData
> {
  constructor() {
    super(TABLES.COMMISSIONS);
  }

  /**
   * Transform database record to Commission object
   * Maps database column names to TypeScript interface property names
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB record has dynamic schema from various sources
  protected transformFromDB(dbRecord: any): Commission {
    return {
      id: dbRecord.id,
      policyId: dbRecord.policy_id,
      userId: dbRecord.user_id,
      client: dbRecord.client || {},
      carrierId: dbRecord.carrier_id || "",
      product: dbRecord.product || "",
      type: dbRecord.type,
      status: dbRecord.status,
      calculationBasis: dbRecord.calculation_basis || "",
      annualPremium: parseFloat(dbRecord.annual_premium || 0),
      monthlyPremium: parseFloat(dbRecord.monthly_premium || 0),

      // ADVANCE (upfront payment) - Map DB amount field
      // Remote DB uses 'amount', local might use 'commission_amount'
      amount: parseFloat(
        dbRecord.amount ||
          dbRecord.commission_amount ||
          dbRecord.advance_amount ||
          0,
      ),
      advanceAmount: parseFloat(
        dbRecord.amount ||
          dbRecord.commission_amount ||
          dbRecord.advance_amount ||
          0,
      ), // Deprecated, for backward compat
      advanceMonths: dbRecord.advance_months ?? 9,

      // EARNING TRACKING
      monthsPaid: dbRecord.months_paid || 0,
      earnedAmount: parseFloat(dbRecord.earned_amount || 0),
      unearnedAmount: parseFloat(dbRecord.unearned_amount || 0),
      lastPaymentDate: dbRecord.last_payment_date
        ? new Date(dbRecord.last_payment_date)
        : undefined,

      // COMMISSION RATE
      commissionRate: parseFloat(dbRecord.rate || 0),

      contractCompLevel: dbRecord.contract_comp_level,
      isAutoCalculated: dbRecord.is_auto_calculated || false,
      expectedDate: dbRecord.expected_date
        ? new Date(dbRecord.expected_date)
        : undefined,
      actualDate: dbRecord.actual_date
        ? new Date(dbRecord.actual_date)
        : undefined,
      paidDate:
        dbRecord.payment_date || dbRecord.paid_date
          ? new Date(dbRecord.payment_date || dbRecord.paid_date)
          : undefined,
      monthEarned: dbRecord.month_earned,
      yearEarned: dbRecord.year_earned,
      quarterEarned: dbRecord.quarter_earned,
      notes: dbRecord.notes,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: dbRecord.updated_at
        ? new Date(dbRecord.updated_at)
        : undefined,
    } as Commission;
  }

  // findById() and findByIds() removed - using base implementation
  // TanStack Query handles caching and request deduplication automatically

  async findByPolicy(policyId: string): Promise<Commission[]> {
    return queryPerformance.trackQuery(
      "findByPolicy",
      "commissions",
      async () => {
        try {
          const { data, error } = await this.client
            .from(this.tableName)
            .select("*")
            .eq("policy_id", policyId)
            .order("created_at", { ascending: false });

          if (error) {
            throw this.handleError(error, "findByPolicy");
          }

          return data?.map((item) => this.transformFromDB(item)) || [];
        } catch (error) {
          throw this.wrapError(error, "findByPolicy");
        }
      },
    );
  }

  async findByAgent(userId: string): Promise<Commission[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("user_id", userId)
        .order("expected_date", { ascending: false });

      if (error) {
        throw this.handleError(error, "findByAgent");
      }

      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findByAgent");
    }
  }

  // -------------------------------------------------------------------------
  // BATCH METHODS (for hierarchy/team queries)
  // -------------------------------------------------------------------------

  /**
   * Find commissions for multiple agents (batch)
   */
  async findByAgents(userIds: string[]): Promise<Commission[]> {
    if (userIds.length === 0) return [];

    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      if (error) {
        throw this.handleError(error, "findByAgents");
      }

      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findByAgents");
    }
  }

  /**
   * Find commission metrics for multiple users (lightweight query)
   * Used by hierarchy service for calculating team metrics
   */
  async findMetricsByUserIds(
    userIds: string[],
  ): Promise<CommissionMetricRow[]> {
    if (userIds.length === 0) return [];

    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("user_id, amount, status, earned_amount")
        .in("user_id", userIds);

      if (error) {
        throw this.handleError(error, "findMetricsByUserIds");
      }

      return (data as CommissionMetricRow[]) || [];
    } catch (error) {
      throw this.wrapError(error, "findMetricsByUserIds");
    }
  }

  /**
   * Find commissions with policy relation for a user
   */
  async findWithPolicyByUserId(
    userId: string,
  ): Promise<CommissionWithPolicy[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(
          `
          *,
          policy:policies(policy_number)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw this.handleError(error, "findWithPolicyByUserId");
      }

      return (data as CommissionWithPolicy[]) || [];
    } catch (error) {
      throw this.wrapError(error, "findWithPolicyByUserId");
    }
  }

  async findByStatus(status: string): Promise<Commission[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("status", status)
        .order("expected_date", { ascending: false });

      if (error) {
        throw this.handleError(error, "findByStatus");
      }

      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findByStatus");
    }
  }

  async findByCarrier(carrierId: string): Promise<Commission[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("carrier_id", carrierId)
        .order("expected_date", { ascending: false });

      if (error) {
        throw this.handleError(error, "findByCarrier");
      }

      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findByCarrier");
    }
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    dateField: "expected_date" | "actual_date" = "expected_date",
  ): Promise<Commission[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .gte(dateField, formatDateForDB(startDate))
        .lte(dateField, formatDateForDB(endDate))
        .order(dateField, { ascending: false });

      if (error) {
        throw this.handleError(error, "findByDateRange");
      }

      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findByDateRange");
    }
  }

  async getMonthlyEarnings(
    userId: string,
    year: number,
    month: number,
  ): Promise<{
    expected: number;
    actual: number;
    pending: number;
    count: number;
  }> {
    try {
      const _startDate = new Date(year, month - 1, 1);
      const _endDate = new Date(year, month, 0);

      const { data, error } = await this.client
        .from(this.tableName)
        .select("commission_amount, status, actual_date")
        .eq("user_id", userId)
        .gte("month_earned", month)
        .eq("year_earned", year);

      if (error) {
        throw this.handleError(error, "getMonthlyEarnings");
      }

      const commissions = data || [];
      const expected = commissions.reduce(
        (sum, c) => sum + parseFloat(c.commission_amount || "0"),
        0,
      );
      const actual = commissions
        .filter((c) => c.status === "paid" && c.actual_date)
        .reduce((sum, c) => sum + parseFloat(c.commission_amount || "0"), 0);
      const pending = commissions
        .filter((c) => c.status === "expected")
        .reduce((sum, c) => sum + parseFloat(c.commission_amount || "0"), 0);

      return {
        expected,
        actual,
        pending,
        count: commissions.length,
      };
    } catch (error) {
      throw this.wrapError(error, "getMonthlyEarnings");
    }
  }

  async getYearToDateSummary(
    userId: string,
    year: number,
  ): Promise<{
    totalExpected: number;
    totalActual: number;
    totalPending: number;
    monthlyBreakdown: Array<{
      month: number;
      expected: number;
      actual: number;
      pending: number;
    }>;
  }> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("commission_amount, status, month_earned, year_earned")
        .eq("user_id", userId)
        .eq("year_earned", year)
        .order("month_earned", { ascending: true });

      if (error) {
        throw this.handleError(error, "getYearToDateSummary");
      }

      const commissions = data || [];

      // Calculate totals
      const totalExpected = commissions.reduce(
        (sum, c) => sum + parseFloat(c.commission_amount || "0"),
        0,
      );
      const totalActual = commissions
        .filter((c) => c.status === "paid")
        .reduce((sum, c) => sum + parseFloat(c.commission_amount || "0"), 0);
      const totalPending = commissions
        .filter((c) => c.status === "expected")
        .reduce((sum, c) => sum + parseFloat(c.commission_amount || "0"), 0);

      // Group by month
      const monthlyMap = new Map<
        number,
        { expected: number; actual: number; pending: number }
      >();

      commissions.forEach((c) => {
        const month = c.month_earned;
        const amount = parseFloat(c.commission_amount || "0");

        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { expected: 0, actual: 0, pending: 0 });
        }

        const monthData = monthlyMap.get(month)!;
        monthData.expected += amount;

        if (c.status === "paid") {
          monthData.actual += amount;
        } else if (c.status === "expected") {
          monthData.pending += amount;
        }
      });

      const monthlyBreakdown = Array.from(monthlyMap.entries()).map(
        ([month, data]) => ({
          month,
          ...data,
        }),
      );

      return {
        totalExpected,
        totalActual,
        totalPending,
        monthlyBreakdown,
      };
    } catch (error) {
      throw this.wrapError(error, "getYearToDateSummary");
    }
  }

  async getCarrierPerformance(
    carrierId: string,
    year: number,
  ): Promise<{
    totalCommissions: number;
    averageCommission: number;
    policyCount: number;
    conversionRate: number;
  }> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("commission_amount, policy_id")
        .eq("carrier_id", carrierId)
        .eq("year_earned", year);

      if (error) {
        throw this.handleError(error, "getCarrierPerformance");
      }

      const commissions = data || [];
      const totalCommissions = commissions.reduce(
        (sum, c) => sum + parseFloat(c.commission_amount || "0"),
        0,
      );
      const uniquePolicies = new Set(commissions.map((c) => c.policy_id)).size;
      const averageCommission =
        commissions.length > 0 ? totalCommissions / commissions.length : 0;

      return {
        totalCommissions,
        averageCommission,
        policyCount: uniquePolicies,
        conversionRate:
          uniquePolicies > 0 ? commissions.length / uniquePolicies : 0,
      };
    } catch (error) {
      throw this.wrapError(error, "getCarrierPerformance");
    }
  }

  protected transformToDB(
    data: Partial<CreateCommissionData>,
    _isUpdate = false,
  ): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbData: any = {};

    if (data.policyId !== undefined) dbData.policy_id = data.policyId;
    if (data.userId !== undefined) dbData.user_id = data.userId;
    if (data.client !== undefined) dbData.client = data.client;
    if (data.carrierId !== undefined) dbData.carrier_id = data.carrierId;
    if (data.product !== undefined) dbData.product = data.product;
    if (data.type !== undefined) dbData.type = data.type;
    if (data.status !== undefined) dbData.status = data.status;
    if (data.calculationBasis !== undefined)
      dbData.calculation_basis = data.calculationBasis;
    if (data.annualPremium !== undefined)
      dbData.annual_premium = data.annualPremium;
    if (data.monthlyPremium !== undefined)
      dbData.monthly_premium = data.monthlyPremium;

    // ADVANCE - Remote DB uses 'amount', not 'advance_amount' or 'commission_amount'
    if (data.amount !== undefined) dbData.amount = data.amount;
    if (data.advanceAmount !== undefined) dbData.amount = data.advanceAmount; // Backward compat
    if (data.advanceMonths !== undefined)
      dbData.advance_months = data.advanceMonths;

    // EARNING TRACKING
    if (data.monthsPaid !== undefined) dbData.months_paid = data.monthsPaid;
    if (data.earnedAmount !== undefined)
      dbData.earned_amount = data.earnedAmount;
    if (data.unearnedAmount !== undefined)
      dbData.unearned_amount = data.unearnedAmount;
    if (data.lastPaymentDate !== undefined)
      dbData.last_payment_date = data.lastPaymentDate;

    // COMMISSION RATE
    if (data.commissionRate !== undefined) dbData.rate = data.commissionRate;
    if (data.monthEarned !== undefined) dbData.month_earned = data.monthEarned;
    if (data.yearEarned !== undefined) dbData.year_earned = data.yearEarned;
    if (data.quarterEarned !== undefined)
      dbData.quarter_earned = data.quarterEarned;
    if (data.expectedDate !== undefined) {
      dbData.expected_date =
        data.expectedDate instanceof Date
          ? formatDateForDB(data.expectedDate)
          : data.expectedDate;
    }
    if (data.actualDate !== undefined) {
      dbData.actual_date =
        data.actualDate instanceof Date
          ? formatDateForDB(data.actualDate)
          : data.actualDate;
    }
    if (data.paidDate !== undefined) {
      dbData.paid_date =
        data.paidDate instanceof Date
          ? formatDateForDB(data.paidDate)
          : data.paidDate;
    }
    if (data.notes !== undefined) dbData.notes = data.notes;

    return dbData;
  }
}
