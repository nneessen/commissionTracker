// src/hooks/admin/__tests__/useUpdatePlanPricing.test.tsx
// Unit tests for useUpdatePlanPricing mutation hook

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mock the service — hook tests don't care about service internals
vi.mock("@/services/subscription", () => ({
  adminSubscriptionService: {
    updatePlanPricing: vi.fn(),
  },
}));

// Mock auth context
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  useUpdatePlanPricing,
  adminSubscriptionKeys,
} from "../useAdminSubscription";
import { adminSubscriptionService } from "@/services/subscription";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MUTATION_PARAMS = {
  planId: "plan-1",
  priceMonthly: 15000,
  priceAnnual: 144000,
};

describe("useUpdatePlanPricing", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("is not pending before mutation is called", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-abc" },
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useUpdatePlanPricing(), { wrapper });

    expect(result.current.isPending).toBe(false);
  });

  it("calls service with planId, priceMonthly, priceAnnual, and changedBy from auth", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-abc" },
    } as ReturnType<typeof useAuth>);
    vi.mocked(adminSubscriptionService.updatePlanPricing).mockResolvedValue(
      undefined,
    );

    const { result } = renderHook(() => useUpdatePlanPricing(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MUTATION_PARAMS);
    });

    expect(adminSubscriptionService.updatePlanPricing).toHaveBeenCalledWith({
      planId: "plan-1",
      priceMonthly: 15000,
      priceAnnual: 144000,
      changedBy: "user-abc",
    });
  });

  it("shows success toast on success", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-abc" },
    } as ReturnType<typeof useAuth>);
    vi.mocked(adminSubscriptionService.updatePlanPricing).mockResolvedValue(
      undefined,
    );

    const { result } = renderHook(() => useUpdatePlanPricing(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MUTATION_PARAMS);
    });

    expect(toast.success).toHaveBeenCalledWith("Plan pricing updated");
  });

  it("invalidates plans query on success", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-abc" },
    } as ReturnType<typeof useAuth>);
    vi.mocked(adminSubscriptionService.updatePlanPricing).mockResolvedValue(
      undefined,
    );

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdatePlanPricing(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MUTATION_PARAMS);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: adminSubscriptionKeys.plans(),
    });
  });

  it("invalidates specific plan query on success", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-abc" },
    } as ReturnType<typeof useAuth>);
    vi.mocked(adminSubscriptionService.updatePlanPricing).mockResolvedValue(
      undefined,
    );

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdatePlanPricing(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MUTATION_PARAMS);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: adminSubscriptionKeys.plan("plan-1"),
    });
  });

  it("shows error toast on failure", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-abc" },
    } as ReturnType<typeof useAuth>);
    vi.mocked(adminSubscriptionService.updatePlanPricing).mockRejectedValue(
      new Error("Stripe error"),
    );

    const { result } = renderHook(() => useUpdatePlanPricing(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync(MUTATION_PARAMS);
      } catch {
        // expected to throw
      }
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Failed to update pricing: Stripe error",
    );
  });

  it("throws immediately when user is not authenticated", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as ReturnType<
      typeof useAuth
    >);

    const { result } = renderHook(() => useUpdatePlanPricing(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(MUTATION_PARAMS)).rejects.toThrow(
        "User not authenticated",
      );
    });

    expect(adminSubscriptionService.updatePlanPricing).not.toHaveBeenCalled();
  });

  it("is pending while mutation is in-flight", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-abc" },
    } as ReturnType<typeof useAuth>);

    let resolveInvoke!: () => void;
    vi.mocked(adminSubscriptionService.updatePlanPricing).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInvoke = resolve;
        }),
    );

    const { result } = renderHook(() => useUpdatePlanPricing(), { wrapper });

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.mutate(MUTATION_PARAMS);
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    act(() => {
      resolveInvoke();
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });
});
