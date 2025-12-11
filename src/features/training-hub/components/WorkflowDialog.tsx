// /home/nneessen/projects/commissionTracker/src/features/training-hub/components/WorkflowDialog.tsx

import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import {
  Trash2,
  Mail,
  Bell,
  Clock,
  Webhook,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateWorkflow, useUpdateWorkflow, useTriggerEventTypes } from '@/hooks/workflows';
import { useEmailTemplates } from '@/features/email/hooks/useEmailTemplates';
import type {
  Workflow,
  WorkflowFormData,
  TriggerType,
  WorkflowCategory,
  WorkflowAction,
} from '@/types/workflow.types';

interface WorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow?: Workflow | null;
}

const ACTION_TYPES = [
  { value: 'send_email', label: 'Email', icon: Mail },
  { value: 'create_notification', label: 'Notify', icon: Bell },
  { value: 'wait', label: 'Wait', icon: Clock },
  { value: 'webhook', label: 'Webhook', icon: Webhook },
] as const;

// Minimal event categories
const EVENT_CATEGORIES = {
  recruit: 'Recruiting',
  policy: 'Policies',
  commission: 'Commissions',
  user: 'Users',
  email: 'Email',
  system: 'System',
} as const;

function ActionRow({
  action,
  index,
  onUpdate,
  onRemove,
  templates,
}: {
  action: WorkflowAction;
  index: number;
  onUpdate: (updates: Partial<WorkflowAction>) => void;
  onRemove: () => void;
  templates: Array<{ id: string; name: string }>;
}) {
  const actionType = ACTION_TYPES.find((t) => t.value === action.type);

  return (
    <div className="flex items-center gap-1 py-0.5 text-[8px]">
      <span className="w-3 text-muted-foreground">{index + 1}.</span>

      <Select
        value={action.type}
        onValueChange={(v) => onUpdate({ type: v as WorkflowAction['type'] })}
      >
        <SelectTrigger className="h-5 text-[8px] w-16">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTION_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value} className="text-[8px]">
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {action.type === 'send_email' && (
        <Select
          value={action.config.templateId || ''}
          onValueChange={(v) => onUpdate({ config: { ...action.config, templateId: v } })}
        >
          <SelectTrigger className="h-5 text-[8px] flex-1">
            <SelectValue placeholder="Template..." />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id} className="text-[8px]">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {action.type === 'wait' && (
        <Input
          type="number"
          value={action.config.waitMinutes || 0}
          onChange={(e) => onUpdate({ config: { ...action.config, waitMinutes: parseInt(e.target.value) || 0 } })}
          className="h-5 text-[8px] w-16"
          placeholder="min"
        />
      )}

      {action.type === 'webhook' && (
        <Input
          value={action.config.webhookUrl || ''}
          onChange={(e) => onUpdate({ config: { ...action.config, webhookUrl: e.target.value } })}
          className="h-5 text-[8px] flex-1"
          placeholder="URL..."
        />
      )}

      {action.type === 'create_notification' && (
        <Input
          value={action.config.title || ''}
          onChange={(e) => onUpdate({ config: { ...action.config, title: e.target.value } })}
          className="h-5 text-[8px] flex-1"
          placeholder="Title..."
        />
      )}

      <Input
        type="number"
        value={action.delayMinutes || 0}
        onChange={(e) => onUpdate({ delayMinutes: parseInt(e.target.value) || 0 })}
        className="h-5 text-[8px] w-12"
        placeholder="0"
        title="Delay (min)"
      />

      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 p-0"
        onClick={onRemove}
      >
        <Trash2 className="h-2 w-2" />
      </Button>
    </div>
  );
}

export default function WorkflowDialog({ open, onOpenChange, workflow }: WorkflowDialogProps) {
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow(workflow?.id || '');
  const { data: triggerEventTypes = [] } = useTriggerEventTypes();
  const { data: emailTemplates = [] } = useEmailTemplates({ isActive: true });

  const [actions, setActions] = useState<WorkflowAction[]>([]);

  // Group events by category
  const groupedEvents = triggerEventTypes.reduce((acc, event) => {
    const category = event.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(event);
    return acc;
  }, {} as Record<string, typeof triggerEventTypes>);

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      category: 'email' as WorkflowCategory,
      triggerType: 'manual' as TriggerType,
      trigger: {
        eventName: '',
        schedule: {
          time: '09:00',
          dayOfWeek: 'monday',
        },
      },
      settings: {
        maxRunsPerDay: 50,
        priority: 50,
      },
    },
    onSubmit: async ({ value }) => {
      const formData: WorkflowFormData = {
        name: value.name,
        description: value.description,
        category: value.category,
        triggerType: value.triggerType,
        trigger: {
          type: value.triggerType,
          eventName: value.trigger.eventName,
          schedule: value.trigger.schedule,
        },
        settings: value.settings,
        actions,
      };

      if (workflow) {
        await updateWorkflow.mutateAsync(formData);
      } else {
        await createWorkflow.mutateAsync(formData);
      }
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      if (workflow) {
        form.reset({
          name: workflow.name,
          description: workflow.description || '',
          category: workflow.category,
          triggerType: workflow.triggerType,
          trigger: {
            eventName: '',
            schedule: { time: '09:00', dayOfWeek: 'monday' },
          },
          settings: {
            maxRunsPerDay: workflow.maxRunsPerDay || 50,
            priority: workflow.priority || 50,
          },
        });
        setActions(workflow.actions || []);
      } else {
        form.reset();
        setActions([]);
      }
    }
  }, [open, workflow?.id]);

  const addAction = () => {
    setActions((prev) => [
      ...prev,
      {
        type: 'send_email',
        order: prev.length,
        config: {},
      },
    ]);
  };

  const updateAction = (index: number, updates: Partial<WorkflowAction>) => {
    setActions((prev) =>
      prev.map((action, i) => (i === index ? { ...action, ...updates } : action))
    );
  };

  const removeAction = (index: number) => {
    setActions((prev) =>
      prev.filter((_, i) => i !== index).map((action, i) => ({ ...action, order: i }))
    );
  };

  const templateOptions = emailTemplates.map((t) => ({ id: t.id, name: t.name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-2">
        <DialogHeader className="pb-0">
          <DialogTitle className="text-[10px]">
            {workflow ? 'Edit' : 'Create'} Workflow
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex-1 overflow-y-auto space-y-0.5"
        >
          {/* Ultra compact basic info */}
          <div className="space-y-0.5">
            <div className="flex gap-1">
              <form.Field name="name">
                {(field) => (
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="h-5 text-[8px] flex-1"
                    placeholder="Workflow name"
                  />
                )}
              </form.Field>
              <form.Field name="category">
                {(field) => (
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v as WorkflowCategory)}
                  >
                    <SelectTrigger className="h-5 text-[8px] w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email" className="text-[8px]">Email</SelectItem>
                      <SelectItem value="recruiting" className="text-[8px]">Recruit</SelectItem>
                      <SelectItem value="commission" className="text-[8px]">Comm</SelectItem>
                      <SelectItem value="general" className="text-[8px]">General</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </form.Field>
            </div>

            <form.Field name="description">
              {(field) => (
                <Textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="h-8 text-[8px] resize-none"
                  placeholder="Description (optional)"
                />
              )}
            </form.Field>
          </div>

          {/* Trigger - completely flat */}
          <div className="space-y-0.5">
            <Label className="text-[8px] text-muted-foreground">Trigger</Label>
            <div className="flex gap-1">
              <form.Field name="triggerType">
                {(field) => (
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v as TriggerType)}
                  >
                    <SelectTrigger className="h-5 text-[8px] w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual" className="text-[8px]">Manual</SelectItem>
                      <SelectItem value="schedule" className="text-[8px]">Schedule</SelectItem>
                      <SelectItem value="event" className="text-[8px]">Event</SelectItem>
                      <SelectItem value="webhook" className="text-[8px]">Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </form.Field>

              {form.state.values.triggerType === 'event' && (
                <form.Field name="trigger.eventName">
                  {(field) => (
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v)}
                    >
                      <SelectTrigger className="h-5 text-[8px] flex-1">
                        <SelectValue placeholder="Select event..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-32">
                        {Object.entries(groupedEvents).map(([category, events]) => (
                          events.map((event) => (
                            <SelectItem key={event.id} value={event.eventName} className="text-[8px]">
                              {event.eventName}
                            </SelectItem>
                          ))
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </form.Field>
              )}

              {form.state.values.triggerType === 'schedule' && (
                <>
                  <form.Field name="trigger.schedule.time">
                    {(field) => (
                      <Input
                        type="time"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="h-5 text-[8px] w-20"
                      />
                    )}
                  </form.Field>
                  <form.Field name="trigger.schedule.dayOfWeek">
                    {(field) => (
                      <Select
                        value={field.state.value}
                        onValueChange={(v) => field.handleChange(v)}
                      >
                        <SelectTrigger className="h-5 text-[8px] w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily" className="text-[8px]">Daily</SelectItem>
                          <SelectItem value="monday" className="text-[8px]">Mon</SelectItem>
                          <SelectItem value="tuesday" className="text-[8px]">Tue</SelectItem>
                          <SelectItem value="wednesday" className="text-[8px]">Wed</SelectItem>
                          <SelectItem value="thursday" className="text-[8px]">Thu</SelectItem>
                          <SelectItem value="friday" className="text-[8px]">Fri</SelectItem>
                          <SelectItem value="saturday" className="text-[8px]">Sat</SelectItem>
                          <SelectItem value="sunday" className="text-[8px]">Sun</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </form.Field>
                </>
              )}
            </div>
          </div>

          {/* Actions - ultra minimal */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <Label className="text-[8px] text-muted-foreground">Actions</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 text-[8px] px-1"
                onClick={addAction}
              >
                + Add
              </Button>
            </div>

            {actions.length === 0 ? (
              <p className="text-[8px] text-muted-foreground py-1">No actions</p>
            ) : (
              <div className="space-y-0">
                {actions.map((action, index) => (
                  <ActionRow
                    key={index}
                    action={action}
                    index={index}
                    onUpdate={(updates) => updateAction(index, updates)}
                    onRemove={() => removeAction(index)}
                    templates={templateOptions}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Settings - inline, no collapsible */}
          <div className="flex gap-1">
            <div className="flex-1">
              <Label className="text-[8px] text-muted-foreground">Max/Day</Label>
              <form.Field name="settings.maxRunsPerDay">
                {(field) => (
                  <Input
                    type="number"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(parseInt(e.target.value) || 50)}
                    className="h-5 text-[8px]"
                    min={1}
                  />
                )}
              </form.Field>
            </div>
            <div className="flex-1">
              <Label className="text-[8px] text-muted-foreground">Priority</Label>
              <form.Field name="settings.priority">
                {(field) => (
                  <Input
                    type="number"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(parseInt(e.target.value) || 50)}
                    className="h-5 text-[8px]"
                    min={1}
                    max={100}
                  />
                )}
              </form.Field>
            </div>
          </div>
        </form>

        <DialogFooter className="pt-1 gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-5 text-[8px] px-2"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-5 text-[8px] px-2"
            onClick={() => form.handleSubmit()}
            disabled={createWorkflow.isPending || updateWorkflow.isPending}
          >
            {workflow ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}