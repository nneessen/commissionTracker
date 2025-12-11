// src/features/training-hub/components/workflow-wizard/WorkflowTriggerSetup.tsx

import { useState, useEffect } from 'react';
import { Play, Calendar, Zap, Webhook, Clock, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { WorkflowFormData, TriggerType, WorkflowTrigger } from '@/types/workflow.types';
import { useTriggerEventTypes } from '@/hooks/workflows';
import { seedTriggerEventTypes } from '@/features/training-hub/utils/seedTriggerEvents';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface WorkflowTriggerSetupProps {
  data: WorkflowFormData;
  onChange: (updates: Partial<WorkflowFormData>) => void;
  errors: Record<string, string>;
}

const TRIGGER_TYPES = [
  {
    value: 'manual' as TriggerType,
    label: 'Manual',
    icon: Play,
    description: 'Trigger manually from the UI',
    color: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  {
    value: 'schedule' as TriggerType,
    label: 'Schedule',
    icon: Calendar,
    description: 'Run automatically on a schedule',
    color: 'bg-green-100 text-green-700 border-green-300'
  },
  {
    value: 'event' as TriggerType,
    label: 'Event',
    icon: Zap,
    description: 'Trigger when events occur',
    color: 'bg-purple-100 text-purple-700 border-purple-300'
  },
  {
    value: 'webhook' as TriggerType,
    label: 'Webhook',
    icon: Webhook,
    description: 'Trigger via external API',
    color: 'bg-orange-100 text-orange-700 border-orange-300'
  }
];

const SCHEDULE_PRESETS = [
  {
    label: 'Every day at 9 AM',
    schedule: { time: '09:00', frequency: 'daily', dayOfWeek: 'daily' }
  },
  {
    label: 'Every Monday at 8 AM',
    schedule: { time: '08:00', frequency: 'weekly', dayOfWeek: 'monday' }
  },
  {
    label: 'Every weekday at 5 PM',
    schedule: { time: '17:00', frequency: 'weekdays', dayOfWeek: 'weekday' }
  },
  {
    label: 'First of month at 10 AM',
    schedule: { time: '10:00', frequency: 'monthly', dayOfWeek: 'monthly', dayOfMonth: 1 }
  },
];

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Hourly', description: 'Every X hours' },
  { value: 'daily', label: 'Daily', description: 'Once per day' },
  { value: 'weekdays', label: 'Weekdays', description: 'Monday-Friday' },
  { value: 'weekly', label: 'Weekly', description: 'Specific days of week' },
  { value: 'monthly', label: 'Monthly', description: 'Once per month' },
];

type ScheduleFrequency = 'hourly' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export default function WorkflowTriggerSetup({ data, onChange, errors }: WorkflowTriggerSetupProps) {
  const { data: eventTypes = [], refetch: refetchEventTypes } = useTriggerEventTypes();
  const [scheduleTime, setScheduleTime] = useState(data.trigger?.schedule?.time || '09:00');
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>(
    (data.trigger?.schedule?.frequency as ScheduleFrequency) || 'daily'
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(data.trigger?.schedule?.selectedDays || ['monday']);
  const [intervalHours, setIntervalHours] = useState(data.trigger?.schedule?.intervalHours || 4);
  const [dayOfMonth, setDayOfMonth] = useState(data.trigger?.schedule?.dayOfMonth || 1);
  const [isSeeding, setIsSeeding] = useState(false);

  // Update parent when schedule changes
  useEffect(() => {
    if (data.triggerType === 'schedule') {
      const newTrigger: WorkflowTrigger = {
        type: 'schedule',
        schedule: {
          time: scheduleTime,
          frequency: scheduleFrequency,
          dayOfWeek: scheduleFrequency, // Keep for backwards compatibility
          selectedDays: scheduleFrequency === 'weekly' ? selectedDays : undefined,
          intervalHours: scheduleFrequency === 'hourly' ? intervalHours : undefined,
          dayOfMonth: scheduleFrequency === 'monthly' ? dayOfMonth : undefined,
        }
      };
      onChange({ trigger: newTrigger });
    }
  }, [scheduleTime, scheduleFrequency, selectedDays, intervalHours, dayOfMonth, data.triggerType]);

  const handleTriggerTypeChange = (type: TriggerType) => {
    onChange({
      triggerType: type,
      trigger: undefined // Reset trigger config when type changes
    });

    // Initialize default values for schedule
    if (type === 'schedule') {
      setScheduleTime('09:00');
      setScheduleFrequency('daily');
    }
  };

  const handleEventChange = (eventName: string) => {
    const newTrigger: WorkflowTrigger = {
      type: 'event',
      eventName
    };
    onChange({ trigger: newTrigger });
  };

  const handleSeedEventTypes = async () => {
    setIsSeeding(true);
    try {
      await seedTriggerEventTypes();
      await refetchEventTypes();
      toast.success('Event types successfully populated!');
    } catch (error) {
      console.error('Failed to seed event types:', error);
      toast.error('Failed to populate event types. Please try again.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Trigger Type Selection */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Choose Trigger Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {TRIGGER_TYPES.map((trigger) => {
            const Icon = trigger.icon;
            const isSelected = data.triggerType === trigger.value;

            return (
              <button
                key={trigger.value}
                type="button"
                onClick={() => handleTriggerTypeChange(trigger.value)}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-left",
                  "hover:shadow-md",
                  isSelected ? trigger.color : "border-border hover:border-muted-foreground"
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{trigger.label}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {trigger.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trigger Configuration */}
      <div className="space-y-4">
        {data.triggerType === 'manual' && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex gap-3">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Manual Trigger
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  This workflow will only run when you click the "Run" button in the workflows list.
                  Perfect for testing or one-time operations.
                </p>
              </div>
            </div>
          </div>
        )}

        {data.triggerType === 'schedule' && (
          <div className="space-y-4">
            {/* Quick Presets */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Quick Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {SCHEDULE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setScheduleTime(preset.schedule.time);
                      setScheduleFrequency(preset.schedule.frequency as ScheduleFrequency);
                      if (preset.schedule.dayOfMonth) setDayOfMonth(preset.schedule.dayOfMonth);
                    }}
                    className={cn(
                      "p-2.5 rounded-md border text-left transition-all text-sm",
                      "hover:bg-muted",
                      scheduleFrequency === preset.schedule.frequency && scheduleTime === preset.schedule.time
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Frequency</Label>
              <Select
                value={scheduleFrequency}
                onValueChange={(value) => setScheduleFrequency(value as ScheduleFrequency)}
              >
                <SelectTrigger className="h-10 border-input bg-background hover:bg-accent/50 transition-colors">
                  <SelectValue placeholder="Select frequency..." />
                </SelectTrigger>
                <SelectContent className="min-w-[250px]">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="py-2 cursor-pointer">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{option.label}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hourly interval */}
            {scheduleFrequency === 'hourly' && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Run every</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={intervalHours}
                    onChange={(e) => setIntervalHours(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
                    className="w-20 h-10"
                    min={1}
                    max={24}
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
            )}

            {/* Weekly - Day selection */}
            {scheduleFrequency === 'weekly' && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        if (selectedDays.includes(day.value)) {
                          if (selectedDays.length > 1) {
                            setSelectedDays(selectedDays.filter(d => d !== day.value));
                          }
                        } else {
                          setSelectedDays([...selectedDays, day.value]);
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        selectedDays.includes(day.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly - Day of month */}
            {scheduleFrequency === 'monthly' && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Day of Month</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))}
                    className="w-20 h-10"
                    min={1}
                    max={28}
                  />
                  <span className="text-sm text-muted-foreground">of each month</span>
                </div>
              </div>
            )}

            {/* Time of day (not for hourly) */}
            {scheduleFrequency !== 'hourly' && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Time of Day</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-32 h-10"
                />
              </div>
            )}

            {errors.schedule && (
              <p className="text-sm text-destructive">{errors.schedule}</p>
            )}

            {/* Schedule Summary */}
            <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Schedule Summary:</p>
                <p>
                  {scheduleFrequency === 'hourly' && `Every ${intervalHours} hour${intervalHours > 1 ? 's' : ''}`}
                  {scheduleFrequency === 'daily' && `Every day at ${scheduleTime}`}
                  {scheduleFrequency === 'weekdays' && `Monday-Friday at ${scheduleTime}`}
                  {scheduleFrequency === 'weekly' && `Every ${selectedDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')} at ${scheduleTime}`}
                  {scheduleFrequency === 'monthly' && `${dayOfMonth}${dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th'} of each month at ${scheduleTime}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {data.triggerType === 'event' && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Select Event Type</Label>
              {eventTypes.length === 0 ? (
                <div className="p-4 rounded-md border border-dashed space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No event types available. Click the button below to populate event types.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSeedEventTypes}
                    disabled={isSeeding}
                    className="w-full"
                  >
                    {isSeeding ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Populating Event Types...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Populate Event Types
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Select
                  value={data.trigger?.eventName || ''}
                  onValueChange={handleEventChange}
                >
                  <SelectTrigger className={cn(errors.trigger && "border-destructive")}>
                    <SelectValue placeholder="Choose an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((event) => (
                      <SelectItem key={event.id} value={event.eventName}>
                        <div>
                          <div className="font-medium">{event.eventName}</div>
                          {event.description && (
                            <div className="text-xs text-muted-foreground">
                              {event.description}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.trigger && (
                <p className="text-sm text-destructive mt-1">{errors.trigger}</p>
              )}
            </div>

            {data.trigger?.eventName && (
              <div className="p-3 rounded-md bg-muted">
                <p className="text-sm font-medium mb-2">Available Variables:</p>
                <div className="flex flex-wrap gap-1">
                  {['{{event.data}}', '{{event.timestamp}}', '{{event.user}}'].map((variable) => (
                    <Badge key={variable} variant="secondary" className="font-mono text-xs">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {data.triggerType === 'webhook' && (
          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
            <div className="flex gap-3">
              <Info className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Webhook Configuration
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  After creating this workflow, you'll receive a unique webhook URL to use in external systems.
                </p>
                <div className="p-2 rounded bg-white/50 dark:bg-black/20 border border-orange-300 dark:border-orange-700">
                  <code className="text-xs">
                    POST https://api.yourapp.com/webhook/[workflow-id]
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}