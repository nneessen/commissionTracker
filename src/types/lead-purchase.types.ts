// src/types/lead-purchase.types.ts
import type { Database } from "./database.types";

// Database row types
type LeadVendorRow = Database["public"]["Tables"]["lead_vendors"]["Row"];
type LeadVendorInsert = Database["public"]["Tables"]["lead_vendors"]["Insert"];
type LeadVendorUpdate = Database["public"]["Tables"]["lead_vendors"]["Update"];

type LeadPurchaseRow = Database["public"]["Tables"]["lead_purchases"]["Row"];
type LeadPurchaseInsert =
  Database["public"]["Tables"]["lead_purchases"]["Insert"];
type LeadPurchaseUpdate =
  Database["public"]["Tables"]["lead_purchases"]["Update"];

// Lead freshness enum
export type LeadFreshness = Database["public"]["Enums"]["lead_freshness"];

// Lead source type (re-exported for convenience)
export type LeadSourceType = Database["public"]["Enums"]["lead_source_type"];

// Lead source selection for the dialog
export interface LeadSourceSelection {
  sourceType: LeadSourceType | null;
  leadPurchaseId?: string; // Only set when sourceType = 'lead_purchase'
}

// =============================================================================
// LEAD VENDOR TYPES
// =============================================================================

export interface LeadVendor {
  id: string;
  imoId: string;
  createdBy: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadVendorData {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  notes?: string | null;
}

export interface UpdateLeadVendorData {
  name?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  notes?: string | null;
}

// =============================================================================
// LEAD PURCHASE TYPES
// =============================================================================

export interface LeadPurchase {
  id: string;
  userId: string;
  imoId: string | null;
  agencyId: string | null;
  expenseId: string | null;
  vendorId: string;
  purchaseName: string | null;
  leadFreshness: LeadFreshness;
  leadCount: number;
  totalCost: number;
  costPerLead: number; // Auto-calculated
  purchaseDate: string;
  policiesSold: number;
  commissionEarned: number;
  roiPercentage: number; // Auto-calculated
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined data
  vendor?: LeadVendor;
}

export interface CreateLeadPurchaseData {
  vendorId: string;
  expenseId?: string | null;
  purchaseName?: string | null;
  leadFreshness?: LeadFreshness;
  leadCount: number;
  totalCost: number;
  purchaseDate: string;
  policiesSold?: number;
  commissionEarned?: number;
  notes?: string | null;
}

export interface UpdateLeadPurchaseData {
  vendorId?: string;
  expenseId?: string | null;
  purchaseName?: string | null;
  leadFreshness?: LeadFreshness;
  leadCount?: number;
  totalCost?: number;
  purchaseDate?: string;
  policiesSold?: number;
  commissionEarned?: number;
  notes?: string | null;
}

// =============================================================================
// STATS & ANALYTICS TYPES
// =============================================================================

export interface LeadPurchaseStats {
  totalPurchases: number;
  totalLeads: number;
  totalSpent: number;
  totalPolicies: number;
  totalCommission: number;
  avgCostPerLead: number;
  avgRoi: number;
  conversionRate: number;
}

export interface VendorStats extends LeadPurchaseStats {
  vendorId: string;
  vendorName: string;
}

// IMO aggregate vendor stats (includes unique users count)
export interface VendorStatsAggregate extends VendorStats {
  uniqueUsers: number;
}

// Vendor with management stats (for admin UI)
export interface VendorWithStats {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  createdAt: string;
  createdBy: string;
  totalPurchases: number;
  totalSpent: number;
  uniqueUsers: number;
}

// Admin-level vendor overview (aggregated across all users)
export interface VendorAdminOverview {
  vendorId: string;
  vendorName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  notes: string | null;
  createdAt: string;
  lastPurchaseDate: string | null;
  totalPurchases: number;
  totalLeads: number;
  totalSpent: number;
  totalPolicies: number;
  totalCommission: number;
  avgCostPerLead: number;
  avgRoi: number;
  conversionRate: number;
  uniqueUsers: number;
  freshLeads: number;
  agedLeads: number;
  freshSpent: number;
  agedSpent: number;
  totalPremium: number;
}

// Per-user breakdown for a specific vendor (admin drill-down)
export interface VendorUserBreakdown {
  userId: string;
  userName: string;
  lastPurchaseDate: string | null;
  totalPurchases: number;
  totalLeads: number;
  totalSpent: number;
  totalPolicies: number;
  totalCommission: number;
  avgCostPerLead: number;
  avgRoi: number;
  conversionRate: number;
  freshLeads: number;
  agedLeads: number;
}

// Individual policy record in a vendor's timeline
export interface VendorPolicyTimelineRecord {
  policyId: string;
  policyNumber: string | null;
  clientName: string;
  product: string;
  submitDate: string;
  effectiveDate: string;
  annualPremium: number;
  status: string;
  agentId: string;
  agentName: string;
}

// Per-vendor heat metrics from SQL (replaces old VendorWeeklyActivity)
export interface VendorHeatMetrics {
  vendorId: string;
  medianDaysToFirstSale: number; // -1 = no data
  avgDaysToFirstSale: number; // -1 = no data
  packsWithSales: number;
  avgDaysBetweenSales: number; // -1 = no data (< 2 sales per pack)
  agentsPurchased30d: number;
  agentsWithSales30d: number;
  avgPoliciesPerPack: number;
  daysSinceLastSale: number; // 999 = never
  salesLast30d: number;
  salesLast90d: number;
  totalPacks90d: number;
  totalLeads90d: number;
  totalPoliciesAllTime: number;
}

// Heat score levels
export type HeatLevel = "hot" | "warming" | "neutral" | "cooling" | "cold";

// Trend direction: is the vendor accelerating or decelerating?
export type TrendDirection =
  | "up"
  | "up-right"
  | "right"
  | "down-right"
  | "down";

// Computed heat score for a vendor
export interface VendorHeatScore {
  vendorId: string;
  score: number;
  level: HeatLevel;
  trend: TrendDirection;
  // Key readable metrics for tooltip
  medianDaysToFirstSale: number;
  avgDaysBetweenSales: number;
  agentSalesRatio30d: string; // e.g. "3/5" (3 of 5 agents sold)
  avgPoliciesPerPack: number;
  daysSinceLastSale: number;
  salesLast30d: number;
  totalPacks90d: number;
  // Component breakdown (each component's contribution to score)
  breakdown: {
    timeToFirstSale: number; // max 25
    interSaleCadence: number; // max 20
    activeAgentRatio: number; // max 15
    packEfficiency: number; // max 15
    recency: number; // max 15
    freshness: number; // max 10
  };
}

// Pack-level row for admin tables (one per lead_purchase)
export interface LeadPackRow {
  packId: string;
  purchaseName: string | null;
  vendorId: string;
  vendorName: string;
  agentId: string;
  agentName: string;
  purchaseDate: string;
  leadFreshness: string;
  leadCount: number;
  totalCost: number;
  costPerLead: number;
  policiesSold: number;
  conversionRate: number;
  commissionEarned: number;
  roiPercentage: number;
  totalPremium: number;
}

// Recent policy row from lead packs
export interface LeadRecentPolicy {
  policyId: string;
  effectiveDate: string | null;
  submitDate: string | null;
  policyNumber: string | null;
  clientName: string;
  clientState: string | null;
  product: string;
  annualPremium: number;
  agentId: string;
  agentName: string;
  vendorId: string;
  vendorName: string;
  packId: string;
  packName: string | null;
  leadFreshness: string;
  status: string;
}

// Per-pack heat metrics from RPC
export interface PackHeatMetrics {
  packId: string;
  vendorId: string;
  totalPremium: number;
  totalCost: number;
  leadCount: number;
  policiesSold: number;
  commissionEarned: number;
  daysSincePurchase: number;
  daysSinceLastSale: number;
  salesLast30d: number;
  daysToFirstSale: number;
}

// V2 heat score with conversion + ROI focus
export interface HeatScoreV2 {
  id: string; // packId or vendorId
  score: number;
  level: HeatLevel;
  trend: TrendDirection;
  breakdown: {
    conversionRate: number; // max 25
    roi: number; // max 20
    premiumPerLead: number; // max 15
    recency: number; // max 15
    velocity: number; // max 15
    agentConsistency: number; // max 10
  };
}

// Merge vendors result
export interface MergeVendorsResult {
  reassignedCount: number;
  mergedVendorCount: number;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface LeadPurchaseFilters {
  vendorId?: string;
  startDate?: string;
  endDate?: string;
  leadFreshness?: LeadFreshness;
}

// =============================================================================
// FORM TYPES (for UI)
// =============================================================================

export interface LeadPurchaseFormData {
  vendorId: string;
  purchaseName: string;
  leadFreshness: LeadFreshness;
  leadCount: number;
  totalCost: number;
  purchaseDate: string;
  policiesSold: number;
  commissionEarned: number;
  notes: string;
}

export interface LeadVendorFormData {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  notes: string;
}

// =============================================================================
// TRANSFORM HELPERS (for repository layer)
// =============================================================================

export function transformLeadVendorFromDB(row: LeadVendorRow): LeadVendor {
  return {
    id: row.id,
    imoId: row.imo_id,
    createdBy: row.created_by,
    name: row.name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    website: row.website,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function transformLeadVendorToDB(
  data: CreateLeadVendorData | UpdateLeadVendorData,
): Partial<LeadVendorInsert | LeadVendorUpdate> {
  const result: Record<string, unknown> = {};

  if ("name" in data && data.name !== undefined) result.name = data.name;
  if ("contactName" in data) result.contact_name = data.contactName;
  if ("contactEmail" in data) result.contact_email = data.contactEmail;
  if ("contactPhone" in data) result.contact_phone = data.contactPhone;
  if ("website" in data) result.website = data.website;
  if ("notes" in data) result.notes = data.notes;

  return result;
}

export function transformLeadPurchaseFromDB(
  row: LeadPurchaseRow,
): LeadPurchase {
  return {
    id: row.id,
    userId: row.user_id,
    imoId: row.imo_id,
    agencyId: row.agency_id,
    expenseId: row.expense_id,
    vendorId: row.vendor_id,
    purchaseName: row.purchase_name,
    leadFreshness: row.lead_freshness,
    leadCount: row.lead_count,
    totalCost: Number(row.total_cost),
    costPerLead: Number(row.cost_per_lead),
    purchaseDate: row.purchase_date,
    policiesSold: row.policies_sold,
    commissionEarned: Number(row.commission_earned),
    roiPercentage: Number(row.roi_percentage),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function transformLeadPurchaseToDB(
  data: CreateLeadPurchaseData | UpdateLeadPurchaseData,
): Partial<LeadPurchaseInsert | LeadPurchaseUpdate> {
  const result: Record<string, unknown> = {};

  if ("vendorId" in data && data.vendorId !== undefined)
    result.vendor_id = data.vendorId;
  if ("expenseId" in data) result.expense_id = data.expenseId;
  if ("purchaseName" in data) result.purchase_name = data.purchaseName;
  if ("leadFreshness" in data && data.leadFreshness !== undefined)
    result.lead_freshness = data.leadFreshness;
  if ("leadCount" in data && data.leadCount !== undefined)
    result.lead_count = data.leadCount;
  if ("totalCost" in data && data.totalCost !== undefined)
    result.total_cost = data.totalCost;
  if ("purchaseDate" in data && data.purchaseDate !== undefined)
    result.purchase_date = data.purchaseDate;
  if ("policiesSold" in data && data.policiesSold !== undefined)
    result.policies_sold = data.policiesSold;
  if ("commissionEarned" in data && data.commissionEarned !== undefined)
    result.commission_earned = data.commissionEarned;
  if ("notes" in data) result.notes = data.notes;

  return result;
}
