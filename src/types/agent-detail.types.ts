// src/types/agent-detail.types.ts
// Strongly typed interfaces for Agent Detail Modal data structures

export interface AgentDetails {
  id: string;
  email: string;
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  avgPremium: number;
  persistencyRate: number;
  performanceScore: number;
  uplineEmail: string | null;
  joinDate: string;
  isActive: boolean;
  overridesGenerated: number;

  // Optional calculated fields
  ytdPremium?: number;
  ytdPolicies?: number;
  annualTarget?: number;
  policyTarget?: number;

  // Activity and trends
  recentActivity?: AgentActivity[];
  activityHistory?: AgentActivity[];
  monthlyTrends?: MonthlyTrend[];
  productMix?: ProductMixItem[];
}

export interface AgentActivity {
  type: "policy" | "commission" | "override" | "other";
  category?: "policy" | "commission" | "override";
  title: string;
  description: string;
  timestamp?: string;
  date?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic metadata shape
  metadata?: Record<string, any>;
}

export interface MonthlyTrend {
  month: string;
  premium: number;
  policies: number;
  percentOfBest: number;
}

export interface ProductMixItem {
  name: string;
  product: string;
  count: number;
  premium: number;
  percentage: number;
}

export interface AgentPoliciesData {
  total: number;
  active: number;
  policies: AgentPolicy[];
}

export interface AgentPolicy {
  id: string;
  policyNumber: string;
  clientName: string;
  product: string;
  carrier: string;
  annualPremium: number;
  /** Application status: pending, approved, denied, withdrawn */
  status: string;
  /** Lifecycle status for issued policies: active, lapsed, cancelled, expired (null when pending) */
  lifecycleStatus: string | null;
  issueDate: string;
}

export interface AgentCommissionsData {
  totalEarned: number;
  pending: number;
  paid: number;
  advances: number;
  chargebacks: number;
  recent: AgentCommission[];
}

export interface AgentCommission {
  id: string;
  date: string;
  policyNumber: string;
  type: string;
  amount: number;
  status: "pending" | "earned" | "paid";
}

export interface AgentOverridesData {
  mtd: number;
  ytd: number;
}

export interface TeamComparisonData {
  premiumRank: number;
  policyRank: number;
  persistencyRank: number;
  totalAgents: number;
  premiumPercentile: number;
  policyPercentile: number;
  persistencyPercentile: number;
  avgPremium: number;
  avgPolicies: number;
  avgPersistency: number;
  topPeers: PeerPerformance[];
}

export interface PeerPerformance {
  id: string;
  email: string;
  premium: number;
  policies: number;
  persistency: number;
}
