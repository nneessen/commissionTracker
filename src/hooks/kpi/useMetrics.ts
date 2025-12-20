// /home/nneessen/projects/commissionTracker/src/hooks/useMetrics.ts

import { usePolicies } from "../policies";
import { useCommissions } from "../commissions/useCommissions";
import { useCarriers } from "../carriers/useCarriers";
import {
  ClientMetrics,
  PolicyMetrics,
  CommissionMetrics,
  ForecastMetrics,
  ProductPerformance,
  CarrierPerformance,
  StatePerformance,
} from "../../types/metrics.types";
import { ProductType } from "../../types/commission.types";
import { calculateCommissionAdvance } from "../../utils/policyCalculations";
import { parseLocalDate } from "../../lib/date";

export function useMetrics() {
  const { data: policies = [], isLoading: policiesLoading } = usePolicies();
  const { data: commissions = [], isLoading: commissionsLoading } =
    useCommissions();
  const { data: carriers = [], isLoading: carriersLoading } = useCarriers();

  const isLoading = policiesLoading || commissionsLoading || carriersLoading;

  // Helper function to get carrier by ID
  const getCarrierById = (id: string) => carriers.find((c) => c.id === id);

  // Calculate client metrics
  const calculateClientMetrics = (): ClientMetrics => {
    const uniqueClients = new Set(policies.map((p) => p.client.name));
    const totalClients = uniqueClients.size;

    // Calculate average client age
    const averageAge =
      policies.length > 0
        ? policies.reduce((sum, p) => sum + p.client.age, 0) / policies.length
        : 0;

    // Client distribution by state
    const stateDistribution = new Map<string, number>();
    policies.forEach((p) => {
      const count = stateDistribution.get(p.client.state) || 0;
      stateDistribution.set(p.client.state, count + 1);
    });

    // Age distribution (grouped in 10-year ranges)
    const ageGroups = new Map<string, number>();
    policies.forEach((p) => {
      const ageGroup = `${Math.floor(p.client.age / 10) * 10}-${Math.floor(p.client.age / 10) * 10 + 9}`;
      const count = ageGroups.get(ageGroup) || 0;
      ageGroups.set(ageGroup, count + 1);
    });

    // Client lifetime value (total premiums per client)
    const clientPolicyCounts = new Map<string, number>();
    const clientValues = new Map<string, number>();
    policies.forEach((p) => {
      const currentValue = clientValues.get(p.client.name) || 0;
      clientValues.set(p.client.name, currentValue + p.annualPremium);

      const currentCount = clientPolicyCounts.get(p.client.name) || 0;
      clientPolicyCounts.set(p.client.name, currentCount + 1);
    });

    const totalLifetimeValue = Array.from(clientValues.values()).reduce(
      (sum, val) => sum + val,
      0,
    );
    const averageLifetimeValue =
      clientValues.size > 0 ? totalLifetimeValue / clientValues.size : 0;
    const averagePoliciesPerClient =
      totalClients > 0 ? policies.length / totalClients : 0;

    const topClients = Array.from(clientValues.entries())
      .map(([name, value]) => ({
        name,
        value,
        policies: clientPolicyCounts.get(name) || 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const topStatesByClientCount = Array.from(stateDistribution.entries())
      .map(([state, count]) => ({
        state,
        count,
        percentage: totalClients > 0 ? (count / totalClients) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const ageDistribution = Array.from(ageGroups.entries())
      .map(([range, count]) => ({
        range,
        count,
        percentage: totalClients > 0 ? (count / totalClients) * 100 : 0,
      }))
      .sort((a, b) => {
        const aMin = parseInt(a.range.split("-")[0]);
        const bMin = parseInt(b.range.split("-")[0]);
        return aMin - bMin;
      });

    // Calculate new clients this month and year
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const newClientsThisMonth = policies.filter((p) => {
      const createdAt = new Date(p.createdAt);
      return (
        createdAt.getMonth() === thisMonth &&
        createdAt.getFullYear() === thisYear
      );
    }).length;

    const newClientsThisYear = policies.filter((p) => {
      const createdAt = new Date(p.createdAt);
      return createdAt.getFullYear() === thisYear;
    }).length;

    return {
      totalClients,
      averagePoliciesPerClient,
      clientLifetimeValue: totalLifetimeValue,
      retentionRate: null, // Not yet implemented - requires historical data
      averageAge,
      averageLifetimeValue,
      stateDistribution: Object.fromEntries(stateDistribution),
      topClients,
      topStatesByClientCount,
      ageDistribution,
      newClientsThisMonth,
      newClientsThisYear,
    };
  };

  // Calculate policy metrics
  const calculatePolicyMetrics = (): PolicyMetrics => {
    const totalPolicies = policies.length;
    const activePolicies = policies.filter((p) => p.status === "active").length;
    const pendingPolicies = policies.filter(
      (p) => p.status === "pending",
    ).length;
    const lapsedPolicies = policies.filter((p) => p.status === "lapsed").length;
    const cancelledPolicies = policies.filter(
      (p) => p.status === "cancelled",
    ).length;

    // Calculate retention rate
    const retentionRate =
      totalPolicies > 0 ? (activePolicies / totalPolicies) * 100 : 0;

    // Calculate lapsed and cancellation rates
    const lapsedRate =
      totalPolicies > 0 ? (lapsedPolicies / totalPolicies) * 100 : 0;

    const cancellationRate =
      totalPolicies > 0 ? (cancelledPolicies / totalPolicies) * 100 : 0;

    // Average policy value
    const averagePremium =
      totalPolicies > 0
        ? policies.reduce((sum, p) => sum + p.annualPremium, 0) / totalPolicies
        : 0;

    const totalAnnualPremium = policies.reduce(
      (sum, p) => sum + p.annualPremium,
      0,
    );
    const averagePolicySize = averagePremium; // Same as average premium for now

    // Policies by status
    const statusBreakdown: Record<string, number> = {
      pending: pendingPolicies,
      active: activePolicies,
      lapsed: lapsedPolicies,
      cancelled: cancelledPolicies,
      matured: policies.filter((p) => p.status === "matured").length,
    };

    // Premium by product
    const premiumByProduct = policies.reduce(
      (acc, p) => {
        acc[p.product] = (acc[p.product] || 0) + p.annualPremium;
        return acc;
      },
      {} as Record<ProductType, number>,
    );

    // Policy distribution by carrier
    const carrierDistribution = new Map<string, number>();
    policies.forEach((p) => {
      carrierDistribution.set(
        p.carrierId,
        (carrierDistribution.get(p.carrierId) || 0) + 1,
      );
    });

    const policyDistributionByCarrier = Array.from(
      carrierDistribution.entries(),
    )
      .map(([carrierId, count]) => ({
        carrierId,
        carrierName: getCarrierById(carrierId)?.name || "Unknown",
        count,
        percentage: totalPolicies > 0 ? (count / totalPolicies) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Monthly new policies (last 12 months)
    const monthlyNewPolicies: Array<{
      month: string;
      count: number;
      premium: number;
    }> = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthPolicies = policies.filter((p) => {
        const createdAt = new Date(p.createdAt);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      monthlyNewPolicies.push({
        month: monthStart.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        count: monthPolicies.length,
        premium: monthPolicies.reduce((sum, p) => sum + p.annualPremium, 0),
      });
    }

    // Calculate average term length
    const policiesWithTerm = policies.filter((p) => p.termLength);
    const averageTermLength =
      policiesWithTerm.length > 0
        ? policiesWithTerm.reduce((sum, p) => sum + (p.termLength || 0), 0) /
          policiesWithTerm.length
        : 0;

    // Policies expiring in next 30 and 90 days
    const policiesExpiringThisMonth = policies.filter((p) => {
      if (p.status !== "active" || !p.termLength) return false;
      const expiryDate = parseLocalDate(p.effectiveDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + p.termLength);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }).length;

    const policiesExpiringThisQuarter = policies.filter((p) => {
      if (p.status !== "active" || !p.termLength) return false;
      const expiryDate = parseLocalDate(p.effectiveDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + p.termLength);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
    }).length;

    return {
      totalPolicies,
      activePolicies,
      pendingPolicies,
      lapsedPolicies,
      retentionRate,
      expiringPolicies: policiesExpiringThisMonth,
      lapsedRate,
      cancellationRate,
      averagePolicySize,
      averagePremium,
      totalAnnualPremium,
      statusBreakdown,
      premiumByProduct,
      policyDistributionByCarrier,
      monthlyNewPolicies,
      averageTermLength,
      policiesExpiringThisMonth,
      policiesExpiringThisQuarter,
    };
  };

  // Calculate commission metrics
  const calculateCommissionMetrics = (): CommissionMetrics => {
    const totalEarned = commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0);

    const totalPending = commissions
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0);

    const paidCommissions = totalEarned;
    const pendingCommissions = totalPending;
    const totalEarnedCommission = totalEarned;

    const averageCommissionRate =
      commissions.length > 0
        ? commissions.reduce((sum, c) => sum + c.commissionRate, 0) /
          commissions.length
        : 0;

    const averageCommissionPerPolicy =
      policies.length > 0 ? totalEarned / policies.length : 0;

    // Monthly commission earnings (last 12 months)
    const monthlyEarnings: Array<{ label: string; value: number }> = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const earnings = commissions
        .filter((c) => {
          const date = c.paidDate
            ? new Date(c.paidDate)
            : new Date(c.createdAt);
          return date >= monthStart && date <= monthEnd && c.status === "paid";
        })
        .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0);

      monthlyEarnings.push({
        label: monthStart.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        value: earnings,
      });
    }

    // Commission by type breakdown
    const commissionByType: Record<string, number> = {
      first_year: commissions
        .filter((c) => c.type === "first_year")
        .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0),
      renewal: commissions
        .filter((c) => c.type === "renewal")
        .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0),
      trail: commissions
        .filter((c) => c.type === "trail")
        .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0),
      bonus: commissions
        .filter((c) => c.type === "bonus")
        .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0),
      override: commissions
        .filter((c) => c.type === "override")
        .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0),
    };

    // Commission by carrier
    const carrierCommissions = new Map<string, number>();
    commissions.forEach((c) => {
      carrierCommissions.set(
        c.carrierId,
        (carrierCommissions.get(c.carrierId) || 0) + (c.advanceAmount ?? 0),
      );
    });

    const commissionByCarrier = Array.from(carrierCommissions.entries())
      .map(([carrierId, amount]) => ({
        carrierId,
        carrierName: getCarrierById(carrierId)?.name || "Unknown",
        amount,
        percentage: totalEarned > 0 ? (amount / totalEarned) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Commission by product
    const productCommissions = new Map<
      ProductType,
      { amount: number; count: number }
    >();
    commissions.forEach((c) => {
      const current = productCommissions.get(c.product) || {
        amount: 0,
        count: 0,
      };
      productCommissions.set(c.product, {
        amount: current.amount + (c.advanceAmount ?? 0),
        count: current.count + 1,
      });
    });

    const commissionByProduct = Array.from(productCommissions.entries())
      .map(([product, data]) => ({
        product,
        amount: data.amount,
        percentage: totalEarned > 0 ? (data.amount / totalEarned) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Commission trends
    const commissionTrends: Array<{
      period: string;
      amount: number;
      policyCount: number;
    }> = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthCommissions = commissions.filter((c) => {
        const date = new Date(c.createdAt);
        return date >= monthStart && date <= monthEnd;
      });

      commissionTrends.push({
        period: monthStart.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        amount: monthCommissions.reduce(
          (sum, c) => sum + (c.advanceAmount ?? 0),
          0,
        ),
        policyCount: monthCommissions.length,
      });
    }

    // Top performing products
    const topPerformingProducts = Array.from(productCommissions.entries())
      .map(([product, data]) => ({
        product,
        revenue: data.amount,
        policyCount: data.count,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Expected commissions
    const expectedCommissionsNext30Days = commissions
      .filter((c) => {
        if (c.status !== "pending" || !c.expectedDate) return false;
        const expectedDate = new Date(c.expectedDate);
        const daysUntil = Math.ceil(
          (expectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysUntil > 0 && daysUntil <= 30;
      })
      .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0);

    const expectedCommissionsNext90Days = commissions
      .filter((c) => {
        if (c.status !== "pending" || !c.expectedDate) return false;
        const expectedDate = new Date(c.expectedDate);
        const daysUntil = Math.ceil(
          (expectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysUntil > 0 && daysUntil <= 90;
      })
      .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0);

    // Year-over-year growth
    const currentYear = new Date().getFullYear();
    const lastYearEarnings = commissions
      .filter((c) => {
        const date = c.paidDate ? new Date(c.paidDate) : new Date(c.createdAt);
        return date.getFullYear() === currentYear - 1 && c.status === "paid";
      })
      .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0);

    const thisYearEarnings = commissions
      .filter((c) => {
        const date = c.paidDate ? new Date(c.paidDate) : new Date(c.createdAt);
        return date.getFullYear() === currentYear && c.status === "paid";
      })
      .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0);

    const yearOverYearGrowth =
      lastYearEarnings > 0
        ? ((thisYearEarnings - lastYearEarnings) / lastYearEarnings) * 100
        : 0;

    // Projected annual commission (based on current run rate)
    const monthsElapsed = now.getMonth() + 1;
    const projectedAnnualCommission =
      monthsElapsed > 0 ? (thisYearEarnings / monthsElapsed) * 12 : 0;

    return {
      totalEarned,
      totalPending,
      yearOverYearGrowth,
      monthlyEarnings,
      commissionByType,
      totalEarnedCommission,
      projectedAnnualCommission,
      averageCommissionPerPolicy,
      averageCommissionRate,
      commissionByCarrier,
      commissionByProduct,
      commissionTrends,
      topPerformingProducts,
      pendingCommissions,
      paidCommissions,
      expectedCommissionsNext30Days,
      expectedCommissionsNext90Days,
    };
  };

  // Calculate product performance
  const calculateProductPerformance = (): ProductPerformance[] => {
    const products = [
      "whole_life",
      "term_life",
      "universal_life",
      "variable_life",
      "health",
      "disability",
      "annuity",
    ] as const;

    return products.map((product) => {
      const productPolicies = policies.filter((p) => p.product === product);
      const totalPremium = productPolicies.reduce(
        (sum, p) => sum + p.annualPremium,
        0,
      );
      const averagePremium =
        productPolicies.length > 0 ? totalPremium / productPolicies.length : 0;

      // Calculate revenue from commissions for this product
      const productCommissions = commissions.filter(
        (c) => c.product === product,
      );
      const totalRevenue = productCommissions.reduce(
        (sum, c) => sum + (c.advanceAmount ?? 0),
        0,
      );

      return {
        product,
        policies: productPolicies.length,
        revenue: totalRevenue,
        averageSize: averagePremium,
      };
    });
  };

  // Calculate carrier performance
  const calculateCarrierPerformance = (): CarrierPerformance[] => {
    const carrierMap = new Map<string, CarrierPerformance>();

    policies.forEach((policy) => {
      const carrier = getCarrierById(policy.carrierId);
      if (!carrier) return;

      if (!carrierMap.has(policy.carrierId)) {
        carrierMap.set(policy.carrierId, {
          carrierId: policy.carrierId,
          carrierName: carrier.name,
          policies: 0,
          revenue: 0,
          averageCommission: 0,
        });
      }

      const perf = carrierMap.get(policy.carrierId)!;
      perf.policies++;
      const commissionAmount = calculateCommissionAdvance(
        policy.annualPremium,
        policy.commissionPercentage,
        9,
      );
      perf.revenue += commissionAmount;
    });

    // Calculate average commission
    carrierMap.forEach((perf) => {
      perf.averageCommission =
        perf.policies > 0 ? perf.revenue / perf.policies : 0;
    });

    return Array.from(carrierMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );
  };

  // Calculate state performance
  const calculateStatePerformance = (): StatePerformance[] => {
    const stateMap = new Map<string, StatePerformance>();

    policies.forEach((policy) => {
      if (!stateMap.has(policy.client.state)) {
        stateMap.set(policy.client.state, {
          state: policy.client.state,
          policies: 0,
          revenue: 0,
          averageSize: 0,
        });
      }

      const perf = stateMap.get(policy.client.state)!;
      perf.policies++;
      perf.revenue += calculateCommissionAdvance(
        policy.annualPremium,
        policy.commissionPercentage,
        9,
      );
    });

    // Calculate average size (premium per policy)
    stateMap.forEach((perf, state) => {
      const statePolicies = policies.filter((p) => p.client.state === state);
      const totalPremium = statePolicies.reduce(
        (sum, p) => sum + p.annualPremium,
        0,
      );
      perf.averageSize =
        statePolicies.length > 0 ? totalPremium / statePolicies.length : 0;
    });

    return Array.from(stateMap.values()).sort((a, b) => b.revenue - a.revenue);
  };

  // Calculate forecast metrics
  const calculateForecastMetrics = (): ForecastMetrics => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate average monthly growth rate from historical data
    const monthlyGrowthRates: number[] = [];
    for (let i = 1; i < 12; i++) {
      const prevMonthStart = new Date(currentYear, currentMonth - i, 1);
      const prevMonthEnd = new Date(currentYear, currentMonth - i + 1, 0);
      const currMonthStart = new Date(currentYear, currentMonth - i + 1, 1);
      const currMonthEnd = new Date(currentYear, currentMonth - i + 2, 0);

      const prevMonthCommissions = commissions
        .filter((c) => {
          const date = new Date(c.createdAt);
          return date >= prevMonthStart && date <= prevMonthEnd;
        })
        .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0);

      const currMonthCommissions = commissions
        .filter((c) => {
          const date = new Date(c.createdAt);
          return date >= currMonthStart && date <= currMonthEnd;
        })
        .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0);

      if (prevMonthCommissions > 0) {
        const growthRate =
          (currMonthCommissions - prevMonthCommissions) / prevMonthCommissions;
        monthlyGrowthRates.push(growthRate);
      }
    }

    const avgGrowthRate =
      monthlyGrowthRates.length > 0
        ? monthlyGrowthRates.reduce((sum, rate) => sum + rate, 0) /
          monthlyGrowthRates.length
        : 0.05; // Default to 5% growth if no data

    // Calculate current run rate
    const lastThreeMonthsCommissions = commissions
      .filter((c) => {
        const date = new Date(c.createdAt);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return date >= threeMonthsAgo && c.status === "paid";
      })
      .reduce((sum, c) => sum + (c.advanceAmount ?? 0), 0);

    const monthlyRunRate = lastThreeMonthsCommissions / 3;

    // Project next quarter
    const projectedNextQuarter = monthlyRunRate * 3 * (1 + avgGrowthRate * 3);

    // Project next year
    const projectedNextYear =
      monthlyRunRate * 12 * Math.pow(1 + avgGrowthRate, 12);

    // Calculate pipeline value from pending policies
    const pipelineValue = policies
      .filter((p) => p.status === "pending")
      .reduce(
        (sum, p) =>
          sum +
          calculateCommissionAdvance(
            p.annualPremium,
            p.commissionPercentage,
            9,
          ),
        0,
      );

    // Estimate renewal income
    const expectedRenewals = policies
      .filter((p) => p.status === "active")
      .reduce((sum, p) => {
        // Assume 50% of commission rate for renewals (ongoing monthly commissions)
        const advance = calculateCommissionAdvance(
          p.annualPremium,
          p.commissionPercentage,
          9,
        );
        return sum + advance * 0.5;
      }, 0);

    // Growth opportunities
    const growthOpportunities = {
      highValueProducts: productPerformance
        .filter(
          (p) =>
            p.revenue >
            (commissionMetrics.totalEarned / productPerformance.length) * 1.5,
        )
        .map((p) => p.product),
      underperformingCarriers: carrierPerformance
        .filter(
          (c) =>
            c.averageCommission <
            (commissionMetrics.totalEarned / policies.length) * 0.5,
        )
        .map((c) => c.carrierId),
      expandableStates: [], // Would need market data
    };

    // Projected monthly commissions (next 12 months)
    const projectedMonthlyCommission: Array<{
      month: string;
      projected: number;
      confidence: "high" | "medium" | "low";
    }> = [];
    for (let i = 1; i <= 12; i++) {
      const futureMonth = new Date();
      futureMonth.setMonth(futureMonth.getMonth() + i);
      const monthlyProjection = monthlyRunRate * Math.pow(1 + avgGrowthRate, i);

      projectedMonthlyCommission.push({
        month: futureMonth.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        projected: monthlyProjection,
        confidence: i <= 3 ? "high" : i <= 6 ? "medium" : "low",
      });
    }

    // Projected annual revenue (next year)
    const projectedAnnualRevenue = projectedNextYear;

    // Projected client growth (based on historical trends)
    const currentClients = new Set(policies.map((p) => p.client.name)).size;
    const projectedClientGrowth = Math.round(
      currentClients * (1 + avgGrowthRate * 12),
    );

    // Projected policy growth
    const projectedPolicyGrowth = Math.round(
      policies.length * (1 + avgGrowthRate * 12),
    );

    // Renewal forecast (next 12 months)
    const renewalForecast: Array<{
      month: string;
      expectedRenewals: number;
      expectedRevenue: number;
    }> = [];
    for (let i = 1; i <= 12; i++) {
      const futureMonth = new Date();
      futureMonth.setMonth(futureMonth.getMonth() + i);

      // Count policies that will be up for renewal
      const policiesForRenewal = policies.filter((p) => {
        if (p.status !== "active" || !p.termLength) return false;
        const renewalDate = parseLocalDate(p.effectiveDate);
        renewalDate.setFullYear(renewalDate.getFullYear() + p.termLength);
        return (
          renewalDate.getMonth() === futureMonth.getMonth() &&
          renewalDate.getFullYear() === futureMonth.getFullYear()
        );
      });

      const expectedRenewalCount = policiesForRenewal.length;
      const expectedRenewalRevenue = policiesForRenewal.reduce((sum, p) => {
        const advance = calculateCommissionAdvance(
          p.annualPremium,
          p.commissionPercentage,
          9,
        );
        return sum + advance * 0.5; // Assume 50% commission on renewals
      }, 0);

      renewalForecast.push({
        month: futureMonth.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        expectedRenewals: expectedRenewalCount,
        expectedRevenue: expectedRenewalRevenue,
      });
    }

    return {
      projectedNextQuarter,
      projectedNextYear,
      monthlyGrowthRate: avgGrowthRate * 100,
      pipelineValue,
      expectedRenewals,
      growthOpportunities,
      projectedMonthlyCommission,
      projectedAnnualRevenue,
      projectedClientGrowth,
      projectedPolicyGrowth,
      renewalForecast,
    };
  };

  // Don't calculate metrics if still loading
  if (isLoading) {
    return {
      clientMetrics: null,
      policyMetrics: null,
      commissionMetrics: null,
      productPerformance: [],
      carrierPerformance: [],
      statePerformance: [],
      forecastMetrics: null,
      isLoading: true,
    };
  }

  // Calculate all metrics
  const clientMetrics = calculateClientMetrics();
  const policyMetrics = calculatePolicyMetrics();
  const commissionMetrics = calculateCommissionMetrics();
  const productPerformance = calculateProductPerformance();
  const carrierPerformance = calculateCarrierPerformance();
  const statePerformance = calculateStatePerformance();
  const forecastMetrics = calculateForecastMetrics();

  return {
    clientMetrics,
    policyMetrics,
    commissionMetrics,
    productPerformance,
    carrierPerformance,
    statePerformance,
    forecastMetrics,
    isLoading: false,
  };
}
