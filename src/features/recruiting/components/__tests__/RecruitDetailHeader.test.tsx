// src/features/recruiting/components/__tests__/RecruitDetailHeader.test.tsx
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecruitDetailHeader } from "../RecruitDetailHeader";
import type { UserProfile } from "@/types/hierarchy.types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseRecruit: Partial<UserProfile> = {
  id: "user-1",
  email: "recruit@example.com",
  first_name: "Jane",
  last_name: "Doe",
  phone: "555-1234",
  npn: null,
  onboarding_status: "in_progress",
  profile_photo_url: null,
};

const recruitWithNpn: Partial<UserProfile> = {
  ...baseRecruit,
  npn: "1234567",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderHeader(
  overrides: {
    recruit?: Partial<UserProfile>;
    onUpdateNpn?: (npn: string) => Promise<void>;
    isUpdatingNpn?: boolean;
  } = {},
) {
  const recruit = (overrides.recruit ?? baseRecruit) as UserProfile;
  const displayName = `${recruit.first_name} ${recruit.last_name}`;
  const initials = `${recruit.first_name?.[0] || ""}${recruit.last_name?.[0] || ""}`;

  return render(
    <RecruitDetailHeader
      recruit={recruit}
      displayName={displayName}
      initials={initials}
      onUpdateNpn={overrides.onUpdateNpn}
      isUpdatingNpn={overrides.isUpdatingNpn}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RecruitDetailHeader", () => {
  describe("NPN display", () => {
    it("shows 'Set NPN' button when no NPN and onUpdateNpn provided", () => {
      renderHeader({ onUpdateNpn: vi.fn().mockResolvedValue(undefined) });
      expect(screen.getByTitle("Set NPN")).toBeInTheDocument();
    });

    it("shows current NPN when recruit has one", () => {
      renderHeader({
        recruit: recruitWithNpn,
        onUpdateNpn: vi.fn().mockResolvedValue(undefined),
      });
      expect(screen.getByText(/NPN: 1234567/)).toBeInTheDocument();
    });

    it("hides NPN section when onUpdateNpn is undefined (invitation)", () => {
      renderHeader({ onUpdateNpn: undefined });
      expect(screen.queryByTitle("Set NPN")).not.toBeInTheDocument();
      expect(screen.queryByText(/NPN/)).not.toBeInTheDocument();
    });
  });

  describe("NPN inline edit", () => {
    let onUpdateNpn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onUpdateNpn = vi.fn().mockResolvedValue(undefined);
    });

    it("opens editor on click and saves on blur", async () => {
      renderHeader({ onUpdateNpn });

      // Click "Set NPN" to open editor
      fireEvent.click(screen.getByTitle("Set NPN"));
      const input = screen.getByPlaceholderText("NPN #");
      expect(input).toBeInTheDocument();

      // Type a value and blur
      fireEvent.change(input, { target: { value: "9999999" } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onUpdateNpn).toHaveBeenCalledWith("9999999");
        expect(onUpdateNpn).toHaveBeenCalledTimes(1);
      });
    });

    it("saves on Enter key", async () => {
      renderHeader({ onUpdateNpn });

      fireEvent.click(screen.getByTitle("Set NPN"));
      const input = screen.getByPlaceholderText("NPN #");
      fireEvent.change(input, { target: { value: "8888888" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(onUpdateNpn).toHaveBeenCalledWith("8888888");
      });
    });

    it("cancels on Escape without saving", () => {
      renderHeader({ onUpdateNpn });

      fireEvent.click(screen.getByTitle("Set NPN"));
      const input = screen.getByPlaceholderText("NPN #");
      fireEvent.change(input, { target: { value: "changed" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(onUpdateNpn).not.toHaveBeenCalled();
      // Editor should close — back to "Set NPN" button
      expect(screen.getByTitle("Set NPN")).toBeInTheDocument();
    });

    it("does not call onUpdateNpn when value unchanged", async () => {
      renderHeader({
        recruit: recruitWithNpn,
        onUpdateNpn,
      });

      fireEvent.click(screen.getByTitle("Edit NPN"));
      const input = screen.getByPlaceholderText("NPN #");
      // Value is already "1234567" — blur without changing
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onUpdateNpn).not.toHaveBeenCalled();
      });
    });

    it("calls onUpdateNpn with empty string when NPN cleared", async () => {
      renderHeader({
        recruit: recruitWithNpn,
        onUpdateNpn,
      });

      fireEvent.click(screen.getByTitle("Edit NPN"));
      const input = screen.getByPlaceholderText("NPN #");
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onUpdateNpn).toHaveBeenCalledWith("");
        expect(onUpdateNpn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("NPN race guard (blur + Enter)", () => {
    it("fires onUpdateNpn only once when Enter triggers followed by blur", async () => {
      // Simulate a slow save to make the race window visible
      const slowSave = vi.fn(
        () => new Promise<void>((resolve) => setTimeout(resolve, 100)),
      );
      renderHeader({ onUpdateNpn: slowSave });

      fireEvent.click(screen.getByTitle("Set NPN"));
      const input = screen.getByPlaceholderText("NPN #");
      fireEvent.change(input, { target: { value: "7777777" } });

      // Enter fires handleNpnSave, then blur fires it again
      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" });
        fireEvent.blur(input);
      });

      // Wait for the slow save to complete
      await act(async () => {
        await new Promise((r) => setTimeout(r, 150));
      });

      expect(slowSave).toHaveBeenCalledTimes(1);
    });

    it("allows a second save after first completes (ref resets)", async () => {
      let resolveFirst: () => void;
      const firstSave = new Promise<void>((r) => {
        resolveFirst = r;
      });
      const onUpdateNpn = vi
        .fn()
        .mockReturnValueOnce(firstSave)
        .mockResolvedValue(undefined);

      const { rerender } = renderHeader({ onUpdateNpn });

      // First save
      fireEvent.click(screen.getByTitle("Set NPN"));
      const input = screen.getByPlaceholderText("NPN #");
      fireEvent.change(input, { target: { value: "1111111" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onUpdateNpn).toHaveBeenCalledTimes(1);

      // Resolve and let ref reset
      await act(async () => {
        resolveFirst!();
      });

      // Re-render with updated recruit to simulate mutation success
      const updatedRecruit = { ...baseRecruit, npn: "1111111" } as UserProfile;
      rerender(
        <RecruitDetailHeader
          recruit={updatedRecruit}
          displayName="Jane Doe"
          initials="JD"
          onUpdateNpn={onUpdateNpn}
        />,
      );

      // Click edit again, change value, save — should work
      fireEvent.click(screen.getByTitle("Edit NPN"));
      const input2 = screen.getByPlaceholderText("NPN #");
      fireEvent.change(input2, { target: { value: "2222222" } });
      fireEvent.keyDown(input2, { key: "Enter" });

      await waitFor(() => {
        expect(onUpdateNpn).toHaveBeenCalledTimes(2);
        expect(onUpdateNpn).toHaveBeenLastCalledWith("2222222");
      });
    });
  });
});
