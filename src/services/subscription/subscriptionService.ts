// src/services/subscription/subscriptionService.ts
// Service for managing subscription data

import {
  SubscriptionRepository,
  SubscriptionPlan,
  UserSubscription,
  UsageTracking,
  SubscriptionPayment,
  SubscriptionEvent,
} from "./SubscriptionRepository";
import { supabase } from "@/services/base";
import type { AddonTierConfig, SubscriptionAddon } from "./adminSubscriptionService";
import type { Database } from "@/types/database.types";

type UserSubscriptionAddonRow =
  Database["public"]["Tables"]["user_subscription_addons"]["Row"];

export interface UserActiveAddon extends UserSubscriptionAddonRow {
  addon: SubscriptionAddon | null;
}

export type {
  SubscriptionPlan,
  UserSubscription,
  UsageTracking,
  SubscriptionPayment,
  SubscriptionEvent,
};

export type { SubscriptionFeatures } from "./SubscriptionRepository";

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
  private repository: SubscriptionRepository;

  constructor() {
    this.repository = new SubscriptionRepository();
  }

  /**
   * Get all active subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.repository.findActivePlans();
  }

  /**
   * Get a specific plan by name
   */
  async getPlanByName(name: string): Promise<SubscriptionPlan | null> {
    return this.repository.findPlanByName(name);
  }

  /**
   * Get current user's subscription with plan details
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    return this.repository.findByUserIdWithPlan(userId);
  }

  /**
   * Get user's subscription tier (quick lookup)
   */
  async getUserTier(userId: string): Promise<string> {
    return this.repository.getUserTier(userId);
  }

  /**
   * Check if user has access to a feature
   */
  async hasFeature(userId: string, feature: string): Promise<boolean> {
    return this.repository.userHasFeature(userId, feature);
  }

  /**
   * Check if user has access to an analytics section
   */
  async hasAnalyticsSection(userId: string, section: string): Promise<boolean> {
    return this.repository.userHasAnalyticsSection(userId, section);
  }

  /**
   * Get usage tracking for current period
   */
  async getUsage(
    userId: string,
    metric: "emails_sent" | "sms_sent",
  ): Promise<UsageTracking | null> {
    return this.repository.getUsage(userId, metric);
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
      metric === "emails_sent" ? subscription?.plan.email_limit || 0 : 0;

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
    return this.repository.incrementUsage(userId, metric, count);
  }

  /**
   * Check subscription status
   */
  isSubscriptionActive(subscription: UserSubscription | null): boolean {
    if (!subscription) return false;

    const validStatuses = ["active", "trialing"];
    if (!validStatuses.includes(subscription.status)) return false;

    const now = new Date();

    // Check if grandfathered period is still valid
    if (subscription.grandfathered_until) {
      const grandfatherEnd = new Date(subscription.grandfathered_until);
      if (grandfatherEnd > now) return true;
    }

    // Check if current period is still valid
    if (subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end);
      return periodEnd > now;
    }

    // No period end set and status is active/trialing
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
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: string): Promise<SubscriptionPayment[]> {
    return this.repository.getPaymentHistory(userId);
  }

  /**
   * Get subscription events for a user (for debugging/admin)
   */
  async getSubscriptionEvents(
    userId: string,
    limit: number = 50,
  ): Promise<SubscriptionEvent[]> {
    return this.repository.getSubscriptionEvents(userId, limit);
  }

  /**
   * Create a Stripe Checkout Session for a plan subscription
   * Returns the checkout URL to redirect the user to
   */
  async createCheckoutSession(
    plan: SubscriptionPlan,
    billingInterval: "monthly" | "annual" = "monthly",
    discountCode?: string,
    pendingAddon?: { addonId: string; tierId: string },
  ): Promise<string | null> {
    const priceId =
      billingInterval === "annual"
        ? plan.stripe_price_id_annual
        : plan.stripe_price_id_monthly;

    if (!priceId) {
      console.error(
        `No Stripe Price ID configured for plan: ${plan.name} (${billingInterval})`,
      );
      return null;
    }

    // Build success URL with plan context and optional pending addon params
    let successUrl = `${window.location.origin}/billing?checkout=success&plan_name=${encodeURIComponent(plan.name)}&billing_interval=${billingInterval}`;
    if (pendingAddon) {
      successUrl += `&pending_addon_id=${pendingAddon.addonId}&pending_tier_id=${pendingAddon.tierId}`;
    }

    try {
      const { data, error } = await this.repository.invokeEdgeFunction(
        "create-checkout-session",
        {
          priceId,
          successUrl,
          cancelUrl: `${window.location.origin}/billing`,
          discountCode: discountCode || undefined,
        },
      );

      if (error) {
        console.error("Failed to create checkout session:", error);
        return null;
      }

      return (data?.url as string) || null;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return null;
    }
  }

  /**
   * Create a Stripe Customer Portal session
   * Returns the portal URL to redirect the user to
   */
  async createPortalSession(userId: string): Promise<string | null> {
    const data = await this.repository.getCustomerPortalInfo(userId);

    if (!data?.stripe_customer_id) {
      return null;
    }

    try {
      const { data: result, error } =
        await this.repository.invokeEdgeFunction("create-portal-session", {
          returnUrl: `${window.location.origin}/billing`,
        });

      if (error) {
        console.error("Failed to create portal session:", error);
        return null;
      }

      return (result?.url as string) || null;
    } catch (error) {
      console.error("Error creating portal session:", error);
      return null;
    }
  }

  /**
   * Create a Stripe Checkout Session for an addon subscription
   * Returns the checkout URL to redirect the user to
   */
  async createAddonCheckoutSession(
    priceId: string,
    addonId: string,
    tierId?: string,
  ): Promise<string | null> {
    if (!priceId) {
      console.error("No Stripe Price ID provided for addon checkout");
      return null;
    }

    try {
      const { data, error } = await this.repository.invokeEdgeFunction(
        "create-checkout-session",
        {
          priceId,
          addonId,
          tierId: tierId || undefined,
          successUrl: `${window.location.origin}/billing?addon_checkout=success`,
          cancelUrl: `${window.location.origin}/billing`,
        },
      );

      if (error) {
        console.error("Failed to create addon checkout session:", error);
        return null;
      }

      return (data?.url as string) || null;
    } catch (error) {
      console.error("Error creating addon checkout session:", error);
      return null;
    }
  }

  /**
   * Get user's active addon subscriptions with addon details
   * Returns addons with status 'active' or 'manual_grant'
   */
  async getUserActiveAddons(userId: string): Promise<UserActiveAddon[]> {
    try {
      const { data, error } = await supabase
        .from("user_subscription_addons")
        .select(`*, addon:subscription_addons(*)`)
        .eq("user_id", userId)
        .in("status", ["active", "manual_grant"]);

      if (error) {
        console.error("Failed to fetch user active addons:", error);
        return [];
      }

      return (data || []).map((item) => ({
        ...item,
        addon: Array.isArray(item.addon) ? item.addon[0] : item.addon,
      }));
    } catch (error) {
      console.error("Error fetching user active addons:", error);
      return [];
    }
  }

  /**
   * Calculate the monthly price of an addon subscription,
   * resolving tiered pricing when applicable
   */
  getAddonMonthlyPrice(userAddon: UserActiveAddon): number {
    if (!userAddon.addon) return 0;

    // If addon has tier_config and user has a tier_id, resolve tier pricing
    if (userAddon.tier_id) {
      const tierConfig = userAddon.addon.tier_config as AddonTierConfig | null;
      if (tierConfig?.tiers) {
        const tier = tierConfig.tiers.find((t) => t.id === userAddon.tier_id);
        if (tier) {
          return userAddon.billing_interval === "annual"
            ? Math.round(tier.price_annual / 12)
            : tier.price_monthly;
        }
      }
    }

    // Fallback to addon-level pricing
    return userAddon.billing_interval === "annual"
      ? Math.round(userAddon.addon.price_annual / 12)
      : userAddon.addon.price_monthly;
  }

  /**
   * Check if a plan requires payment (not free)
   */
  isPaidPlan(plan: SubscriptionPlan): boolean {
    return plan.price_monthly > 0 || plan.price_annual > 0;
  }

  /**
   * Calculate annual savings for a plan
   */
  getAnnualSavings(plan: SubscriptionPlan): number {
    const monthlyTotal = plan.price_monthly * 12;
    return Math.max(0, monthlyTotal - plan.price_annual);
  }

  /**
   * Get the effective price per month for annual billing
   */
  getEffectiveMonthlyPrice(
    plan: SubscriptionPlan,
    billingInterval: "monthly" | "annual",
  ): number {
    if (billingInterval === "monthly") {
      return plan.price_monthly;
    }
    return Math.round(plan.price_annual / 12);
  }
}

export const subscriptionService = new SubscriptionService();
