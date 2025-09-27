import { supabase, TABLES } from './supabase';
import { Policy, NewPolicyForm, PolicyFilters, CreatePolicyData, UpdatePolicyData } from '../types/policy.types';

class PolicyService {
  async getAll(): Promise<Policy[]> {
    const { data, error } = await supabase
      .from(TABLES.POLICIES)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch policies: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getById(id: string): Promise<Policy | null> {
    const { data, error } = await supabase
      .from(TABLES.POLICIES)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch policy: ${error.message}`);
    }

    return data ? this.transformFromDB(data) : null;
  }

  async create(policyData: CreatePolicyData): Promise<Policy> {
    const dbData = this.transformToDB(policyData);

    const { data, error } = await supabase
      .from(TABLES.POLICIES)
      .insert([dbData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create policy: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async update(id: string, updates: Partial<CreatePolicyData>): Promise<Policy> {
    const dbData = this.transformToDB(updates, true);

    const { data, error } = await supabase
      .from(TABLES.POLICIES)
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update policy: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.POLICIES)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete policy: ${error.message}`);
    }
  }

  async getFiltered(filters: PolicyFilters): Promise<Policy[]> {
    let query = supabase
      .from(TABLES.POLICIES)
      .select('*');

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.carrierId) {
      query = query.eq('carrier_id', filters.carrierId);
    }

    if (filters.product) {
      query = query.eq('product', filters.product);
    }

    if (filters.startDate) {
      query = query.gte('effective_date', filters.startDate.toISOString().split('T')[0]);
    }

    if (filters.endDate) {
      query = query.lte('effective_date', filters.endDate.toISOString().split('T')[0]);
    }

    if (filters.minPremium) {
      query = query.gte('annual_premium', filters.minPremium);
    }

    if (filters.maxPremium) {
      query = query.lte('annual_premium', filters.maxPremium);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch filtered policies: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  private transformFromDB(dbRecord: any): Policy {
    return {
      id: dbRecord.id,
      policyNumber: dbRecord.policy_number,
      status: dbRecord.status,
      client: dbRecord.client,
      carrierId: dbRecord.carrier_id,
      agentId: dbRecord.agent_id, // May be undefined - that's ok now
      product: dbRecord.product,
      effectiveDate: new Date(dbRecord.effective_date),
      termLength: dbRecord.term_length,
      expirationDate: dbRecord.expiration_date ? new Date(dbRecord.expiration_date) : undefined,
      annualPremium: parseFloat(dbRecord.annual_premium),
      monthlyPremium: dbRecord.monthly_premium ? parseFloat(dbRecord.monthly_premium) : undefined,
      paymentFrequency: dbRecord.payment_frequency,
      commissionPercentage: parseFloat(dbRecord.commission_percentage),
      advanceMonths: dbRecord.advance_months,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at),
      created_at: dbRecord.created_at ? new Date(dbRecord.created_at) : undefined,
      updated_at: dbRecord.updated_at ? new Date(dbRecord.updated_at) : undefined,
      createdBy: dbRecord.created_by,
      notes: dbRecord.notes,
    };
  }

  private transformToDB(data: Partial<CreatePolicyData>, isUpdate = false): any {
    const dbData: any = {};

    if (data.policyNumber !== undefined) dbData.policy_number = data.policyNumber;
    if (data.client !== undefined) dbData.client = data.client;
    if (data.carrierId !== undefined) dbData.carrier_id = data.carrierId;
    if (data.product !== undefined) dbData.product = data.product;
    if (data.effectiveDate !== undefined) dbData.effective_date = data.effectiveDate.toISOString().split('T')[0];
    if (data.termLength !== undefined) dbData.term_length = data.termLength;
    if (data.expirationDate !== undefined) dbData.expiration_date = data.expirationDate?.toISOString().split('T')[0];
    if (data.annualPremium !== undefined) dbData.annual_premium = data.annualPremium;
    if (data.paymentFrequency !== undefined) dbData.payment_frequency = data.paymentFrequency;
    if (data.commissionPercentage !== undefined) dbData.commission_percentage = data.commissionPercentage;
    if (data.notes !== undefined) dbData.notes = data.notes;

    return dbData;
  }
}

export const policyService = new PolicyService();
