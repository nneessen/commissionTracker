import {
  calculateCommissionProgress,
  calculateCompletedPolicyMonths,
} from "../commissionProgress";

describe("commissionProgress", () => {
  describe("calculateCompletedPolicyMonths", () => {
    it("does not count a month until the effective-date anniversary", () => {
      const effectiveDate = new Date(2026, 0, 28);

      expect(
        calculateCompletedPolicyMonths(effectiveDate, new Date(2026, 1, 27)),
      ).toBe(0);
      expect(
        calculateCompletedPolicyMonths(effectiveDate, new Date(2026, 1, 28)),
      ).toBe(1);
    });

    it("returns zero for end dates before the effective date", () => {
      expect(
        calculateCompletedPolicyMonths(new Date(2026, 2, 10), new Date(2026, 1, 10)),
      ).toBe(0);
    });
  });

  describe("calculateCommissionProgress", () => {
    it("earns the advance month by month from the effective date", () => {
      const result = calculateCommissionProgress({
        amount: 900,
        advanceMonths: 9,
        effectiveDate: "2026-01-15",
        lifecycleStatus: "active",
        asOfDate: new Date(2026, 3, 15),
      });

      expect(result).toEqual({
        monthsPaid: 3,
        earnedAmount: 300,
        unearnedAmount: 600,
      });
    });

    it("caps earned progress at the advance period", () => {
      const result = calculateCommissionProgress({
        amount: 900,
        advanceMonths: 9,
        effectiveDate: "2025-01-15",
        lifecycleStatus: "active",
        asOfDate: new Date(2026, 3, 15),
      });

      expect(result).toEqual({
        monthsPaid: 9,
        earnedAmount: 900,
        unearnedAmount: 0,
      });
    });

    it("stops earning when the policy is cancelled or lapsed", () => {
      const result = calculateCommissionProgress({
        amount: 900,
        advanceMonths: 9,
        effectiveDate: "2026-01-15",
        lifecycleStatus: "cancelled",
        cancellationDate: "2026-04-10",
        asOfDate: new Date(2026, 7, 1),
      });

      expect(result).toEqual({
        monthsPaid: 2,
        earnedAmount: 200,
        unearnedAmount: 700,
      });
    });

    it("falls back to stored months when there is no effective date", () => {
      const result = calculateCommissionProgress({
        amount: 900,
        advanceMonths: 9,
        fallbackMonthsPaid: 4,
      });

      expect(result).toEqual({
        monthsPaid: 4,
        earnedAmount: 400,
        unearnedAmount: 500,
      });
    });

    it("falls back to stored months for closed policies missing a cancellation date", () => {
      const result = calculateCommissionProgress({
        amount: 900,
        advanceMonths: 9,
        fallbackMonthsPaid: 3,
        effectiveDate: "2026-01-15",
        lifecycleStatus: "lapsed",
      });

      expect(result).toEqual({
        monthsPaid: 3,
        earnedAmount: 300,
        unearnedAmount: 600,
      });
    });
  });
});
