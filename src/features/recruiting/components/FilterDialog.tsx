// src/features/recruiting/components/FilterDialog.tsx

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { UserSearchCombobox } from "@/components/user-search-combobox";
import type { PipelinePhase } from "@/types/recruiting.types";
import { normalizePhaseNameToStatus } from "@/lib/pipeline";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface RecruitFilters {
  phases?: string[]; // Dynamic - phase names from pipeline_phases
  statuses?: string[]; // Dynamic - normalized status keys (e.g., "interview_1")
  recruiterId?: string;
  uplineId?: string;
  referralSource?: string;
  dateRange?: DateRange;
}

interface FilterOption {
  id: string;
  name: string;
}

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: RecruitFilters;
  onFiltersChange: (filters: RecruitFilters) => void;
  recruiters: FilterOption[];
  referralSources: string[];
  /** Pipeline phases - fetched from database, not hardcoded */
  pipelinePhases?: PipelinePhase[];
}

// Terminal statuses that exist outside of pipeline phases
const TERMINAL_STATUSES = [
  { value: "completed", label: "Completed" },
  { value: "dropped", label: "Dropped" },
];

export function FilterDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  recruiters,
  referralSources,
  pipelinePhases = [],
}: FilterDialogProps) {
  // Build status options from pipeline phases + terminal statuses
  const statusOptions = [
    ...pipelinePhases.map((phase) => ({
      value: normalizePhaseNameToStatus(phase.phase_name),
      label: phase.phase_name,
    })),
    ...TERMINAL_STATUSES,
  ];

  const handlePhaseToggle = (phaseName: string) => {
    const currentPhases = filters.phases || [];
    const newPhases = currentPhases.includes(phaseName)
      ? currentPhases.filter((p) => p !== phaseName)
      : [...currentPhases, phaseName];
    onFiltersChange({
      ...filters,
      phases: newPhases.length ? newPhases : undefined,
    });
  };

  const handleStatusToggle = (status: string) => {
    const currentStatuses = filters.statuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    onFiltersChange({
      ...filters,
      statuses: newStatuses.length ? newStatuses : undefined,
    });
  };

  const handleClearAll = () => {
    onFiltersChange({});
  };

  const activeFilterCount =
    (filters.phases?.length || 0) +
    (filters.statuses?.length || 0) +
    (filters.recruiterId ? 1 : 0) +
    (filters.uplineId ? 1 : 0) +
    (filters.referralSource ? 1 : 0) +
    (filters.dateRange ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Filter Recruits</span>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                Clear All ({activeFilterCount})
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Phase Filter - Dynamic from pipeline_phases */}
          {pipelinePhases.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phase</Label>
              <div className="grid grid-cols-2 gap-2">
                {pipelinePhases.map((phase) => (
                  <div key={phase.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`phase-${phase.id}`}
                      checked={
                        filters.phases?.includes(phase.phase_name) || false
                      }
                      onCheckedChange={() =>
                        handlePhaseToggle(phase.phase_name)
                      }
                    />
                    <label
                      htmlFor={`phase-${phase.id}`}
                      className="text-xs cursor-pointer"
                    >
                      {phase.phase_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Filter - Dynamic from pipeline phases + terminal statuses */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map(({ value, label }) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${value}`}
                    checked={filters.statuses?.includes(value) || false}
                    onCheckedChange={() => handleStatusToggle(value)}
                  />
                  <label
                    htmlFor={`status-${value}`}
                    className="text-xs cursor-pointer"
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Recruiter Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Recruiter</Label>
            <Select
              value={filters.recruiterId || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  recruiterId: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All recruiters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All recruiters</SelectItem>
                {recruiters.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upline Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Upline</Label>
            <UserSearchCombobox
              value={filters.uplineId || null}
              onChange={(id) =>
                onFiltersChange({
                  ...filters,
                  uplineId: id || undefined,
                })
              }
              approvalStatus="approved"
              placeholder="Search for upline..."
              showNoUplineOption={true}
              noUplineLabel="All uplines"
              className="h-8"
            />
          </div>

          {/* Referral Source Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Referral Source</Label>
            <Select
              value={filters.referralSource || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  referralSource: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {referralSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Created Date Range</Label>
            <DateRangePicker
              value={filters.dateRange}
              onChange={(range) =>
                onFiltersChange({
                  ...filters,
                  dateRange: range || undefined,
                })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
