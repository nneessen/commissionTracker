// src/features/expenses/config/recurringConfig.ts

import type { RecurringFrequency } from "../../../types/expense.types";

export const RECURRING_FREQUENCY_OPTIONS: Array<{
  value: RecurringFrequency;
  label: string;
}> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly (Every 2 Weeks)" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly (Every 3 Months)" },
  { value: "semiannually", label: "Semi-Annually (Every 6 Months)" },
  { value: "annually", label: "Annually (Once a Year)" },
];

export const RECURRING_FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannually: "Semi-Annually",
  annually: "Annually",
};

export const RECURRING_FREQUENCY_SHORT: Record<RecurringFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi-Wk",
  monthly: "Monthly",
  quarterly: "Qtly",
  semiannually: "Semi-Ann",
  annually: "Annual",
};

export function getRecurringLabel(
  frequency: RecurringFrequency | null,
): string {
  if (!frequency) return "";
  return RECURRING_FREQUENCY_LABELS[frequency] || frequency;
}

export function getRecurringShortLabel(
  frequency: RecurringFrequency | null,
): string {
  if (!frequency) return "";
  return RECURRING_FREQUENCY_SHORT[frequency] || frequency;
}

export const TAX_DEDUCTIBLE_DISCLAIMER =
  "Tax deductibility tracking is for your personal record-keeping only. " +
  "This application does not provide tax advice. " +
  "Please consult a qualified tax professional or accountant to determine " +
  "which expenses are actually deductible for your situation.";

/**
 * Shorter tooltip version of tax deductible disclaimer
 */
export const TAX_DEDUCTIBLE_TOOLTIP =
  "For personal tracking only. Not tax advice. Consult a tax professional.";

/**
 * Recurring expense info text
 */
export const RECURRING_INFO_TEXT =
  "Mark this as a recurring expense and specify how often it occurs. " +
  "This helps with budgeting and reporting. " +
  "Note: Recurring expenses are not auto-generated - you manually create each entry when it occurs.";
