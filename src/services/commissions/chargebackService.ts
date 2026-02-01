// src/services/chargebackService.ts
import { supabase, TABLES } from "../base/supabase";
import { Chargeback, CreateChargebackData } from "../../types/user.types";
import { formatDateForDB } from "../../lib/date";
import {
  workflowEventEmitter,
  WORKFLOW_EVENTS,
} from "../events/workflowEventEmitter";

export type { CreateChargebackData };

class ChargebackService {
  async getAll(): Promise<Chargeback[]> {
    const { data, error } = await supabase
      .from(TABLES.CHARGEBACKS)
      .select("*")
      .order("chargeback_date", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch chargebacks: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getById(id: string): Promise<Chargeback | null> {
    const { data, error } = await supabase
      .from(TABLES.CHARGEBACKS)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch chargeback: ${error.message}`);
    }

    return data ? this.transformFromDB(data) : null;
  }

  async getByPolicyId(policyId: string): Promise<Chargeback[]> {
    const { data, error } = await supabase
      .from(TABLES.CHARGEBACKS)
      .select("*")
      .eq("policy_id", policyId)
      .order("chargeback_date", { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch chargebacks for policy: ${error.message}`,
      );
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByAgentId(userId: string): Promise<Chargeback[]> {
    const { data, error } = await supabase
      .from(TABLES.CHARGEBACKS)
      .select("*")
      .eq("user_id", userId)
      .order("chargeback_date", { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch chargebacks for agent: ${error.message}`,
      );
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByStatus(status: Chargeback["status"]): Promise<Chargeback[]> {
    const { data, error } = await supabase
      .from(TABLES.CHARGEBACKS)
      .select("*")
      .eq("status", status)
      .order("chargeback_date", { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch chargebacks by status: ${error.message}`,
      );
    }

    return data?.map(this.transformFromDB) || [];
  }

  async create(chargebackData: CreateChargebackData): Promise<Chargeback> {
    const dbData = this.transformToDB(chargebackData);

    const { data, error } = await supabase
      .from(TABLES.CHARGEBACKS)
      .insert([dbData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create chargeback: ${error.message}`);
    }

    const chargeback = this.transformFromDB(data);

    // Emit commission chargeback event
    await workflowEventEmitter.emit(WORKFLOW_EVENTS.COMMISSION_CHARGEBACK, {
      commissionId: chargeback.commissionId,
      policyId: chargeback.policyId,
      agentId: chargeback.userId,
      chargebackAmount: chargeback.chargebackAmount,
      chargebackType: chargeback.chargebackType,
      chargebackReason: chargeback.chargebackReason,
      occurredAt: chargeback.chargebackDate.toISOString(),
      timestamp: new Date().toISOString(),
    });

    return chargeback;
  }

  async updateStatus(
    id: string,
    status: Chargeback["status"],
  ): Promise<Chargeback> {
    const { data, error } = await supabase
      .from(TABLES.CHARGEBACKS)
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update chargeback status: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.CHARGEBACKS)
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete chargeback: ${error.message}`);
    }
  }

  async getTotalChargebackAmount(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    let query = supabase.from(TABLES.CHARGEBACKS).select("chargeback_amount");

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (startDate) {
      query = query.gte("chargeback_date", formatDateForDB(startDate));
    }

    if (endDate) {
      query = query.lte("chargeback_date", formatDateForDB(endDate));
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Failed to calculate total chargeback amount: ${error.message}`,
      );
    }

    return (
      data?.reduce(
        (total, chargeback) => total + parseFloat(chargeback.chargeback_amount),
        0,
      ) || 0
    );
  }

  async getChargebacksByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Chargeback[]> {
    const { data, error } = await supabase
      .from(TABLES.CHARGEBACKS)
      .select("*")
      .gte("chargeback_date", formatDateForDB(startDate))
      .lte("chargeback_date", formatDateForDB(endDate))
      .order("chargeback_date", { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch chargebacks by date range: ${error.message}`,
      );
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByCommissionId(commissionId: string): Promise<Chargeback[]> {
    const { data, error } = await supabase
      .from(TABLES.CHARGEBACKS)
      .select("*")
      .eq("commission_id", commissionId)
      .order("chargeback_date", { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch chargebacks for commission: ${error.message}`,
      );
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByCommissionIds(commissionIds: string[]): Promise<Chargeback[]> {
    if (commissionIds.length === 0) return [];

    const { data, error } = await supabase
      .from(TABLES.CHARGEBACKS)
      .select("*")
      .in("commission_id", commissionIds)
      .order("chargeback_date", { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch chargebacks for commissions: ${error.message}`,
      );
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getChargebackMetrics(userId?: string): Promise<{
    totalAmount: number;
    count: number;
    pendingAmount: number;
    processedAmount: number;
  }> {
    let query = supabase
      .from(TABLES.CHARGEBACKS)
      .select("chargeback_amount, status");

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch chargeback metrics: ${error.message}`);
    }

    const metrics = {
      totalAmount: 0,
      count: data?.length || 0,
      pendingAmount: 0,
      processedAmount: 0,
    };

    data?.forEach((chargeback) => {
      const amount = parseFloat(chargeback.chargeback_amount);
      metrics.totalAmount += amount;

      if (chargeback.status === "pending" || chargeback.status === "disputed") {
        metrics.pendingAmount += amount;
      } else if (
        chargeback.status === "processed" ||
        chargeback.status === "resolved"
      ) {
        metrics.processedAmount += amount;
      }
    });

    return metrics;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB record has dynamic schema
  private transformFromDB(dbRecord: any): Chargeback {
    return {
      id: dbRecord.id,
      policyId: dbRecord.policy_id,
      commissionId: dbRecord.commission_id,
      userId: dbRecord.user_id,
      chargebackType: dbRecord.chargeback_type,
      chargebackAmount: parseFloat(dbRecord.chargeback_amount),
      chargebackReason: dbRecord.chargeback_reason,
      policyLapseDate: dbRecord.policy_lapse_date
        ? new Date(dbRecord.policy_lapse_date)
        : undefined,
      chargebackDate: new Date(dbRecord.chargeback_date),
      status: dbRecord.status,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- return type varies based on processing
  private transformToDB(data: CreateChargebackData): any {
    return {
      policy_id: data.policyId,
      commission_id: data.commissionId,
      user_id: data.userId,
      chargeback_type: data.chargebackType,
      chargeback_amount: data.chargebackAmount,
      chargeback_reason: data.chargebackReason,
      policy_lapse_date: data.policyLapseDate
        ? formatDateForDB(data.policyLapseDate)
        : null,
      chargeback_date: formatDateForDB(data.chargebackDate),
      status: data.status || "pending",
      // Multi-tenant fields
      imo_id: data.imoId,
    };
  }
}

export const chargebackService = new ChargebackService();
