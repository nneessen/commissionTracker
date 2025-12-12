// src/features/training-hub/components/workflow-wizard/WorkflowTriggerSetup.tsx

import {useState, useEffect} from 'react';
import {Play, Calendar, Zap, Webhook} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {cn} from '@/lib/utils';
import type {WorkflowFormData, TriggerType, WorkflowTrigger} from '@/types/workflow.types';
import {useTriggerEventTypes} from '@/hooks/workflows';
import EventSelectionDialog from './EventSelectionDialog';

interface WorkflowTriggerSetupProps {
  data: WorkflowFormData;
  onChange: (updates: Partial<WorkflowFormData>) => void;
  errors: Record<string, string>;
}

const TRIGGER_TYPES = [
  { value: 'manual' as TriggerType, label: 'Manual', icon: Play },
  { value: 'schedule' as TriggerType, label: 'Schedule', icon: Calendar },
  { value: 'event' as TriggerType, label: 'Event', icon: Zap },
  { value: 'webhook' as TriggerType, label: 'Webhook', icon: Webhook }
];

export default function WorkflowTriggerSetup({ data, onChange, errors }: WorkflowTriggerSetupProps) {
  const { data: eventTypes = [] } = useTriggerEventTypes();
  const [scheduleTime, setScheduleTime] = useState(data.trigger?.schedule?.time || '09:00');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(data.trigger?.schedule?.dayOfWeek || 'daily');
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  // Update parent when schedule changes
  useEffect(() => {
    if (data.triggerType === 'schedule') {
      const newTrigger: WorkflowTrigger = {
        type: 'schedule',
        schedule: {
          time: scheduleTime,
          dayOfWeek: scheduleDayOfWeek,
        }
      };
      onChange({ trigger: newTrigger });
    }
  }, [scheduleTime, scheduleDayOfWeek, data.triggerType]);

  const handleTriggerTypeChange = (type: TriggerType) => {
    // Create proper trigger object based on type
    let newTrigger: WorkflowTrigger;

    switch (type) {
      case 'manual':
        newTrigger = { type: 'manual' };
        break;
      case 'schedule':
        newTrigger = {
          type: 'schedule',
          schedule: {
            time: scheduleTime,
            dayOfWeek: scheduleDayOfWeek
          }
        };
        break;
      case 'event':
        newTrigger = {
          type: 'event',
          eventName: data.trigger?.eventName // Preserve selected event if any
        };
        break;
      case 'webhook':
        newTrigger = {
          type: 'webhook',
          webhookConfig: data.trigger?.webhookConfig
        };
        break;
      default:
        newTrigger = { type: 'manual' };
    }

    console.log('[WorkflowTriggerSetup] Changing trigger type to:', {
      newType: type,
      newTrigger,
      preservedEventName: data.trigger?.eventName
    });

    // Update both triggerType and trigger together
    onChange({
      triggerType: type,
      trigger: newTrigger
    });
  };

  const handleEventChange = (eventName: string) => {
    const newTrigger: WorkflowTrigger = {
      type: 'event',
      eventName
    };

    console.log('[WorkflowTriggerSetup] Selecting event:', {
      eventName,
      newTrigger
    });

    // Ensure both triggerType and trigger are updated
    onChange({
      triggerType: 'event',
      trigger: newTrigger
    });
  };

  return (
    <div className="w-full space-y-3">
      {/* Trigger type selection - compact but visible */}
      <div className="p-2 rounded-md bg-muted/50">
        <Label className="text-xs font-medium text-muted-foreground mb-2 block">
          Select Trigger Type
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {TRIGGER_TYPES.map((trigger) => {
            const Icon = trigger.icon;
            const isSelected = data.triggerType === trigger.value;

            // Define color themes for each trigger type
            const colorTheme = {
              manual: isSelected
                ? "bg-blue-500/10 text-blue-600 border-blue-500/50 dark:text-blue-400"
                : "bg-background border-input hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
              schedule: isSelected
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/50 dark:text-emerald-400"
                : "bg-background border-input hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
              event: isSelected
                ? "bg-amber-500/10 text-amber-600 border-amber-500/50 dark:text-amber-400"
                : "bg-background border-input hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
              webhook: isSelected
                ? "bg-violet-500/10 text-violet-600 border-violet-500/50 dark:text-violet-400"
                : "bg-background border-input hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
            }[trigger.value];

            return (
              <button
                key={trigger.value}
                type="button"
                onClick={() => handleTriggerTypeChange(trigger.value)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md border transition-all text-xs",
                  colorTheme,
                  isSelected && "shadow-sm"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{trigger.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trigger Configuration */}
      {data.triggerType && (
        <div className="p-2 rounded-md bg-muted/30">
          <Label className="text-xs font-medium text-muted-foreground mb-2 block">
            Configure {data.triggerType.charAt(0).toUpperCase() + data.triggerType.slice(1)} Trigger
          </Label>

          {data.triggerType === 'manual' && (
            <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                This workflow will only run when you manually trigger it from the workflows list.
              </p>
            </div>
          )}

          {data.triggerType === 'schedule' && (
            <div className="space-y-2">
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
                  Schedule this workflow to run automatically at a specific time.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground">Time</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="h-8 text-xs bg-background border-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground">Frequency</Label>
                  <Select
                    value={scheduleDayOfWeek}
                    onValueChange={(v) => setScheduleDayOfWeek(v)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background border-emerald-500/30 focus:border-emerald-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                      <SelectItem value="weekday" className="text-xs">Weekdays</SelectItem>
                      <SelectItem value="monday" className="text-xs">Monday</SelectItem>
                      <SelectItem value="tuesday" className="text-xs">Tuesday</SelectItem>
                      <SelectItem value="wednesday" className="text-xs">Wednesday</SelectItem>
                      <SelectItem value="thursday" className="text-xs">Thursday</SelectItem>
                      <SelectItem value="friday" className="text-xs">Friday</SelectItem>
                      <SelectItem value="saturday" className="text-xs">Saturday</SelectItem>
                      <SelectItem value="sunday" className="text-xs">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {errors.schedule && (
                <p className="text-xs text-destructive">{errors.schedule}</p>
              )}
            </div>
          )}

          {data.triggerType === 'event' && (
            <div className="space-y-2">
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Trigger this workflow when specific events occur in your system.
                </p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Select Event</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEventDialogOpen(true)}
                  className={cn(
                    "w-full h-8 justify-between text-xs bg-background border-amber-500/30 hover:border-amber-500",
                    errors.trigger && "border-destructive",
                    !data.trigger?.eventName && "text-muted-foreground"
                  )}
                >
                  {data.trigger?.eventName ? (
                    <span className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span className="font-medium">{data.trigger.eventName}</span>
                    </span>
                  ) : (
                    <span>Choose an event to listen for...</span>
                  )}
                  <Zap className="h-3 w-3 ml-2" />
                </Button>
                {errors.trigger && (
                  <p className="text-xs text-destructive mt-1">{errors.trigger}</p>
                )}

                {/* Show selected event details */}
                {data.trigger?.eventName && (
                  <div className="mt-2 p-2 rounded bg-muted/50 border border-amber-500/20">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mb-1">
                      Event: {data.trigger.eventName}
                    </p>
                    {(() => {
                      const selectedEventType = eventTypes.find(e => e.eventName === data.trigger?.eventName);
                      if (selectedEventType?.description) {
                        return (
                          <p className="text-[10px] text-muted-foreground">
                            {selectedEventType.description}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              {/* Event Selection Dialog */}
              <EventSelectionDialog
                open={eventDialogOpen}
                onOpenChange={setEventDialogOpen}
                eventTypes={eventTypes}
                selectedEvent={data.trigger?.eventName}
                onSelectEvent={handleEventChange}
              />
            </div>
          )}

          {data.triggerType === 'webhook' && (
            <div className="p-2 rounded bg-violet-500/10 border border-violet-500/20">
              <p className="text-xs text-violet-600 dark:text-violet-400">
                A unique webhook URL will be generated after you create this workflow.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}