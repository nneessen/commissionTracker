import { useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  Commission,
  NewCommissionForm,
  CommissionSummary,
  CommissionFilters,
} from "../types";
import { useCarriers } from "./useCarriers";

export function useCommissions() {
  const [commissions, setCommissions] = useLocalStorage<Commission[]>(
    "commissions",
    [],
  );
  const { getCarrierById } = useCarriers();

  const addCommission = (newCommission: NewCommissionForm) => {
    const carrier = getCarrierById(newCommission.carrierId);
    if (!carrier) throw new Error("Carrier not found");

    const commissionRate = carrier.commissionRates[newCommission.product];
    const commissionAmount = newCommission.annualPremium * commissionRate;

    const commission: Commission = {
      id: `commission-${Date.now()}`,
      policyId: undefined, // No policy link for legacy commissions
      client: {
        name: newCommission.clientName,
        age: newCommission.clientAge,
        state: newCommission.clientState,
      },
      carrierId: newCommission.carrierId,
      product: newCommission.product,
      type: "first_year",
      status: "pending",
      calculationBasis: "premium",
      annualPremium: newCommission.annualPremium,
      commissionAmount,
      commissionRate,
      expectedDate: new Date(),
      createdAt: new Date(),
    };

    setCommissions((prev) => [commission, ...prev]);
    return commission;
  };

  const updateCommission = (
    id: string,
    updates: Partial<Omit<Commission, "id" | "createdAt">>,
  ) => {
    setCommissions((prev) =>
      prev.map((commission) =>
        commission.id === id
          ? { ...commission, ...updates, updatedAt: new Date() }
          : commission,
      ),
    );
  };

  const deleteCommission = (id: string) => {
    setCommissions((prev) => prev.filter((commission) => commission.id !== id));
  };

  const getFilteredCommissions = (filters?: CommissionFilters) => {
    if (!filters) return commissions;

    return commissions.filter((commission) => {
      if (
        filters.startDate &&
        new Date(commission.createdAt) < filters.startDate
      )
        return false;
      if (filters.endDate && new Date(commission.createdAt) > filters.endDate)
        return false;
      if (filters.carrierId && commission.carrierId !== filters.carrierId)
        return false;
      if (filters.product && commission.product !== filters.product)
        return false;
      if (filters.state && commission.client.state !== filters.state)
        return false;
      if (filters.minPremium && commission.annualPremium < filters.minPremium)
        return false;
      if (filters.maxPremium && commission.annualPremium > filters.maxPremium)
        return false;
      return true;
    });
  };

  const commissionSummary = useMemo((): CommissionSummary => {
    const totalCommissions = commissions.reduce(
      (sum, c) => sum + c.commissionAmount,
      0,
    );
    const totalPremiums = commissions.reduce(
      (sum, c) => sum + c.annualPremium,
      0,
    );
    const averageCommissionRate =
      commissions.length > 0
        ? commissions.reduce((sum, c) => sum + c.commissionRate, 0) /
          commissions.length
        : 0;

    // Top carriers
    const carrierMap = new Map<
      string,
      { name: string; totalCommissions: number; count: number }
    >();
    commissions.forEach((commission) => {
      const carrier = getCarrierById(commission.carrierId);
      const carrierName = carrier?.name || "Unknown";
      const existing = carrierMap.get(commission.carrierId) || {
        name: carrierName,
        totalCommissions: 0,
        count: 0,
      };
      carrierMap.set(commission.carrierId, {
        name: carrierName,
        totalCommissions:
          existing.totalCommissions + commission.commissionAmount,
        count: existing.count + 1,
      });
    });

    const topCarriers = Array.from(carrierMap.entries())
      .map(([carrierId, data]) => ({
        carrierId,
        carrierName: data.name,
        totalCommissions: data.totalCommissions,
        count: data.count,
      }))
      .sort((a, b) => b.totalCommissions - a.totalCommissions);

    // Product breakdown
    const productMap = new Map<
      string,
      { count: number; totalCommissions: number }
    >();
    commissions.forEach((commission) => {
      const existing = productMap.get(commission.product) || {
        count: 0,
        totalCommissions: 0,
      };
      productMap.set(commission.product, {
        count: existing.count + 1,
        totalCommissions:
          existing.totalCommissions + commission.commissionAmount,
      });
    });

    const productBreakdown = Array.from(productMap.entries()).map(
      ([product, data]) => ({
        product: product as any,
        count: data.count,
        totalCommissions: data.totalCommissions,
      }),
    );

    // State breakdown
    const stateMap = new Map<
      string,
      { count: number; totalCommissions: number }
    >();
    commissions.forEach((commission) => {
      const existing = stateMap.get(commission.client.state) || {
        count: 0,
        totalCommissions: 0,
      };
      stateMap.set(commission.client.state, {
        count: existing.count + 1,
        totalCommissions:
          existing.totalCommissions + commission.commissionAmount,
      });
    });

    const stateBreakdown = Array.from(stateMap.entries()).map(
      ([state, data]) => ({
        state,
        count: data.count,
        totalCommissions: data.totalCommissions,
      }),
    );

    return {
      totalCommissions,
      totalPremiums,
      averageCommissionRate,
      commissionCount: commissions.length,
      topCarriers,
      productBreakdown,
      stateBreakdown,
    };
  }, [commissions, getCarrierById]);

  return {
    commissions,
    addCommission,
    updateCommission,
    deleteCommission,
    getFilteredCommissions,
    commissionSummary,
  };
}

