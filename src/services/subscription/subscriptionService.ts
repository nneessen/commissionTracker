// src/services/subscription/subscriptionService.ts
// Service for managing subscription data

import { supabase } from "@/services/base/supabase";
import type { Database } from "@/types/database.types";

type SubscriptionPlanRow =
  Database["public"]["Tables"]["subscription_plans"]["Row"];
type UserSubscriptionRow =
  Database["public"]["Tables"]["user_subscriptions"]["Row"];
type UsageTrackingRow = Database["public"]["Tables"]["usage_tracking"]["Row"];

export interface SubscriptionPlan extends Omit<
  SubscriptionPlanRow,
  "features"
> {
  features: SubscriptionFeatures;
}

export interface SubscriptionFeatures {
  dashboard: boolean;
  policies: boolean;
  comp_guide: boolean;
  settings: boolean;
  connect_upline: boolean;
  expenses: boolean;
  targets_basic: boolean;
  targets_full: boolean;
  reports_view: boolean;
  reports_export: boolean;
  email: boolean;
  sms: boolean;
  hierarchy: boolean;
  recruiting: boolean;
  overrides: boolean;
  downline_reports: boolean;
}

export interface UserSubscription extends UserSubscriptionRow {
  plan: SubscriptionPlan;
}

export type UsageTracking = UsageTrackingRow;

export interface UsageStatus {
  metric: "emails_sent" | "sms_sent";
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  isOverLimit: boolean;
  overage: number;
  overageCost: number; // in cents
}

// Pricing constants
export const PRICING = {
  EMAIL_OVERAGE_PACK: 500,
  EMAIL_OVERAGE_PRICE: 500, // cents ($5.00)
  EMAIL_OVERAGE_PER_EMAIL: 1, // cents per email ($0.01)
  SMS_PRICE_PER_MESSAGE: 5, // cents per SMS ($0.05)
  USAGE_WARNING_THRESHOLD: 0.8, // 80%
  USAGE_LIMIT_THRESHOLD: 1.0, // 100%
} as const;

class SubscriptionService {
  /**
   * Get all active subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching subscription plans:", error);
      throw new Error(`Failed to fetch subscription plans: ${error.message}`);
    }

    return (data || []).map(
      (plan): SubscriptionPlan => ({
        ...plan,
        features: plan.features as unknown as SubscriptionFeatures,
      }),
    );
  }

  /**
   * Get a specific plan by name
   */
  async getPlanByName(name: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("name", name)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      console.error("Error fetching plan:", error);
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }

    return data
      ? { ...data, features: data.features as unknown as SubscriptionFeatures }
      : null;
  }

  /**
   * Get current user's subscription with plan details
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select(
        `
        *,
        plan:subscription_plans(*)
      `,
      )
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      console.error("Error fetching user subscription:", error);
      throw new Error(`Failed to fetch user subscription: ${error.message}`);
    }

    if (!data || !data.plan) return null;

    // Handle the case where plan might be an array (shouldn't happen with single())
    const planData = Array.isArray(data.plan) ? data.plan[0] : data.plan;

    return {
      ...data,
      plan: {
        ...planData,
        features: planData.features as SubscriptionFeatures,
      },
    };
  }

  /**
   * Get user's subscription tier (quick lookup)
   */
  async getUserTier(userId: string): Promise<string> {
    const { data, error } = await supabase.rpc("get_user_subscription_tier", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error fetching user tier:", error);
      return "free"; // Default to free on error
    }

    return data || "free";
  }

  /**
   * Check if user has access to a feature
   */
  async hasFeature(userId: string, feature: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("user_has_feature", {
      p_user_id: userId,
      p_feature: feature,
    });

    if (error) {
      console.error("Error checking feature access:", error);
      return false;
    }

    return data || false;
  }

  /**
   * Check if user has access to an analytics section
   */
  async hasAnalyticsSection(userId: string, section: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("user_has_analytics_section", {
      p_user_id: userId,
      p_section: section,
    });

    if (error) {
      console.error("Error checking analytics section access:", error);
      return false;
    }

    return data || false;
  }

  /**
   * Get usage tracking for current period
   */
  async getUsage(
    userId: string,
    metric: "emails_sent" | "sms_sent",
  ): Promise<UsageTracking | null> {
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("usage_tracking")
      .select("*")
      .eq("user_id", userId)
      .eq("metric", metric)
      .eq("period_start", periodStart.toISOString().split("T")[0])
      .maybeSingle();

    if (error) {
      console.error("Error fetching usage:", error);
      return null; // Return null instead of throwing for usage queries
    }

    return data;
  }

  /**
   * Get usage status with calculated limits
   */
  async getUsageStatus(
    userId: string,
    metric: "emails_sent" | "sms_sent",
  ): Promise<UsageStatus> {
    const [usage, subscription] = await Promise.all([
      this.getUsage(userId, metric),
      this.getUserSubscription(userId),
    ]);

    const used = usage?.count || 0;
    const limit =
      metric === "emails_sent" ? subscription?.plan.email_limit || 0 : 0; // SMS has no limit, just usage-based

    const remaining = Math.max(0, limit - used);
    const percentUsed = limit > 0 ? (used / limit) * 100 : 0;
    const isOverLimit = limit > 0 && used > limit;
    const overage = isOverLimit ? used - limit : 0;

    let overageCost = 0;
    if (metric === "emails_sent" && overage > 0) {
      overageCost = overage * PRICING.EMAIL_OVERAGE_PER_EMAIL;
    } else if (metric === "sms_sent") {
      overageCost = used * PRICING.SMS_PRICE_PER_MESSAGE;
    }

    return {
      metric,
      used,
      limit,
      remaining,
      percentUsed: Math.min(percentUsed, 100),
      isOverLimit,
      overage,
      overageCost,
    };
  }

  /**
   * Increment usage (for tracking email/SMS sends)
   */
  async incrementUsage(
    userId: string,
    metric: "emails_sent" | "sms_sent",
    count: number = 1,
  ): Promise<number> {
    const { data, error } = await supabase.rpc("increment_usage", {
      p_user_id: userId,
      p_metric: metric,
      p_increment: count,
    });

    if (error) {
      console.error("Error incrementing usage:", error);
      throw new Error(`Failed to increment usage: ${error.message}`);
    }

    return data || 0;
  }

  /**
   * Check subscription status
   */
  isSubscriptionActive(subscription: UserSubscription | null): boolean {
    if (!subscription) return false;

    const validStatuses = ["active", "trialing"];
    if (!validStatuses.includes(subscription.status)) return false;

    // Check if grandfathered period is still valid
    if (subscription.grandfathered_until) {
      const grandfatherEnd = new Date(subscription.grandfathered_until);
      if (grandfatherEnd > new Date()) return true;
    }

    // Check if current period is still valid
    if (subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end);
      if (periodEnd < new Date()) return false;
    }

    return true;
  }

  /**
   * Check if user is grandfathered
   */
  isGrandfathered(subscription: UserSubscription | null): boolean {
    if (!subscription?.grandfathered_until) return false;
    const grandfatherEnd = new Date(subscription.grandfathered_until);
    return grandfatherEnd > new Date();
  }

  /**
   * Get days remaining in grandfather period
   */
  getGrandfatherDaysRemaining(subscription: UserSubscription | null): number {
    if (!subscription?.grandfathered_until) return 0;
    const grandfatherEnd = new Date(subscription.grandfathered_until);
    const now = new Date();
    const diff = grandfatherEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Format price in dollars
   */
  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(0)}`;
  }
}

export const subscriptionService = new SubscriptionService();
