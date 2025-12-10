// File: /home/nneessen/projects/commissionTracker/src/features/training-hub/components/WorkflowDialog.tsx

import React, { useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
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
import { useCreateWorkflow, useUpdateWorkflow } from '@/hooks/workflows';
import type { Workflow, WorkflowFormData, TriggerType, WorkflowCategory, WorkflowAction } from '@/types/workflow.types';

interface WorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow?: Workflow | null;
}

export default function WorkflowDialog({ open, onOpenChange, workflow }: WorkflowDialogProps) {
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow(workflow?.id || '');

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      category: 'email' as WorkflowCategory,
      triggerType: 'manual' as TriggerType,
      actions: [{
        type: 'send_email',
        order: 0,
        config: { templateId: 'welcome' }
      }] as WorkflowAction[],
      settings: {
        maxRunsPerDay: 50,
        priority: 50
      }
    } as WorkflowFormData,
    onSubmit: async ({ value }) => {
      if (workflow) {
        await updateWorkflow.mutateAsync(value);
      } else {
        await createWorkflow.mutateAsync(value);
      }
      onOpenChange(false);
      form.reset();
    }
  });

  useEffect(() => {
    if (open && workflow) {
      form.reset({
        name: workflow.name,
        description: workflow.description,
        category: workflow.category,
        triggerType: workflow.triggerType,
        actions: workflow.actions || [{
          type: 'send_email',
          order: 0,
          config: { templateId: 'welcome' }
        }],
        settings: {
          maxRunsPerDay: workflow.maxRunsPerDay || 50,
          priority: workflow.priority || 50
        }
      });
    }
  }, [open, workflow]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
          className="space-y-3"
        >
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
                  className="h-16 text-sm resize-none"
                  placeholder="Brief description..."
                />
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <Label className="text-xs">Trigger</Label>
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {workflow ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}