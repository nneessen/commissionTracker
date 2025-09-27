import { supabase, TABLES } from './supabase';
import { Commission, CommissionFilters, NewCommissionForm } from '../types/commission.types';

export interface CreateCommissionData {
  policyId?: string;
  client: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  carrierId: string;
  product: string;
  type: string;
  status: string;
  calculationBasis: string;
  annualPremium: number;
  commissionAmount: number;
  commissionRate: number;
  expectedDate?: Date;
  actualDate?: Date;
  paidDate?: Date;
  notes?: string;
}

export interface UpdateCommissionData extends Partial<CreateCommissionData> {
  id: string;
}

class CommissionService {
  async getAll(): Promise<Commission[]> {
    const { data, error } = await supabase
      .from(TABLES.COMMISSIONS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch commissions: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getById(id: string): Promise<Commission | null> {
    const { data, error } = await supabase
      .from(TABLES.COMMISSIONS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch commission: ${error.message}`);
    }

    return data ? this.transformFromDB(data) : null;
  }

  async create(commissionData: CreateCommissionData): Promise<Commission> {
    const dbData = this.transformToDB(commissionData);

    const { data, error } = await supabase
      .from(TABLES.COMMISSIONS)
      .insert([dbData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create commission: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async update(id: string, updates: Partial<CreateCommissionData>): Promise<Commission> {
    const dbData = this.transformToDB(updates, true);

    const { data, error } = await supabase
      .from(TABLES.COMMISSIONS)
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update commission: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.COMMISSIONS)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete commission: ${error.message}`);
    }
  }

  async getFiltered(filters: CommissionFilters): Promise<Commission[]> {
    let query = supabase
      .from(TABLES.COMMISSIONS)
      .select('*');

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    if (filters.carrierId) {
      query = query.eq('carrier_id', filters.carrierId);
    }

    if (filters.product) {
      query = query.eq('product', filters.product);
    }

    if (filters.state) {
      query = query.contains('client', { state: filters.state });
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.minPremium) {
      query = query.gte('annual_premium', filters.minPremium);
    }

    if (filters.maxPremium) {
      query = query.lte('annual_premium', filters.maxPremium);
    }

    if (filters.policyId) {
      query = query.eq('policy_id', filters.policyId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch filtered commissions: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByPolicyId(policyId: string): Promise<Commission[]> {
    const { data, error } = await supabase
      .from(TABLES.COMMISSIONS)
      .select('*')
      .eq('policy_id', policyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch commissions for policy: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  private transformFromDB(dbRecord: any): Commission {
    return {
      id: dbRecord.id,
      policyId: dbRecord.policy_id,
      client: dbRecord.client,
      carrierId: dbRecord.carrier_id,
      product: dbRecord.product,
      type: dbRecord.type,
      status: dbRecord.status,
      calculationBasis: dbRecord.calculation_basis,
      annualPremium: parseFloat(dbRecord.annual_premium),
      commissionAmount: parseFloat(dbRecord.commission_amount),
      commissionRate: parseFloat(dbRecord.commission_rate),
      expectedDate: dbRecord.expected_date ? new Date(dbRecord.expected_date) : undefined,
      actualDate: dbRecord.actual_date ? new Date(dbRecord.actual_date) : undefined,
      paidDate: dbRecord.paid_date ? new Date(dbRecord.paid_date) : undefined,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: dbRecord.updated_at ? new Date(dbRecord.updated_at) : undefined,
      notes: dbRecord.notes,
    };
  }

  private transformToDB(data: Partial<CreateCommissionData>, isUpdate = false): any {
    const dbData: any = {};

    if (data.policyId !== undefined) dbData.policy_id = data.policyId;
    if (data.client !== undefined) dbData.client = data.client;
    if (data.carrierId !== undefined) dbData.carrier_id = data.carrierId;
    if (data.product !== undefined) dbData.product = data.product;
    if (data.type !== undefined) dbData.type = data.type;
    if (data.status !== undefined) dbData.status = data.status;
    if (data.calculationBasis !== undefined) dbData.calculation_basis = data.calculationBasis;
    if (data.annualPremium !== undefined) dbData.annual_premium = data.annualPremium;
    if (data.commissionAmount !== undefined) dbData.commission_amount = data.commissionAmount;
    if (data.commissionRate !== undefined) dbData.commission_rate = data.commissionRate;
    if (data.expectedDate !== undefined) dbData.expected_date = data.expectedDate?.toISOString().split('T')[0];
    if (data.actualDate !== undefined) dbData.actual_date = data.actualDate?.toISOString().split('T')[0];
    if (data.paidDate !== undefined) dbData.paid_date = data.paidDate?.toISOString().split('T')[0];
    if (data.notes !== undefined) dbData.notes = data.notes;

    return dbData;
  }
}

export const commissionService = new CommissionService();