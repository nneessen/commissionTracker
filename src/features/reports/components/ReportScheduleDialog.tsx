// src/features/reports/components/ReportScheduleDialog.tsx
// Dialog for creating and editing scheduled report deliveries
// Phase 9: Report Export Enhancement

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { cn } from '../../../lib/utils';
import {
  Calendar,
  Clock,
  FileText,
  FileSpreadsheet,
  Loader2,
  Check,
  Users,
  X,
} from 'lucide-react';
import { useCurrentUserProfile } from '../../../hooks/admin/useUserApproval';
import {
  useCreateScheduledReport,
  useUpdateScheduledReport,
  useEligibleRecipients,
} from '../../../hooks/reports/scheduled';
import {
  ScheduledReportWithStats,
  SchedulableReportType,
  ReportFrequency,
  ReportExportFormat,
  ScheduleRecipient,
  CreateScheduleRequest,
  SCHEDULABLE_REPORT_TYPES,
  FREQUENCY_OPTIONS,
  DAYS_OF_WEEK,
} from '../../../types/scheduled-reports.types';

interface ReportScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSchedule?: ScheduledReportWithStats | null;
}

export function ReportScheduleDialog({
  open,
  onOpenChange,
  editSchedule,
}: ReportScheduleDialogProps) {
  const { data: userProfile } = useCurrentUserProfile();
  const createSchedule = useCreateScheduledReport();
  const updateSchedule = useUpdateScheduledReport();

  // Determine org scope
  const imoId = userProfile?.imo_id;
  const agencyId = userProfile?.agency_id;
  const isImoAdmin = userProfile?.roles?.includes('imo_admin') || userProfile?.roles?.includes('super_admin');

  // Fetch eligible recipients
  const { data: eligibleRecipients = [], isLoading: loadingRecipients } =
    useEligibleRecipients(imoId, agencyId);

  // Form state
  const [scheduleName, setScheduleName] = useState('');
  const [reportType, setReportType] = useState<SchedulableReportType>('imo-performance');
  const [frequency, setFrequency] = useState<ReportFrequency>('monthly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [preferredTime, setPreferredTime] = useState('08:00');
  const [exportFormat, setExportFormat] = useState<ReportExportFormat>('pdf');
  const [selectedRecipients, setSelectedRecipients] = useState<ScheduleRecipient[]>([]);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);

  // Filter report types based on scope
  const availableReportTypes = useMemo(() => {
    const scope = isImoAdmin ? 'imo' : 'agency';
    return SCHEDULABLE_REPORT_TYPES.filter((rt) => rt.scopes.includes(scope));
  }, [isImoAdmin]);

  // Initialize form when editing
  useEffect(() => {
    if (editSchedule) {
      setScheduleName(editSchedule.schedule_name);
      setReportType(editSchedule.report_type as SchedulableReportType);
      setFrequency(editSchedule.frequency);
      setDayOfWeek(editSchedule.day_of_week ?? 1);
      setDayOfMonth(editSchedule.day_of_month ?? 1);
      setPreferredTime(editSchedule.preferred_time.slice(0, 5));
      setExportFormat(editSchedule.export_format);
      setSelectedRecipients(editSchedule.recipients);
      setIncludeCharts(editSchedule.include_charts);
      setIncludeInsights(editSchedule.include_insights);
      setIncludeSummary(editSchedule.include_summary);
    } else {
      // Reset form for new schedule
      setScheduleName('');
      setReportType(availableReportTypes[0]?.type || 'imo-performance');
      setFrequency('monthly');
      setDayOfWeek(1);
      setDayOfMonth(1);
      setPreferredTime('08:00');
      setExportFormat('pdf');
      setSelectedRecipients([]);
      setIncludeCharts(true);
      setIncludeInsights(true);
      setIncludeSummary(true);
    }
  }, [editSchedule, availableReportTypes, open]);

  // Toggle recipient selection
  const toggleRecipient = (recipient: { user_id: string; email: string; full_name: string }) => {
    setSelectedRecipients((prev) => {
      const exists = prev.some((r) => r.user_id === recipient.user_id);
      if (exists) {
        return prev.filter((r) => r.user_id !== recipient.user_id);
      }
      return [
        ...prev,
        {
          user_id: recipient.user_id,
          email: recipient.email,
          name: recipient.full_name,
        },
      ];
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!scheduleName.trim() || selectedRecipients.length === 0) {
      return;
    }

    const request: CreateScheduleRequest = {
      schedule_name: scheduleName.trim(),
      report_type: reportType,
      frequency,
      day_of_week: frequency === 'weekly' ? dayOfWeek : undefined,
      day_of_month: frequency !== 'weekly' ? dayOfMonth : undefined,
      preferred_time: `${preferredTime}:00`,
      recipients: selectedRecipients,
      export_format: exportFormat,
      include_charts: includeCharts,
      include_insights: includeInsights,
      include_summary: includeSummary,
    };

    if (editSchedule) {
      await updateSchedule.mutateAsync({
        scheduleId: editSchedule.id,
        updates: request,
      });
    } else {
      await createSchedule.mutateAsync(request);
    }

    onOpenChange(false);
  };

  const isSubmitting = createSchedule.isPending || updateSchedule.isPending;
  const canSubmit = scheduleName.trim() && selectedRecipients.length > 0 && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {editSchedule ? 'Edit Report Schedule' : 'Create Report Schedule'}
          </DialogTitle>
          <DialogDescription>
            Configure automated report delivery to your team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Schedule Name */}
          <div>
            <Label htmlFor="schedule-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Schedule Name
            </Label>
            <Input
              id="schedule-name"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              placeholder="e.g., Monthly Performance Report"
              className="mt-1.5"
            />
          </div>

          {/* Report Type */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Report Type
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {availableReportTypes.map((rt) => (
                <button
                  key={rt.type}
                  type="button"
                  onClick={() => setReportType(rt.type)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    reportType === rt.type
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{rt.icon}</span>
                    <span className="font-medium text-sm">{rt.name}</span>
                    {reportType === rt.type && (
                      <Check className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{rt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Frequency & Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Frequency
              </Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as ReportFrequency)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {frequency === 'weekly' ? (
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Day of Week
                </Label>
                <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Day of Month
                </Label>
                <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="w-3 h-3 inline mr-1" />
                Delivery Time (UTC)
              </Label>
              <Input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Export Format
              </Label>
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all',
                    exportFormat === 'pdf'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all',
                    exportFormat === 'csv'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="text-sm">CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recipients */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="w-3 h-3 inline mr-1" />
              Recipients ({selectedRecipients.length} selected)
            </Label>

            {loadingRecipients ? (
              <div className="flex items-center justify-center p-4 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading team members...
              </div>
            ) : eligibleRecipients.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">
                No team members available for selection.
              </p>
            ) : (
              <>
                {/* Selected recipients */}
                {selectedRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                    {selectedRecipients.map((r) => (
                      <span
                        key={r.user_id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                      >
                        {r.name}
                        <button
                          type="button"
                          onClick={() => toggleRecipient({ user_id: r.user_id, email: r.email, full_name: r.name })}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Available recipients */}
                <div className="max-h-40 overflow-y-auto border rounded-lg mt-1.5">
                  {eligibleRecipients.map((recipient) => {
                    const isSelected = selectedRecipients.some((r) => r.user_id === recipient.user_id);
                    return (
                      <label
                        key={recipient.user_id}
                        className={cn(
                          'flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 border-b last:border-0',
                          isSelected && 'bg-primary/5'
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRecipient(recipient)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{recipient.full_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{recipient.email}</div>
                        </div>
                        {recipient.agency_name && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {recipient.agency_name}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* PDF Options */}
          {exportFormat === 'pdf' && (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                PDF Options
              </Label>
              <div className="flex flex-wrap gap-4 mt-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={includeSummary} onCheckedChange={(c) => setIncludeSummary(!!c)} />
                  <span className="text-sm">Include Summary</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={includeCharts} onCheckedChange={(c) => setIncludeCharts(!!c)} />
                  <span className="text-sm">Include Charts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={includeInsights} onCheckedChange={(c) => setIncludeInsights(!!c)} />
                  <span className="text-sm">Include Insights</span>
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {selectedRecipients.length === 0
                ? 'Select at least one recipient'
                : `Will deliver to ${selectedRecipients.length} recipient${selectedRecipients.length !== 1 ? 's' : ''}`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editSchedule ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    {editSchedule ? 'Update Schedule' : 'Create Schedule'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
