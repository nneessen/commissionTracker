// /home/nneessen/projects/commissionTracker/src/types/metrics.types.ts

import { ProductType } from './commission.types';

export interface ClientMetrics {
  totalClients: number;
  averagePoliciesPerClient: number;
  clientLifetimeValue: number;
  retentionRate: number | null;
  averageAge: number;
  averageLifetimeValue: number;
  stateDistribution: Record<string, number>;
  topClients: Array<{
    name: string;
    value: number;
    policies: number;
  }>;
  topStatesByClientCount: Array<{
    state: string;
    count: number;
    percentage: number;
  }>;
  ageDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  newClientsThisMonth: number;
  newClientsThisYear: number;
}

export interface PolicyMetrics {
  totalPolicies: number;
  activePolicies: number;
  pendingPolicies: number;
  lapsedPolicies: number;
  retentionRate: number;
  expiringPolicies: number;
  lapsedRate: number;
  cancellationRate: number;
  averagePolicySize: number;
  averagePremium: number;
  totalAnnualPremium: number;
  statusBreakdown: Record<string, number>;
  premiumByProduct: Record<ProductType, number>;
  policyDistributionByCarrier: Array<{
    carrierId: string;
    carrierName: string;
    count: number;
    percentage: number;
  }>;
  monthlyNewPolicies: Array<{
    month: string;
    count: number;
    premium: number;
  }>;
  averageTermLength: number;
  policiesExpiringThisMonth: number;
  policiesExpiringThisQuarter: number;
}

export interface CommissionMetrics {
  totalEarned: number;
  totalPending: number;
  yearOverYearGrowth: number;
  monthlyEarnings: Array<{
    label: string;
    value: number;
  }>;
  commissionByType: Record<string, number>;
  totalEarnedCommission: number;
  projectedAnnualCommission: number;
  averageCommissionPerPolicy: number;
  averageCommissionRate: number;
  commissionByCarrier: Array<{
    carrierId: string;
    carrierName: string;
    amount: number;
    percentage: number;
  }>;
  commissionByProduct: Array<{
    product: ProductType;
    amount: number;
    percentage: number;
  }>;
  commissionTrends: Array<{
    period: string;
    amount: number;
    policyCount: number;
  }>;
  topPerformingProducts: Array<{
    product: ProductType;
    revenue: number;
    policyCount: number;
  }>;
  pendingCommissions: number;
  paidCommissions: number;
  expectedCommissionsNext30Days: number;
  expectedCommissionsNext90Days: number;
}

export interface CarrierPerformanceMetrics {
  carrierId: string;
  carrierName: string;
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  totalCommission: number;
  averageCommissionRate: number;
  averagePolicySize: number;
  retentionRate: number;
  productMix: Array<{
    product: ProductType;
    count: number;
    percentage: number;
  }>;
}

export interface ForecastMetrics {
  projectedNextQuarter: number;
  projectedNextYear: number;
  monthlyGrowthRate: number;
  pipelineValue: number;
  expectedRenewals: number;
  growthOpportunities: {
    highValueProducts: string[];
    underperformingCarriers: string[];
    expandableStates: string[];
  };
  projectedMonthlyCommission: Array<{
    month: string;
    projected: number;
    confidence: 'high' | 'medium' | 'low';
  }>;
  projectedAnnualRevenue: number;
  projectedClientGrowth: number;
  projectedPolicyGrowth: number;
  renewalForecast: Array<{
    month: string;
    expectedRenewals: number;
    expectedRevenue: number;
  }>;
}

export interface DashboardMetrics {
  client: ClientMetrics;
  policy: PolicyMetrics;
  commission: CommissionMetrics;
  topCarriers: CarrierPerformanceMetrics[];
  forecast?: ForecastMetrics;
  lastUpdated: Date;
}

export type MetricPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface MetricFilter {
  period: MetricPeriod;
  startDate?: Date;
  endDate?: Date;
  carrierId?: string;
  product?: ProductType;
  includeForecasts?: boolean;
}

export interface TimeSeriesData {
  label: string;
  value: number;
}

export interface ProductPerformance {
  product: ProductType;
  policies: number;
  revenue: number;
  averageSize: number;
}

export interface CarrierPerformance {
  carrierId: string;
  carrierName: string;
  policies: number;
  revenue: number;
  averageCommission: number;
}

export interface StatePerformance {
  state: string;
  policies: number;
  revenue: number;
  averageSize: number;
}