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
    schedule: { time: '09:00', dayOfWeek: 'daily' }
  },
  {
    label: 'Every Monday at 8 AM',
    schedule: { time: '08:00', dayOfWeek: 'monday' }
  },
  {
    label: 'Every weekday at 5 PM',
    schedule: { time: '17:00', dayOfWeek: 'weekday' }
  },
  {
    label: 'First of month at 10 AM',
    schedule: { time: '10:00', dayOfWeek: 'monthly', dayOfMonth: 1 }
  },
];

export default function WorkflowTriggerSetup({ data, onChange, errors }: WorkflowTriggerSetupProps) {
  const { data: eventTypes = [] } = useTriggerEventTypes();
  const [scheduleTime, setScheduleTime] = useState(data.trigger?.schedule?.time || '09:00');
  const [scheduleFrequency, setScheduleFrequency] = useState(data.trigger?.schedule?.dayOfWeek || 'daily');

  // Update parent when schedule changes
  useEffect(() => {
    if (data.triggerType === 'schedule') {
      const newTrigger: WorkflowTrigger = {
        type: 'schedule',
        schedule: {
          time: scheduleTime,
          dayOfWeek: scheduleFrequency
        }
      };
      onChange({ trigger: newTrigger });
    }
  }, [scheduleTime, scheduleFrequency, data.triggerType]);

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

  const applySchedulePreset = (preset: typeof SCHEDULE_PRESETS[0]) => {
    setScheduleTime(preset.schedule.time);
    setScheduleFrequency(preset.schedule.dayOfWeek);

    const newTrigger: WorkflowTrigger = {
      type: 'schedule',
      schedule: preset.schedule
    };
    onChange({ trigger: newTrigger });
  };

  const handleEventChange = (eventName: string) => {
    const newTrigger: WorkflowTrigger = {
      type: 'event',
      eventName
    };
    onChange({ trigger: newTrigger });
  };

  const isSchedulePresetActive = (preset: typeof SCHEDULE_PRESETS[0]) => {
    return scheduleTime === preset.schedule.time &&
           scheduleFrequency === preset.schedule.dayOfWeek;
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
            <div>
              <Label className="text-sm font-medium mb-2 block">Quick Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {SCHEDULE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applySchedulePreset(preset)}
                    className={cn(
                      "p-3 rounded-md border text-left transition-all text-sm",
                      "hover:bg-muted",
                      isSchedulePresetActive(preset)
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Time</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Frequency</Label>
                <Select
                  value={scheduleFrequency}
                  onValueChange={setScheduleFrequency}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekday">Weekdays only</SelectItem>
                    <SelectItem value="monday">Every Monday</SelectItem>
                    <SelectItem value="tuesday">Every Tuesday</SelectItem>
                    <SelectItem value="wednesday">Every Wednesday</SelectItem>
                    <SelectItem value="thursday">Every Thursday</SelectItem>
                    <SelectItem value="friday">Every Friday</SelectItem>
                    <SelectItem value="saturday">Every Saturday</SelectItem>
                    <SelectItem value="sunday">Every Sunday</SelectItem>
                    <SelectItem value="monthly">Monthly (1st day)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {errors.schedule && (
              <p className="text-sm text-destructive">{errors.schedule}</p>
            )}

            <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Schedule Summary:</p>
                <p>
                  {scheduleFrequency === 'daily' && `Every day at ${scheduleTime}`}
                  {scheduleFrequency === 'weekday' && `Monday-Friday at ${scheduleTime}`}
                  {scheduleFrequency === 'monthly' && `1st of each month at ${scheduleTime}`}
                  {!['daily', 'weekday', 'monthly'].includes(scheduleFrequency) &&
                    `Every ${scheduleFrequency} at ${scheduleTime}`}
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
                <div className="p-4 rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground">
                    No event types available. Contact your administrator to configure events.
                  </p>
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