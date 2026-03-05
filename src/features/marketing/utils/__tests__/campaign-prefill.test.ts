import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailBlock } from "@/types/email.types";
import {
  saveCampaignPrefill,
  consumeCampaignPrefill,
} from "../campaign-prefill";

const STORAGE_PREFIX = "marketing-campaign-prefill:";

function makeBlocks(text: string): EmailBlock[] {
  return [
    {
      id: "block-1",
      type: "text",
      content: {
        type: "text",
        text,
      },
    } as unknown as EmailBlock,
  ];
}

describe("campaign-prefill utility", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves and consumes a prefill payload once", () => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "11111111-1111-1111-1111-111111111111",
    );
    const blocks = makeBlocks("Hello");

    const id = saveCampaignPrefill({
      blocks,
      subject: "Welcome",
    });

    expect(id).toBe("11111111-1111-1111-1111-111111111111");
    expect(sessionStorage.getItem(`${STORAGE_PREFIX}${id}`)).toBeTruthy();

    const consumed = consumeCampaignPrefill(id ?? undefined);
    expect(consumed).not.toBeNull();
    expect(consumed?.blocks).toEqual(blocks);
    expect(consumed?.subject).toBe("Welcome");
    expect(typeof consumed?.createdAt).toBe("number");

    expect(sessionStorage.getItem(`${STORAGE_PREFIX}${id}`)).toBeNull();
    expect(consumeCampaignPrefill(id ?? undefined)).toBeNull();
  });

  it("returns null when payload is too large for safe prefill", () => {
    const hugeBlocks = makeBlocks("x".repeat(300_000));

    const id = saveCampaignPrefill({
      blocks: hugeBlocks,
      subject: "Big",
    });

    expect(id).toBeNull();
  });

  it("returns null when storage write fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });

    const id = saveCampaignPrefill({
      blocks: makeBlocks("Hello"),
      subject: "Welcome",
    });

    expect(id).toBeNull();
  });
});
