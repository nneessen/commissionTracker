// src/lib/communityValidation.ts
// Layer: shared domain utilities

const TOPIC_TITLE_MIN = 8;
const TOPIC_TITLE_MAX = 180;
const TOPIC_BODY_MAX = 20_000;
const FAQ_SUMMARY_MIN = 8;
const FAQ_SUMMARY_MAX = 500;
const FAQ_BODY_MAX = 40_000;
const REPORT_REASON_MIN = 3;
const REPORT_REASON_MAX = 100;

const slugPattern = /^[a-z0-9-]{2,140}$/;

export function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function validateTopicTitle(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length < TOPIC_TITLE_MIN || normalized.length > TOPIC_TITLE_MAX) {
    return `Title must be between ${TOPIC_TITLE_MIN} and ${TOPIC_TITLE_MAX} characters.`;
  }
  return null;
}

export function validateTopicBody(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length === 0 || value.length > TOPIC_BODY_MAX) {
    return `Body must be between 1 and ${TOPIC_BODY_MAX} characters.`;
  }
  return null;
}

export function validateFaqSummary(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length < FAQ_SUMMARY_MIN || normalized.length > FAQ_SUMMARY_MAX) {
    return `Summary must be between ${FAQ_SUMMARY_MIN} and ${FAQ_SUMMARY_MAX} characters.`;
  }
  return null;
}

export function validateFaqBody(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length === 0 || value.length > FAQ_BODY_MAX) {
    return `Body must be between 1 and ${FAQ_BODY_MAX} characters.`;
  }
  return null;
}

export function validateReportReason(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length < REPORT_REASON_MIN || normalized.length > REPORT_REASON_MAX) {
    return `Reason must be between ${REPORT_REASON_MIN} and ${REPORT_REASON_MAX} characters.`;
  }
  return null;
}

export function validateSlug(value: string): string | null {
  const normalized = normalizeSlug(value);
  if (!slugPattern.test(normalized)) {
    return "Slug must use lowercase letters, numbers, or hyphens (2-140 chars).";
  }
  return null;
}
