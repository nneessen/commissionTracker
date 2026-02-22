// src/services/subscription/__tests__/adminSubscriptionService.test.ts
// Unit tests for adminSubscriptionService.updatePlanPricing

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../base/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock("../../base/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { adminSubscriptionService } from "../adminSubscriptionService";
import { supabase } from "../../base/supabase";
import { logger } from "../../base/logger";

const BASE_PARAMS = {
  planId: "plan-1",
  priceMonthly: 15000,
  priceAnnual: 144000,
  changedBy: "user-abc",
};

describe("adminSubscriptionService.updatePlanPricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls functions.invoke with correct function name and body", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {},
      error: null,
    });

    await adminSubscriptionService.updatePlanPricing(BASE_PARAMS);

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "update-plan-pricing",
      {
        body: {
          planId: "plan-1",
          priceMonthly: 15000,
          priceAnnual: 144000,
        },
      },
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("omits changedBy from the edge function body", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {},
      error: null,
    });

    await adminSubscriptionService.updatePlanPricing(BASE_PARAMS);

    const [, options] = vi.mocked(supabase.functions.invoke).mock.calls[0];
    expect(options?.body).not.toHaveProperty("changedBy");
  });

  it("throws when functions.invoke returns an error object", async () => {
    const edgeError = new Error("Edge function failed");
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: edgeError,
    });

    await expect(
      adminSubscriptionService.updatePlanPricing(BASE_PARAMS),
    ).rejects.toThrow("Edge function failed");
  });

  it("throws when functions.invoke itself rejects (network failure)", async () => {
    vi.mocked(supabase.functions.invoke).mockRejectedValue(
      new Error("Network error"),
    );

    await expect(
      adminSubscriptionService.updatePlanPricing(BASE_PARAMS),
    ).rejects.toThrow("Network error");
  });

  it("logs error with the correct label before re-throwing", async () => {
    const edgeError = new Error("Edge function failed");
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: edgeError,
    });

    await expect(
      adminSubscriptionService.updatePlanPricing(BASE_PARAMS),
    ).rejects.toThrow();

    expect(logger.error).toHaveBeenCalledWith(
      "AdminSubscriptionService.updatePlanPricing",
      expect.any(Error),
    );
  });

  it("throws when edge function returns a 400-style error for negative prices", async () => {
    const validationError = new Error("Prices must be non-negative");
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: validationError,
    });

    await expect(
      adminSubscriptionService.updatePlanPricing({
        ...BASE_PARAMS,
        priceMonthly: -100,
      }),
    ).rejects.toThrow("Prices must be non-negative");
  });

  it("throws when edge function returns a 400-style error for prices exceeding max", async () => {
    const validationError = new Error(
      "Prices exceed maximum allowed value (999999 cents = $9,999.99)",
    );
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: validationError,
    });

    await expect(
      adminSubscriptionService.updatePlanPricing({
        ...BASE_PARAMS,
        priceMonthly: 1000000,
      }),
    ).rejects.toThrow("Prices exceed maximum allowed value");
  });

  it("still resolves successfully when audit trail fails (non-fatal path)", async () => {
    // Edge function logs auditError but returns 200 — service should resolve.
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { plan: { id: "plan-1" } },
      error: null,
    });

    await expect(
      adminSubscriptionService.updatePlanPricing(BASE_PARAMS),
    ).resolves.not.toThrow();
  });
});
