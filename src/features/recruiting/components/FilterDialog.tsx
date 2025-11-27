// src/features/recruiting/components/FilterDialog.tsx

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Label } from '@/components/ui/label';
import {
  PHASE_DISPLAY_NAMES,
  OnboardingStatus,
  PhaseName,
} from '@/types/recruiting';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface RecruitFilters {
  phases?: PhaseName[];
  statuses?: OnboardingStatus[];
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
  uplines: FilterOption[];
  referralSources: string[];
}

// Statuses mirror the pipeline phases + completed/dropped
const STATUSES: { value: OnboardingStatus; label: string }[] = [
  { value: 'interview_1', label: 'Interview 1' },
  { value: 'zoom_interview', label: 'Zoom Interview' },
  { value: 'pre_licensing', label: 'Pre-Licensing' },
  { value: 'exam', label: 'Exam' },
  { value: 'npn_received', label: 'NPN Received' },
  { value: 'contracting', label: 'Contracting' },
  { value: 'bootcamp', label: 'Bootcamp' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped', label: 'Dropped' },
];

const PHASES = Object.entries(PHASE_DISPLAY_NAMES) as [PhaseName, string][];

export function FilterDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  recruiters,
  uplines,
  referralSources,
}: FilterDialogProps) {
  const handlePhaseToggle = (phase: PhaseName) => {
    const currentPhases = filters.phases || [];
    const newPhases = currentPhases.includes(phase)
      ? currentPhases.filter((p) => p !== phase)
      : [...currentPhases, phase];
    onFiltersChange({ ...filters, phases: newPhases.length ? newPhases : undefined });
  };

  const handleStatusToggle = (status: OnboardingStatus) => {
    const currentStatuses = filters.statuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses.length ? newStatuses : undefined });
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
          {/* Phase Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Phase</Label>
            <div className="grid grid-cols-2 gap-2">
              {PHASES.map(([value, label]) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`phase-${value}`}
                    checked={filters.phases?.includes(value) || false}
                    onCheckedChange={() => handlePhaseToggle(value)}
                  />
                  <label
                    htmlFor={`phase-${value}`}
                    className="text-xs cursor-pointer"
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status (Phase)</Label>
            <div className="grid grid-cols-3 gap-2">
              {STATUSES.map(({ value, label }) => (
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
              value={filters.recruiterId || ''}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  recruiterId: value || undefined,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All recruiters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All recruiters</SelectItem>
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
            <Select
              value={filters.uplineId || ''}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  uplineId: value || undefined,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All uplines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All uplines</SelectItem>
                {uplines.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Referral Source Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Referral Source</Label>
            <Select
              value={filters.referralSource || ''}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  referralSource: value || undefined,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All sources</SelectItem>
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
