// src/features/training-hub/components/workflow-wizard/ActionConfigPanel.tsx

import { useState } from 'react';
import { X, Info, Clock, Variable, TestTube, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { WorkflowAction } from '@/types/workflow.types';
import { useEmailTemplates } from '@/features/email/hooks/useEmailTemplates';
import { useAuth } from '@/contexts/AuthContext';

interface ActionConfigPanelProps {
  action: WorkflowAction;
  onUpdate: (updates: Partial<WorkflowAction>) => void;
  onClose: () => void;
}

const VARIABLE_LIST = [
  { category: 'Recruit', variables: ['{{recruit.name}}', '{{recruit.email}}', '{{recruit.phone}}', '{{recruit.status}}'] },
  { category: 'User', variables: ['{{user.name}}', '{{user.email}}', '{{user.role}}'] },
  { category: 'Date', variables: ['{{date.today}}', '{{date.tomorrow}}', '{{date.next_week}}'] },
  { category: 'System', variables: ['{{workflow.name}}', '{{workflow.run_id}}', '{{app.url}}'] }
];

export default function ActionConfigPanel({ action, onUpdate, onClose }: ActionConfigPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const { data: emailTemplates = [] } = useEmailTemplates({ isActive: true });
  const { user } = useAuth();

  const insertVariable = (variable: string, field: 'title' | 'message' | 'webhookUrl' | 'fieldValue') => {
    const currentValue = action.config[field] as string || '';
    onUpdate({
      config: {
        ...action.config,
        [field]: currentValue + ' ' + variable
      }
    });
  };

  const renderConfigFields = () => {
    switch (action.type) {
      case 'send_email':
        return (
          <>
            <div>
              <Label className="text-[10px] font-medium">Email Template</Label>
              <Select
                value={action.config.templateId as string || ''}
                onValueChange={(value) => onUpdate({
                  config: { ...action.config, templateId: value }
                })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">
                      No templates available
                    </div>
                  ) : (
                    emailTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id} className="text-xs">
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {template.subject}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-medium">Recipient</Label>
              <Select
                value={action.config.recipientType as string || 'context'}
                onValueChange={(value) => onUpdate({
                  config: { ...action.config, recipientType: value }
                })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="context" className="text-xs">From Workflow Context</SelectItem>
                  <SelectItem value="specific" className="text-xs">Specific Email</SelectItem>
                  <SelectItem value="role" className="text-xs">By Role</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {action.config.recipientType === 'specific' && (
              <div>
                <Label className="text-[10px] font-medium">Email Address</Label>
                <Input
                  value={action.config.recipientEmail as string || ''}
                  onChange={(e) => onUpdate({
                    config: { ...action.config, recipientEmail: e.target.value }
                  })}
                  placeholder="email@example.com"
                  className="h-7 text-xs"
                />
              </div>
            )}
          </>
        );

      case 'create_notification':
        return (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px] font-medium">Notification Title</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => {/* TODO: Open variable picker */}}
                      >
                        <Variable className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Insert variable</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                value={action.config.title as string || ''}
                onChange={(e) => onUpdate({
                  config: { ...action.config, title: e.target.value }
                })}
                placeholder="e.g., Task Completed"
                className="h-7 text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px] font-medium">Message</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => {/* TODO: Open variable picker */}}
                      >
                        <Variable className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Insert variable</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                value={action.config.message as string || ''}
                onChange={(e) => onUpdate({
                  config: { ...action.config, message: e.target.value }
                })}
                placeholder="Notification message..."
                className="h-14 text-xs resize-none"
              />
            </div>

            <div>
              <Label className="text-[10px] font-medium">Type</Label>
              <Select
                value={action.config.notificationType as string || 'info'}
                onValueChange={(value) => onUpdate({
                  config: { ...action.config, notificationType: value }
                })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info" className="text-xs">ℹ️ Info</SelectItem>
                  <SelectItem value="success" className="text-xs">✅ Success</SelectItem>
                  <SelectItem value="warning" className="text-xs">⚠️ Warning</SelectItem>
                  <SelectItem value="error" className="text-xs">❌ Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'wait':
        return (
          <>
            <div>
              <Label className="text-[10px] font-medium">Wait Duration</Label>
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <Input
                    type="number"
                    value={Math.floor((action.config.waitMinutes as number || 0) / 1440)}
                    onChange={(e) => {
                      const days = parseInt(e.target.value) || 0;
                      const hours = Math.floor(((action.config.waitMinutes as number || 0) % 1440) / 60);
                      const mins = (action.config.waitMinutes as number || 0) % 60;
                      onUpdate({
                        config: { ...action.config, waitMinutes: days * 1440 + hours * 60 + mins }
                      });
                    }}
                    className="h-7 text-xs"
                    min={0}
                  />
                  <span className="text-[9px] text-muted-foreground">days</span>
                </div>
                <div>
                  <Input
                    type="number"
                    value={Math.floor(((action.config.waitMinutes as number || 0) % 1440) / 60)}
                    onChange={(e) => {
                      const days = Math.floor((action.config.waitMinutes as number || 0) / 1440);
                      const hours = parseInt(e.target.value) || 0;
                      const mins = (action.config.waitMinutes as number || 0) % 60;
                      onUpdate({
                        config: { ...action.config, waitMinutes: days * 1440 + hours * 60 + mins }
                      });
                    }}
                    className="h-7 text-xs"
                    min={0}
                    max={23}
                  />
                  <span className="text-[9px] text-muted-foreground">hours</span>
                </div>
                <div>
                  <Input
                    type="number"
                    value={(action.config.waitMinutes as number || 0) % 60}
                    onChange={(e) => {
                      const days = Math.floor((action.config.waitMinutes as number || 0) / 1440);
                      const hours = Math.floor(((action.config.waitMinutes as number || 0) % 1440) / 60);
                      const mins = parseInt(e.target.value) || 0;
                      onUpdate({
                        config: { ...action.config, waitMinutes: days * 1440 + hours * 60 + mins }
                      });
                    }}
                    className="h-7 text-xs"
                    min={0}
                    max={59}
                  />
                  <span className="text-[9px] text-muted-foreground">mins</span>
                </div>
              </div>

              <div className="mt-2 p-2 rounded-md bg-muted/30 border border-border/50">
                <p className="text-[10px] text-muted-foreground">
                  Total wait: {action.config.waitMinutes || 0} minutes
                  {(action.config.waitMinutes as number || 0) > 60 && (
                    <span> ({Math.floor((action.config.waitMinutes as number) / 60)}h {(action.config.waitMinutes as number) % 60}m)</span>
                  )}
                </p>
              </div>
            </div>
          </>
        );

      case 'webhook':
        return (
          <>
            <div>
              <Label className="text-[10px] font-medium">Webhook URL</Label>
              <Input
                value={action.config.webhookUrl as string || ''}
                onChange={(e) => onUpdate({
                  config: { ...action.config, webhookUrl: e.target.value }
                })}
                placeholder="https://api.example.com/webhook"
                className="h-7 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-[10px] font-medium">HTTP Method</Label>
              <Select
                value={action.config.webhookMethod as string || 'POST'}
                onValueChange={(value) => onUpdate({
                  config: { ...action.config, webhookMethod: value }
                })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET" className="text-xs">GET</SelectItem>
                  <SelectItem value="POST" className="text-xs">POST</SelectItem>
                  <SelectItem value="PUT" className="text-xs">PUT</SelectItem>
                  <SelectItem value="PATCH" className="text-xs">PATCH</SelectItem>
                  <SelectItem value="DELETE" className="text-xs">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-medium">Headers (JSON)</Label>
              <Textarea
                value={typeof action.config.webhookHeaders === 'string'
                  ? action.config.webhookHeaders
                  : JSON.stringify(action.config.webhookHeaders || {})}
                onChange={(e) => onUpdate({
                  config: { ...action.config, webhookHeaders: e.target.value }
                })}
                placeholder='{"Authorization": "Bearer token"}'
                className="h-14 text-xs font-mono resize-none"
              />
            </div>
          </>
        );

      default:
        return (
          <div className="p-3 rounded-md bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">
              Configuration for {action.type} is not yet implemented.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="w-80 border-l bg-card p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium">Configure Action</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Action Type Badge */}
      <Badge variant="outline" className="text-[10px] px-2 py-0.5 mb-3">
        {action.type.replace('_', ' ').toUpperCase()}
      </Badge>

      {/* Configuration Fields */}
      <div className="space-y-3">
        {renderConfigFields()}

        {/* Delay Before Action */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-[10px] font-medium">Delay Before Action</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="text-xs">
                    Add a delay before this action executes. Useful for spacing out emails or waiting for external processes.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={action.delayMinutes || 0}
              onChange={(e) => onUpdate({ delayMinutes: parseInt(e.target.value) || 0 })}
              className="h-7 text-xs w-20"
              min={0}
            />
            <span className="text-xs text-muted-foreground">minutes</span>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="pt-3 border-t">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-[10px] font-medium">Advanced Settings</span>
            {showAdvanced ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium">Retry on Failure</Label>
                <Switch
                  checked={action.retryOnFailure ?? true}
                  onCheckedChange={(checked) => onUpdate({ retryOnFailure: checked })}
                />
              </div>

              {action.retryOnFailure && (
                <div>
                  <Label className="text-[10px] font-medium">Max Retries</Label>
                  <Input
                    type="number"
                    value={action.maxRetries || 3}
                    onChange={(e) => onUpdate({ maxRetries: parseInt(e.target.value) || 3 })}
                    className="h-7 text-xs"
                    min={1}
                    max={10}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Action */}
        <div className="pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => setTestMode(true)}
          >
            <TestTube className="h-3 w-3 mr-1" />
            Test This Action
          </Button>
        </div>
      </div>

      {/* Variable Helper */}
      <div className="mt-4 p-2 rounded-md bg-muted/30 border border-border/50">
        <p className="text-[9px] font-medium text-muted-foreground mb-1">Available Variables</p>
        <div className="space-y-1">
          {VARIABLE_LIST.slice(0, 2).map((category) => (
            <div key={category.category}>
              <p className="text-[9px] text-muted-foreground">{category.category}:</p>
              <div className="flex flex-wrap gap-1">
                {category.variables.slice(0, 2).map((variable) => (
                  <Badge
                    key={variable}
                    variant="secondary"
                    className="text-[9px] px-1 py-0 font-mono cursor-copy"
                    onClick={() => {
                      navigator.clipboard.writeText(variable);
                    }}
                  >
                    {variable}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}