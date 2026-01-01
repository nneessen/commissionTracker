// src/lib/pipeline.ts
// Shared utilities for pipeline phase handling

import type { PipelinePhase } from "@/types/recruiting.types";

/**
 * Normalize phase name to status key format.
 * Converts display names to snake_case status keys.
 *
 * Examples:
 * - "Interview 1" -> "interview_1"
 * - "Pre-Licensing" -> "pre_licensing"
 * - "Zoom Interview" -> "zoom_interview"
 *
 * This is the single source of truth for phase name normalization.
 */
export const normalizePhaseNameToStatus = (phaseName: string): string => {
  return phaseName.toLowerCase().replace(/[- ]/g, "_");
};

/**
 * Build status options for filter dropdowns from pipeline phases.
 * Includes both dynamic phase statuses and terminal statuses.
 */
export const buildStatusOptions = (
  pipelinePhases: PipelinePhase[],
): { value: string; label: string }[] => {
  const phaseOptions = pipelinePhases.map((phase) => ({
    value: normalizePhaseNameToStatus(phase.phase_name),
    label: phase.phase_name,
  }));

  // Terminal statuses that exist outside of pipeline phases
  const terminalOptions = [
    { value: "completed", label: "Completed" },
    { value: "dropped", label: "Dropped" },
  ];

  return [...phaseOptions, ...terminalOptions];
};

/**
 * Get active (non-terminal) phase statuses from pipeline phases.
 * Used for calculating "active" recruit counts.
 */
export const getActivePhaseStatuses = (
  pipelinePhases: PipelinePhase[],
): string[] => {
  return pipelinePhases.map((phase) =>
    normalizePhaseNameToStatus(phase.phase_name),
  );
};

/**
 * Terminal statuses that indicate a recruit is no longer in the pipeline.
 */
export const TERMINAL_STATUSES = ["completed", "dropped", "withdrawn"] as const;
export type TerminalStatusValue = (typeof TERMINAL_STATUSES)[number];

/**
 * Check if a status is a terminal status (not an active pipeline phase).
 */
export const isTerminalStatus = (
  status: string | null | undefined,
): boolean => {
  if (!status) return false;
  return TERMINAL_STATUSES.includes(status as TerminalStatusValue);
};

/**
 * Check if a recruit is considered "active" (in pipeline, not terminal).
 * @param status - The recruit's onboarding_status
 * @param activePhaseStatuses - Optional list of valid active phase statuses
 */
export const isActiveRecruit = (
  status: string | null | undefined,
  activePhaseStatuses?: string[],
): boolean => {
  if (!status) return false;

  // If we have explicit active statuses, check against them
  if (activePhaseStatuses && activePhaseStatuses.length > 0) {
    return activePhaseStatuses.includes(status);
  }

  // Fallback: anything that's not terminal is active
  return !isTerminalStatus(status);
};
