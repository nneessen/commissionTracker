// src/features/training-hub/components/workflow-wizard/WorkflowActionsBuilder.tsx

import { useState } from 'react';
import {
  Plus,
  Mail,
  Bell,
  Clock,
  Webhook,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { WorkflowAction } from '@/types/workflow.types';
import { useEmailTemplates } from '@/features/email/hooks/useEmailTemplates';

interface WorkflowActionsBuilderProps {
  actions: WorkflowAction[];
  onChange: (actions: WorkflowAction[]) => void;
  errors: Record<string, string>;
}

const ACTION_TYPES = [
  { type: 'send_email', label: 'Send Email', icon: Mail, color: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' },
  { type: 'create_notification', label: 'Notification', icon: Bell, color: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' },
  { type: 'wait', label: 'Wait/Delay', icon: Clock, color: 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400' },
  { type: 'webhook', label: 'Webhook', icon: Webhook, color: 'bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400' }
] as const;

export default function WorkflowActionsBuilder({ actions, onChange, errors }: WorkflowActionsBuilderProps) {
  const { data: emailTemplates = [] } = useEmailTemplates({ isActive: true });
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const addAction = () => {
    const newAction: WorkflowAction = {
      type: 'send_email',
      order: actions.length,
      config: {},
      delayMinutes: 0
    };
    onChange([...actions, newAction]);
  };

  const updateAction = (index: number, updates: Partial<WorkflowAction>) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const deleteAction = (index: number) => {
    const filtered = actions.filter((_, i) => i !== index);
    const reordered = filtered.map((action, i) => ({ ...action, order: i }));
    onChange(reordered);
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= actions.length) return;

    const items = [...actions];
    const [movedItem] = items.splice(index, 1);
    items.splice(newIndex, 0, movedItem);

    const reordered = items.map((item, i) => ({ ...item, order: i }));
    onChange(reordered);
  };

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="p-2 rounded-md bg-muted/50">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">
            Workflow Actions ({actions.length})
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={addAction}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Action
          </Button>
        </div>
      </div>

      {/* Actions List */}
      {actions.length === 0 ? (
        <div className="p-4 rounded-md bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground mb-2">No actions configured yet</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={addAction}
          >
            Add Your First Action
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((action, index) => {
            const actionType = ACTION_TYPES.find(t => t.type === action.type);
            const Icon = actionType?.icon || Mail;
            const errorKey = `action_${index}`;
            const hasError = !!errors[errorKey];

            return (
              <div
                key={index}
                className={cn(
                  "p-2 rounded-md border",
                  actionType?.color || 'bg-muted/30',
                  hasError && "border-destructive"
                )}
              >
                {/* Action Header */}
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Step {index + 1}
                  </span>
                  <Select
                    value={action.type}
                    onValueChange={(v) => updateAction(index, { type: v as WorkflowAction['type'], config: {} })}
                  >
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((type) => (
                        <SelectItem key={type.type} value={type.type} className="text-xs">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveAction(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveAction(index, 'down')}
                      disabled={index === actions.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => deleteAction(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Action Configuration */}
                <div className="space-y-2 pl-6">
                  {action.type === 'send_email' && (
                    <>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-[10px] text-muted-foreground">Email Template</Label>
                          <div className="flex gap-1">
                            <Select
                              value={action.config.templateId || ''}
                              onValueChange={(v) => updateAction(index, {
                                config: { ...action.config, templateId: v }
                              })}
                            >
                              <SelectTrigger className="h-7 text-xs bg-background border-blue-500/30 focus:border-blue-500">
                                <SelectValue placeholder="Select template..." />
                              </SelectTrigger>
                              <SelectContent>
                                {emailTemplates.map((t) => (
                                  <SelectItem key={t.id} value={t.id} className="text-xs">
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {action.config.templateId && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 border-blue-500/30 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                                onClick={() => setPreviewTemplate(action.config.templateId || null)}
                              >
                                <Eye className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="w-32">
                          <Label className="text-[10px] text-muted-foreground">Send To</Label>
                          <Select
                            value={action.config.recipientType || 'trigger_user'}
                            onValueChange={(v) => updateAction(index, {
                              config: { ...action.config, recipientType: v }
                            })}
                          >
                            <SelectTrigger className="h-7 text-xs bg-background border-blue-500/30 focus:border-blue-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="trigger_user" className="text-xs">Trigger User</SelectItem>
                              <SelectItem value="specific_email" className="text-xs">Specific Email</SelectItem>
                              <SelectItem value="all_agents" className="text-xs">All Agents</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {action.config.recipientType === 'specific_email' && (
                        <Input
                          type="email"
                          value={action.config.recipientEmail || ''}
                          onChange={(e) => updateAction(index, {
                            config: { ...action.config, recipientEmail: e.target.value }
                          })}
                          placeholder="email@example.com"
                          className="h-7 text-xs bg-background border-blue-500/30 focus:border-blue-500"
                        />
                      )}
                    </>
                  )}

                  {action.type === 'wait' && (
                    <div className="flex items-center gap-2">
                      <div className="w-24">
                        <Label className="text-[10px] text-gray-600 dark:text-gray-400">Wait Duration</Label>
                        <Input
                          type="number"
                          value={action.config.waitMinutes || 0}
                          onChange={(e) => updateAction(index, {
                            config: { ...action.config, waitMinutes: parseInt(e.target.value) || 0 }
                          })}
                          className="h-7 text-xs bg-background border-gray-500/30 focus:border-gray-500"
                          placeholder="0"
                          min={0}
                        />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 mt-4">minutes</span>
                    </div>
                  )}

                  {action.type === 'webhook' && (
                    <div>
                      <Label className="text-[10px] text-violet-600 dark:text-violet-400">Webhook URL</Label>
                      <Input
                        value={action.config.webhookUrl || ''}
                        onChange={(e) => updateAction(index, {
                          config: { ...action.config, webhookUrl: e.target.value }
                        })}
                        className="h-7 text-xs bg-background border-violet-500/30 focus:border-violet-500"
                        placeholder="https://api.example.com/webhook"
                      />
                    </div>
                  )}

                  {action.type === 'create_notification' && (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[10px] text-amber-600 dark:text-amber-400">Notification Title</Label>
                        <Input
                          value={action.config.title || ''}
                          onChange={(e) => updateAction(index, {
                            config: { ...action.config, title: e.target.value }
                          })}
                          className="h-7 text-xs bg-background border-amber-500/30 focus:border-amber-500"
                          placeholder="Notification title..."
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-amber-600 dark:text-amber-400">Message</Label>
                        <Input
                          value={action.config.message || ''}
                          onChange={(e) => updateAction(index, {
                            config: { ...action.config, message: e.target.value }
                          })}
                          className="h-7 text-xs bg-background border-amber-500/30 focus:border-amber-500"
                          placeholder="Notification message..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Delay Before Next Action */}
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Label className="text-[10px] text-muted-foreground">Delay before next action:</Label>
                    <Input
                      type="number"
                      value={action.delayMinutes || 0}
                      onChange={(e) => updateAction(index, { delayMinutes: parseInt(e.target.value) || 0 })}
                      className="h-6 text-xs w-16 bg-background"
                      placeholder="0"
                      min={0}
                    />
                    <span className="text-xs text-muted-foreground">minutes</span>
                  </div>
                </div>

                {/* Error Display */}
                {hasError && (
                  <p className="text-xs text-destructive mt-2 pl-6">{errors[errorKey]}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Error message */}
      {errors.actions && (
        <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-destructive">{errors.actions}</p>
        </div>
      )}

      {/* Email Template Preview Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Email Template Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const template = emailTemplates.find(t => t.id === previewTemplate);
              if (!template) return <p className="text-sm text-muted-foreground">Template not found</p>;

              return (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300">Template Name</Label>
                        <p className="text-sm text-blue-900 dark:text-blue-100">{template.name}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300">Subject</Label>
                        <p className="text-sm text-blue-900 dark:text-blue-100">{template.subject}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Preview</Label>
                    <div className="p-4 rounded-lg border bg-white dark:bg-gray-950">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: template.body_html.replace(/{{(.*?)}}/g, '<span class="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded text-xs font-mono">{{$1}}</span>')
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {template.variables && template.variables.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <Label className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2 block">Dynamic Variables</Label>
                      <div className="flex flex-wrap gap-2">
                        {template.variables.map((v: string, i: number) => (
                          <code key={i} className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded">
                            {`{{${v}}}`}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}