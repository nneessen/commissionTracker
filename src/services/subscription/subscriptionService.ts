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
   * Generate Lemon Squeezy checkout URL for a plan
   */
  generateCheckoutUrl(
    plan: SubscriptionPlan,
    userId: string,
    userEmail: string,
    billingInterval: "monthly" | "annual" = "monthly",
    discountCode?: string,
  ): string | null {
    const variantId =
      billingInterval === "annual"
        ? plan.lemon_variant_id_annual
        : plan.lemon_variant_id_monthly;

    if (!variantId) {
      console.error(
        `No Lemon Squeezy variant ID configured for plan: ${plan.name} (${billingInterval})`,
      );
      return null;
    }

    const LEMON_STORE_ID = import.meta.env.VITE_LEMON_SQUEEZY_STORE_ID || "";

    if (!LEMON_STORE_ID) {
      console.error("VITE_LEMON_SQUEEZY_STORE_ID not configured");
      return null;
    }

    const checkoutUrl = new URL(
      `https://${LEMON_STORE_ID}.lemonsqueezy.com/buy/${variantId}`,
    );

    checkoutUrl.searchParams.set("checkout[email]", userEmail);
    checkoutUrl.searchParams.set("checkout[custom][user_id]", userId);

    const redirectUrl = `${window.location.origin}/settings?tab=billing&checkout=success`;
    checkoutUrl.searchParams.set("checkout[redirect_url]", redirectUrl);

    if (discountCode && discountCode.trim()) {
      checkoutUrl.searchParams.set("discount", discountCode.trim());
    }

    return checkoutUrl.toString();
  }

  /**
   * Get Lemon Squeezy customer portal URL
   */
  async getCustomerPortalUrl(userId: string): Promise<string | null> {
    const data = await this.repository.getCustomerPortalInfo(userId);

    if (!data?.lemon_customer_id) {
      return null;
    }

    const LEMON_STORE_ID = import.meta.env.VITE_LEMON_SQUEEZY_STORE_ID || "";

    if (!LEMON_STORE_ID) {
      return null;
    }

    return `https://${LEMON_STORE_ID}.lemonsqueezy.com/billing`;
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
