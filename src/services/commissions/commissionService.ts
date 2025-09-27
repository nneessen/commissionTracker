import { supabase, TABLES } from '../base/supabase';
import { Commission, CommissionFilters, NewCommissionForm } from '../../types/commission.types';
import { RISK_SCORE_WEIGHTS, CHARGEBACK_THRESHOLDS, RISK_LEVELS } from '../../constants/financial';

// src/services/commissionService.ts

export interface ChargebackRisk {
  riskLevel: 'low' | 'medium' | 'high';
  monthsSincePaid: number;
  chargebackGracePeriod: number;
  hasActiveChargebacks: boolean;
  potentialChargebackAmount: number;
  riskFactors: string[];
}

export interface CommissionWithChargebackRisk {
  commission: Commission;
  chargeback_risk: ChargebackRisk;
  existing_chargebacks: any[];
}

export interface CreateCommissionData {
  policyId?: string;
  agentId?: string; // Links to Agent for comp level lookup
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
  
  // Financial - Enhanced for 9-month advance model
  annualPremium: number;
  monthlyPremium?: number; // Optional - derived from annualPremium if not provided
  commissionAmount?: number; // Optional - can be auto-calculated
  commissionRate?: number; // Optional - can be auto-calculated from comp guide
  advanceMonths?: number; // Defaults to 9
  
  // Comp Guide Integration
  contractCompLevel?: number; // Agent's contract level override
  isAutoCalculated?: boolean; // True if using comp guide lookup
  compGuidePercentage?: number; // Store original comp guide percentage
  
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

  // Automated Commission Calculation Methods
  async calculateCommissionWithCompGuide(data: {
    carrierId: string;
    product: string;
    monthlyPremium: number;
    agentId?: string;
    contractCompLevel?: number;
    advanceMonths?: number;
  }): Promise<{
    commissionAmount: number;
    commissionRate: number;
    compGuidePercentage: number;
    isAutoCalculated: boolean;
    contractCompLevel: number;
  } | null> {
    const { compGuideService, agentService, carrierService } = await import('../index');
    
    // Get carrier name for comp guide lookup
    const carrier = await carrierService.getById(data.carrierId);
    if (!carrier) {
      throw new Error('Carrier not found');
    }

    // Determine contract comp level
    let contractCompLevel = data.contractCompLevel;
    if (!contractCompLevel && data.agentId) {
      const agent = await agentService.getById(data.agentId);
      if (agent) {
        contractCompLevel = agent.contractCompLevel;
      }
    }

    if (!contractCompLevel) {
      return null; // Cannot calculate without contract comp level
    }

    // Map product types to comp guide product names
    const compGuideProductName = this.mapProductToCompGuideName(data.product);
    if (!compGuideProductName) {
      return null; // Product not found in comp guide
    }

    // Get commission percentage from comp guide
    const commissionCalculation = await compGuideService.calculateCommission(
      data.monthlyPremium,
      carrier.name,
      compGuideProductName,
      contractCompLevel,
      data.advanceMonths || 9
    );

    if (!commissionCalculation) {
      return null; // No comp guide entry found
    }

    return {
      commissionAmount: commissionCalculation.totalCommission,
      commissionRate: commissionCalculation.commissionPercentage,
      compGuidePercentage: commissionCalculation.commissionPercentage,
      isAutoCalculated: true,
      contractCompLevel,
    };
  }

  async createWithAutoCalculation(commissionData: CreateCommissionData): Promise<Commission> {
    let finalData = { ...commissionData };

    // Derive monthlyPremium from annualPremium if not provided
    if (!finalData.monthlyPremium && finalData.annualPremium) {
      finalData.monthlyPremium = finalData.annualPremium / 12;
    }

    // If auto-calculation is requested and we have the required data
    if (commissionData.isAutoCalculated !== false && 
        commissionData.carrierId && 
        commissionData.product && 
        finalData.monthlyPremium && finalData.monthlyPremium > 0) {
      
      const calculation = await this.calculateCommissionWithCompGuide({
        carrierId: commissionData.carrierId,
        product: commissionData.product,
        monthlyPremium: finalData.monthlyPremium,
        agentId: commissionData.agentId,
        contractCompLevel: commissionData.contractCompLevel,
        advanceMonths: commissionData.advanceMonths,
      });

      if (calculation) {
        finalData = {
          ...finalData,
          commissionAmount: calculation.commissionAmount,
          commissionRate: calculation.commissionRate,
          compGuidePercentage: calculation.compGuidePercentage,
          isAutoCalculated: calculation.isAutoCalculated,
          contractCompLevel: calculation.contractCompLevel,
          advanceMonths: commissionData.advanceMonths || 9,
        };
      } else {
        // Fall back to manual calculation if auto-calculation fails
        finalData.isAutoCalculated = false;
      }
    }

    // Ensure required fields are set
    if (!finalData.commissionAmount && finalData.monthlyPremium && finalData.commissionRate) {
      const advanceMonths = finalData.advanceMonths || 9;
      finalData.commissionAmount = finalData.monthlyPremium * advanceMonths * (finalData.commissionRate / 100);
    }

    if (!finalData.advanceMonths) {
      finalData.advanceMonths = 9;
    }

    if (finalData.isAutoCalculated === undefined) {
      finalData.isAutoCalculated = false;
    }

    return this.create(finalData);
  }

  async recalculateCommission(commissionId: string, newContractLevel?: number): Promise<Commission> {
    const commission = await this.getById(commissionId);
    if (!commission) {
      throw new Error('Commission not found');
    }

    if (!commission.isAutoCalculated) {
      throw new Error('Cannot recalculate manually entered commission');
    }

    const monthlyPremium = commission.monthlyPremium || commission.annualPremium / 12;

    const calculation = await this.calculateCommissionWithCompGuide({
      carrierId: commission.carrierId,
      product: commission.product,
      monthlyPremium: monthlyPremium,
      agentId: commission.agentId,
      contractCompLevel: newContractLevel || commission.contractCompLevel,
      advanceMonths: commission.advanceMonths,
    });

    if (!calculation) {
      throw new Error('Unable to recalculate commission - comp guide data not found');
    }

    return this.update(commissionId, {
      commissionAmount: calculation.commissionAmount,
      commissionRate: calculation.commissionRate,
      compGuidePercentage: calculation.compGuidePercentage,
      contractCompLevel: calculation.contractCompLevel,
    });
  }

  private mapProductToCompGuideName(productType: string): string | null {
    // Map our ProductType enum values to comp guide product names
    const productMapping: Record<string, string> = {
      'whole_life': 'Provider Whole Life',
      'term': 'Term Life',
      'universal_life': 'Express UL',
      'indexed_universal_life': 'Express Issue Premier WL',
      'accidental': 'Accidental Death',
      'final_expense': 'Final Expense',
      'annuity': 'Annuity',
    };

    return productMapping[productType] || null;
  }

  async getCommissionsByAgent(agentId: string): Promise<Commission[]> {
    const { data, error } = await supabase
      .from(TABLES.COMMISSIONS)
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch commissions for agent: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getCommissionMetrics(agentId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalCommissions: number;
    totalAmount: number;
    avgCommissionRate: number;
    autoCalculatedCount: number;
    manualCount: number;
  }> {
    let query = supabase
      .from(TABLES.COMMISSIONS)
      .select('commission_amount, commission_rate, is_auto_calculated');

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch commission metrics: ${error.message}`);
    }

    const metrics = {
      totalCommissions: data?.length || 0,
      totalAmount: 0,
      avgCommissionRate: 0,
      autoCalculatedCount: 0,
      manualCount: 0,
    };

    if (data && data.length > 0) {
      let totalRate = 0;
      
      data.forEach((commission) => {
        const amount = parseFloat(commission.commission_amount);
        const rate = parseFloat(commission.commission_rate);
        
        metrics.totalAmount += amount;
        totalRate += rate;
        
        if (commission.is_auto_calculated) {
          metrics.autoCalculatedCount++;
        } else {
          metrics.manualCount++;
        }
      });

      metrics.avgCommissionRate = totalRate / data.length;
    }

    return metrics;
  }

  // Chargeback Integration Methods
  async getChargebackRisk(commissionId: string): Promise<ChargebackRisk> {
    const commission = await this.getById(commissionId);
    if (!commission) {
      throw new Error('Commission not found');
    }

    const { chargebackService } = await import('./index');
    
    // Use standard chargeback grace period (24 months)
    const chargebackGracePeriod = 24;

    // Calculate months since commission was paid
    const monthsSincePaid = commission.paidDate 
      ? Math.floor((Date.now() - commission.paidDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0;

    // Check for existing chargebacks
    const existingChargebacks = await chargebackService.getByCommissionId(commission.id);
    const hasActiveChargebacks = existingChargebacks.some(cb => 
      cb.status === 'pending' || cb.status === 'disputed'
    );

    // Calculate risk factors
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Time-based risk
    if (monthsSincePaid < 6) {
      riskFactors.push('Recent payment - higher lapse risk');
      riskScore += 3;
    } else if (monthsSincePaid < 12) {
      riskFactors.push('Within first year - moderate lapse risk');
      riskScore += 2;
    } else if (monthsSincePaid >= chargebackGracePeriod) {
      riskFactors.push('Beyond grace period - low risk');
      riskScore -= 2;
    }

    // Commission amount risk
    if (commission.commissionAmount > 5000) {
      riskFactors.push('High commission amount');
      riskScore += 2;
    }

    // Existing chargeback risk
    if (hasActiveChargebacks) {
      riskFactors.push('Has active chargebacks');
      riskScore += 3;
    }

    // Auto-calculated vs manual commission risk
    if (!commission.isAutoCalculated) {
      riskFactors.push('Manually calculated commission');
      riskScore += 1;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore <= 1) {
      riskLevel = 'low';
    } else if (riskScore <= 4) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    return {
      riskLevel,
      monthsSincePaid,
      chargebackGracePeriod,
      hasActiveChargebacks,
      potentialChargebackAmount: commission.commissionAmount,
      riskFactors,
    };
  }

  private calculateChargebackRiskForCommission(commission: Commission, existingChargebacks: any[]): ChargebackRisk {
    // Use standard chargeback grace period
    const chargebackGracePeriod = CHARGEBACK_THRESHOLDS.GRACE_PERIOD_MONTHS;

    // Calculate months since commission was paid
    const monthsSincePaid = commission.paidDate
      ? Math.floor((Date.now() - commission.paidDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0;

    // Check for existing chargebacks
    const hasActiveChargebacks = existingChargebacks.some(cb =>
      cb.status === 'pending' || cb.status === 'disputed'
    );

    // Calculate risk factors
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Time-based risk
    if (monthsSincePaid < CHARGEBACK_THRESHOLDS.RECENT_PAYMENT_MONTHS) {
      riskFactors.push('Recent payment - higher lapse risk');
      riskScore += RISK_SCORE_WEIGHTS.RECENT_PAYMENT;
    } else if (monthsSincePaid < CHARGEBACK_THRESHOLDS.FIRST_YEAR_MONTHS) {
      riskFactors.push('Within first year - moderate lapse risk');
      riskScore += RISK_SCORE_WEIGHTS.FIRST_YEAR_PAYMENT;
    } else if (monthsSincePaid >= chargebackGracePeriod) {
      riskFactors.push('Beyond grace period - low risk');
      riskScore -= 2;
    }

    // Commission amount risk
    if (commission.commissionAmount > CHARGEBACK_THRESHOLDS.HIGH_COMMISSION_AMOUNT) {
      riskFactors.push('High commission amount');
      riskScore += RISK_SCORE_WEIGHTS.HIGH_COMMISSION_AMOUNT;
    }

    // Existing chargeback risk
    if (hasActiveChargebacks) {
      riskFactors.push('Has active chargebacks');
      riskScore += RISK_SCORE_WEIGHTS.ACTIVE_CHARGEBACK;
    }

    // Auto-calculated vs manual commission risk
    if (!commission.isAutoCalculated) {
      riskFactors.push('Manually calculated commission');
      riskScore += RISK_SCORE_WEIGHTS.MANUAL_CALCULATION;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore <= RISK_LEVELS.LOW_THRESHOLD) {
      riskLevel = 'low';
    } else if (riskScore <= RISK_LEVELS.MEDIUM_THRESHOLD) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    return {
      riskLevel,
      monthsSincePaid,
      chargebackGracePeriod,
      hasActiveChargebacks,
      potentialChargebackAmount: commission.commissionAmount,
      riskFactors,
    };
  }

  async createChargebackForCommission(
    commissionId: string,
    chargebackData: {
      chargebackType: 'policy_lapse' | 'refund' | 'cancellation';
      chargebackAmount?: number;
      chargebackReason?: string;
      policyLapseDate?: Date;
      chargebackDate: Date;
    }
  ): Promise<any> {
    const commission = await this.getById(commissionId);
    if (!commission) {
      throw new Error('Commission not found');
    }

    const { chargebackService } = await import('./index');

    return chargebackService.create({
      policyId: commission.policyId || '',
      commissionId: commission.id,
      agentId: commission.agentId,
      chargebackType: chargebackData.chargebackType,
      chargebackAmount: chargebackData.chargebackAmount || commission.commissionAmount,
      chargebackReason: chargebackData.chargebackReason,
      policyLapseDate: chargebackData.policyLapseDate,
      chargebackDate: chargebackData.chargebackDate,
    });
  }

  async getCommissionsWithChargebackRisk(agentId?: string): Promise<CommissionWithChargebackRisk[]> {
    // Fetch all commissions first
    const commissions = agentId ? await this.getCommissionsByAgent(agentId) : await this.getAll();
    if (commissions.length === 0) return [];

    const { chargebackService } = await import('./index');
    const commissionIds = commissions.map(c => c.id);

    // Single query for all chargebacks
    const allChargebacks = await chargebackService.getByCommissionIds(commissionIds);

    // Group chargebacks by commission ID
    const chargebacksByCommissionId = allChargebacks.reduce((acc, cb) => {
      (acc[cb.commissionId] = acc[cb.commissionId] || []).push(cb);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate risk for each commission using the grouped data
    return commissions.map(commission => {
      const existingChargebacks = chargebacksByCommissionId[commission.id] || [];
      const chargebackRisk = this.calculateChargebackRiskForCommission(commission, existingChargebacks);
      return {
        commission,
        chargeback_risk: chargebackRisk,
        existing_chargebacks: existingChargebacks,
      };
    });
  }

  async calculateNetCommissionAfterChargebacks(
    agentId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCommissions: number;
    totalChargebacks: number;
    netIncome: number;
    chargebackRate: number;
    riskAdjustedProjection: number;
  }> {
    const metrics = await this.getCommissionMetrics(agentId, startDate, endDate);
    const { chargebackService } = await import('./index');
    
    const chargebackMetrics = await chargebackService.getChargebackMetrics(agentId);
    
    const chargebackRate = metrics.totalAmount > 0 
      ? (chargebackMetrics.totalAmount / metrics.totalAmount) * 100 
      : 0;
    
    const netIncome = metrics.totalAmount - chargebackMetrics.totalAmount;
    
    // Risk-adjusted projection assumes future chargeback rate will be similar
    const pendingRisk = chargebackMetrics.pendingAmount;
    const riskAdjustedProjection = netIncome - pendingRisk;

    return {
      totalCommissions: metrics.totalAmount,
      totalChargebacks: chargebackMetrics.totalAmount,
      netIncome,
      chargebackRate,
      riskAdjustedProjection,
    };
  }

  private transformFromDB(dbRecord: any): Commission {
    return {
      id: dbRecord.id,
      policyId: dbRecord.policy_id,
      agentId: dbRecord.agent_id,
      client: dbRecord.client,
      carrierId: dbRecord.carrier_id,
      product: dbRecord.product,
      type: dbRecord.type,
      status: dbRecord.status,
      calculationBasis: dbRecord.calculation_basis,
      annualPremium: parseFloat(dbRecord.annual_premium),
      monthlyPremium: parseFloat(dbRecord.monthly_premium || dbRecord.annual_premium / 12),
      commissionAmount: parseFloat(dbRecord.commission_amount),
      commissionRate: parseFloat(dbRecord.commission_rate),
      advanceMonths: dbRecord.advance_months || 9,
      contractCompLevel: dbRecord.contract_comp_level,
      isAutoCalculated: dbRecord.is_auto_calculated || false,
      compGuidePercentage: dbRecord.comp_guide_percentage ? parseFloat(dbRecord.comp_guide_percentage) : undefined,
      expectedDate: dbRecord.expected_date ? new Date(dbRecord.expected_date) : undefined,
      actualDate: dbRecord.actual_date ? new Date(dbRecord.actual_date) : undefined,
      paidDate: dbRecord.paid_date ? new Date(dbRecord.paid_date) : undefined,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: dbRecord.updated_at ? new Date(dbRecord.updated_at) : new Date(),
      notes: dbRecord.notes,
    };
  }

  private transformToDB(data: Partial<CreateCommissionData>, isUpdate = false): any {
    const dbData: any = {};

    if (data.policyId !== undefined) dbData.policy_id = data.policyId;
    if (data.agentId !== undefined) dbData.agent_id = data.agentId;
    if (data.client !== undefined) dbData.client = data.client;
    if (data.carrierId !== undefined) dbData.carrier_id = data.carrierId;
    if (data.product !== undefined) dbData.product = data.product;
    if (data.type !== undefined) dbData.type = data.type;
    if (data.status !== undefined) dbData.status = data.status;
    if (data.calculationBasis !== undefined) dbData.calculation_basis = data.calculationBasis;
    if (data.annualPremium !== undefined) dbData.annual_premium = data.annualPremium;
    
    // Handle monthlyPremium - derive from annualPremium if not provided
    if (data.monthlyPremium !== undefined) {
      dbData.monthly_premium = data.monthlyPremium;
    } else if (data.annualPremium !== undefined) {
      dbData.monthly_premium = data.annualPremium / 12;
    }
    
    if (data.commissionAmount !== undefined) dbData.commission_amount = data.commissionAmount;
    if (data.commissionRate !== undefined) dbData.commission_rate = data.commissionRate;
    if (data.advanceMonths !== undefined) dbData.advance_months = data.advanceMonths;
    if (data.contractCompLevel !== undefined) dbData.contract_comp_level = data.contractCompLevel;
    if (data.isAutoCalculated !== undefined) dbData.is_auto_calculated = data.isAutoCalculated;
    if (data.compGuidePercentage !== undefined) dbData.comp_guide_percentage = data.compGuidePercentage;
    if (data.expectedDate !== undefined) dbData.expected_date = data.expectedDate?.toISOString().split('T')[0];
    if (data.actualDate !== undefined) dbData.actual_date = data.actualDate?.toISOString().split('T')[0];
    if (data.paidDate !== undefined) dbData.paid_date = data.paidDate?.toISOString().split('T')[0];
    if (data.notes !== undefined) dbData.notes = data.notes;

    return dbData;
  }
}

export { CommissionService };
export const commissionService = new CommissionService();