// src/services/community/__tests__/communityValidation.test.ts

import { describe, expect, it } from "vitest";
import {
  normalizeSlug,
  validateSlug,
  validateTopicTitle,
  validateTopicBody,
  validateFaqSummary,
  validateFaqBody,
  validateReportReason,
} from "../communityValidation";

describe("communityValidation", () => {
  it("normalizes slug input", () => {
    expect(normalizeSlug("  Life Insurance Basics!  ")).toBe(
      "life-insurance-basics",
    );
  });

  it("rejects invalid slugs", () => {
    expect(validateSlug("***")).toBeTruthy();
    expect(validateSlug("ok-slug")).toBeNull();
  });

  it("validates topic title and body", () => {
    expect(validateTopicTitle("short")).toBeTruthy();
    expect(validateTopicTitle("How do I submit IMO paperwork faster?")).toBeNull();
    expect(validateTopicBody("   ")).toBeTruthy();
    expect(validateTopicBody("Valid body content")).toBeNull();
  });

  it("validates FAQ fields", () => {
    expect(validateFaqSummary("short")).toBeTruthy();
    expect(
      validateFaqSummary(
        "This summary is long enough to be accepted by the validator.",
      ),
    ).toBeNull();
    expect(validateFaqBody(" ")).toBeTruthy();
    expect(validateFaqBody("FAQ body")).toBeNull();
  });

  it("validates report reason length", () => {
    expect(validateReportReason("no")).toBeTruthy();
    expect(validateReportReason("Spam content")).toBeNull();
  });
});
