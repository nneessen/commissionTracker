// src/features/training-hub/components/WorkflowDialog.tsx

import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import {
  Plus,
  Trash2,
  GripVertical,
  Mail,
  Bell,
  Clock,
  Zap,
  Calendar,
  Webhook,
  Play,
  ChevronDown,
  ChevronUp,
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  { value: 'send_email', label: 'Send Email', icon: Mail, description: 'Send an email using a template' },
  { value: 'create_notification', label: 'Create Notification', icon: Bell, description: 'Create an in-app notification' },
  { value: 'wait', label: 'Wait/Delay', icon: Clock, description: 'Wait before next action' },
  { value: 'webhook', label: 'Webhook', icon: Webhook, description: 'Call an external URL' },
] as const;

const TRIGGER_TYPE_INFO = {
  manual: { icon: Play, description: 'Run manually from the UI' },
  schedule: { icon: Calendar, description: 'Run on a schedule (daily, weekly, etc.)' },
  event: { icon: Zap, description: 'Run when a specific event occurs' },
  webhook: { icon: Webhook, description: 'Run when called via webhook URL' },
};

function ActionCard({
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
  const [expanded, setExpanded] = useState(true);
  const actionType = ACTION_TYPES.find((t) => t.value === action.type);
  const Icon = actionType?.icon || Zap;

  return (
    <div className="rounded-md border bg-muted/30">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="flex items-center gap-2 p-2">
          <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
          <Badge variant="outline" className="text-[9px] h-4 px-1">
            {index + 1}
          </Badge>
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium flex-1">{actionType?.label || action.type}</span>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="border-t px-2 py-2 space-y-2">
            {/* Action Type Selector */}
            <div>
              <Label className="text-[10px]">Action Type</Label>
              <Select
                value={action.type}
                onValueChange={(v) => onUpdate({ type: v as WorkflowAction['type'] })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <type.icon className="h-3 w-3" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email Template Selector */}
            {action.type === 'send_email' && (
              <div>
                <Label className="text-[10px]">Email Template</Label>
                <Select
                  value={action.config.templateId || ''}
                  onValueChange={(v) => onUpdate({ config: { ...action.config, templateId: v } })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground">No templates available</div>
                    ) : (
                      templates.map((template) => (
                        <SelectItem key={template.id} value={template.id} className="text-xs">
                          {template.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notification Config */}
            {action.type === 'create_notification' && (
              <>
                <div>
                  <Label className="text-[10px]">Notification Title</Label>
                  <Input
                    value={action.config.title || ''}
                    onChange={(e) => onUpdate({ config: { ...action.config, title: e.target.value } })}
                    className="h-7 text-xs"
                    placeholder="e.g., Task Complete"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Message</Label>
                  <Textarea
                    value={action.config.message || ''}
                    onChange={(e) => onUpdate({ config: { ...action.config, message: e.target.value } })}
                    className="h-14 text-xs resize-none"
                    placeholder="Notification message..."
                  />
                </div>
              </>
            )}

            {/* Wait/Delay Config */}
            {action.type === 'wait' && (
              <div>
                <Label className="text-[10px]">Wait Duration (minutes)</Label>
                <Input
                  type="number"
                  value={action.config.waitMinutes || 0}
                  onChange={(e) => onUpdate({ config: { ...action.config, waitMinutes: parseInt(e.target.value) || 0 } })}
                  className="h-7 text-xs"
                  min={0}
                  placeholder="0"
                />
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {(action.config.waitMinutes || 0) >= 60
                    ? `= ${Math.floor((action.config.waitMinutes || 0) / 60)}h ${(action.config.waitMinutes || 0) % 60}m`
                    : ''}
                </p>
              </div>
            )}

            {/* Webhook Config */}
            {action.type === 'webhook' && (
              <>
                <div>
                  <Label className="text-[10px]">Webhook URL</Label>
                  <Input
                    value={action.config.webhookUrl || ''}
                    onChange={(e) => onUpdate({ config: { ...action.config, webhookUrl: e.target.value } })}
                    className="h-7 text-xs"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label className="text-[10px]">HTTP Method</Label>
                  <Select
                    value={action.config.webhookMethod || 'POST'}
                    onValueChange={(v) => onUpdate({ config: { ...action.config, webhookMethod: v } })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET" className="text-xs">GET</SelectItem>
                      <SelectItem value="POST" className="text-xs">POST</SelectItem>
                      <SelectItem value="PUT" className="text-xs">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Delay Before Action */}
            <div>
              <Label className="text-[10px]">Delay Before Action (minutes)</Label>
              <Input
                type="number"
                value={action.delayMinutes || 0}
                onChange={(e) => onUpdate({ delayMinutes: parseInt(e.target.value) || 0 })}
                className="h-7 text-xs"
                min={0}
                placeholder="0 = immediate"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function WorkflowDialog({ open, onOpenChange, workflow }: WorkflowDialogProps) {
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow(workflow?.id || '');
  const { data: triggerEventTypes = [] } = useTriggerEventTypes();
  const { data: emailTemplates = [] } = useEmailTemplates({ isActive: true });

  const [actions, setActions] = useState<WorkflowAction[]>([]);

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

  // Initialize form when dialog opens
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
  const triggerInfo = TRIGGER_TYPE_INFO[form.state.values.triggerType];
  const TriggerIcon = triggerInfo?.icon || Play;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {workflow ? 'Edit Workflow' : 'Create Workflow'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex-1 overflow-y-auto space-y-3 pr-1"
        >
          {/* Basic Info */}
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Name</Label>
              <form.Field name="name">
                {(field) => (
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="e.g., Welcome Email Sequence"
                  />
                )}
              </form.Field>
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <form.Field name="description">
                {(field) => (
                  <Textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="h-14 text-sm resize-none"
                    placeholder="Brief description..."
                  />
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Category</Label>
                <form.Field name="category">
                  {(field) => (
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v as WorkflowCategory)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="recruiting">Recruiting</SelectItem>
                        <SelectItem value="commission">Commission</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </form.Field>
              </div>

              <div>
                <Label className="text-xs">Trigger Type</Label>
                <form.Field name="triggerType">
                  {(field) => (
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v as TriggerType)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="schedule">Schedule</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="webhook">Webhook</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </form.Field>
              </div>
            </div>

            {/* Trigger Configuration */}
            <div className="rounded-md border bg-muted/30 p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <TriggerIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                  Trigger Configuration
                </span>
              </div>

              {form.state.values.triggerType === 'event' && (
                <div>
                  <Label className="text-[10px]">Event Type</Label>
                  <form.Field name="trigger.eventName">
                    {(field) => (
                      <Select
                        value={field.state.value}
                        onValueChange={(v) => field.handleChange(v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select event..." />
                        </SelectTrigger>
                        <SelectContent>
                          {triggerEventTypes.map((event) => (
                            <SelectItem key={event.id} value={event.eventName} className="text-xs">
                              <div>
                                <span>{event.eventName}</span>
                                {event.description && (
                                  <span className="text-muted-foreground ml-1">
                                    - {event.description}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </form.Field>
                </div>
              )}

              {form.state.values.triggerType === 'schedule' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Time</Label>
                    <form.Field name="trigger.schedule.time">
                      {(field) => (
                        <Input
                          type="time"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="h-7 text-xs"
                        />
                      )}
                    </form.Field>
                  </div>
                  <div>
                    <Label className="text-[10px]">Day</Label>
                    <form.Field name="trigger.schedule.dayOfWeek">
                      {(field) => (
                        <Select
                          value={field.state.value}
                          onValueChange={(v) => field.handleChange(v)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                            <SelectItem value="monday" className="text-xs">Monday</SelectItem>
                            <SelectItem value="tuesday" className="text-xs">Tuesday</SelectItem>
                            <SelectItem value="wednesday" className="text-xs">Wednesday</SelectItem>
                            <SelectItem value="thursday" className="text-xs">Thursday</SelectItem>
                            <SelectItem value="friday" className="text-xs">Friday</SelectItem>
                            <SelectItem value="saturday" className="text-xs">Saturday</SelectItem>
                            <SelectItem value="sunday" className="text-xs">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </form.Field>
                  </div>
                </div>
              )}

              {form.state.values.triggerType === 'manual' && (
                <p className="text-[10px] text-muted-foreground">
                  This workflow will only run when manually triggered from the UI.
                </p>
              )}

              {form.state.values.triggerType === 'webhook' && (
                <p className="text-[10px] text-muted-foreground">
                  A webhook URL will be generated after the workflow is created.
                </p>
              )}
            </div>
          </div>

          {/* Actions Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Actions ({actions.length})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={addAction}
              >
                <Plus className="h-3 w-3" />
                Add Action
              </Button>
            </div>

            {actions.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">No actions configured</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={addAction}
                >
                  Add your first action
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map((action, index) => (
                  <ActionCard
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

          {/* Settings */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 w-full justify-start">
                <ChevronDown className="h-3 w-3" />
                Advanced Settings
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <Label className="text-[10px]">Max Runs Per Day</Label>
                  <form.Field name="settings.maxRunsPerDay">
                    {(field) => (
                      <Input
                        type="number"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(parseInt(e.target.value) || 50)}
                        className="h-7 text-xs"
                        min={1}
                      />
                    )}
                  </form.Field>
                </div>
                <div>
                  <Label className="text-[10px]">Priority (1-100)</Label>
                  <form.Field name="settings.priority">
                    {(field) => (
                      <Input
                        type="number"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(parseInt(e.target.value) || 50)}
                        className="h-7 text-xs"
                        min={1}
                        max={100}
                      />
                    )}
                  </form.Field>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </form>

        <DialogFooter className="pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
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
