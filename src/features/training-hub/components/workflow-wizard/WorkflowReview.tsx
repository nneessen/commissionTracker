// src/features/training-hub/components/workflow-wizard/WorkflowReview.tsx

import { Edit2, Check, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WorkflowFormData } from '@/types/workflow.types';

interface WorkflowReviewProps {
  data: WorkflowFormData;
  onEdit: (step: number) => void;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  send_email: 'Send Email',
  create_notification: 'Create Notification',
  wait: 'Wait/Delay',
  webhook: 'Webhook',
  update_field: 'Update Field',
  assign_user: 'Assign User',
  create_task: 'Create Task',
  branch: 'Conditional Branch',
  ai_decision: 'AI Decision'
};

export default function WorkflowReview({ data, onEdit }: WorkflowReviewProps) {
  const getSummaryStats = () => {
    const totalDelay = data.actions.reduce((sum, action) => {
      return sum + (action.delayMinutes || 0) + (action.config.waitMinutes as number || 0);
    }, 0);

    const emailActions = data.actions.filter(a => a.type === 'send_email').length;
    const notificationActions = data.actions.filter(a => a.type === 'create_notification').length;
    const webhookActions = data.actions.filter(a => a.type === 'webhook').length;

    return {
      totalActions: data.actions.length,
      totalDelay,
      emailActions,
      notificationActions,
      webhookActions
    };
  };

  const stats = getSummaryStats();

  const formatDelay = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours > 0 ? `${remainingHours}h` : ''}`.trim();
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-1">Review Your Workflow</h3>
        <p className="text-xs text-muted-foreground">
          Review your workflow configuration before creating. Click any section to edit.
        </p>
      </div>

      {/* Basic Information */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium flex items-center gap-1.5">
            <Check className="h-3 w-3 text-green-600" />
            Basic Information
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => onEdit(0)}
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground">Name</p>
              <p className="text-xs font-medium">{data.name || 'Untitled Workflow'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Category</p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {data.category}
              </Badge>
            </div>
          </div>
          {data.description && (
            <div>
              <p className="text-[10px] text-muted-foreground">Description</p>
              <p className="text-xs">{data.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Trigger Configuration */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium flex items-center gap-1.5">
            <Check className="h-3 w-3 text-green-600" />
            Trigger Configuration
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => onEdit(1)}
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {data.triggerType}
            </Badge>
            {data.triggerType === 'schedule' && data.trigger?.schedule && (
              <span className="text-xs text-muted-foreground">
                {data.trigger.schedule.dayOfWeek === 'daily' ? 'Every day' : `Every ${data.trigger.schedule.dayOfWeek}`}
                {' at '}{data.trigger.schedule.time}
              </span>
            )}
            {data.triggerType === 'event' && data.trigger?.eventName && (
              <span className="text-xs text-muted-foreground">
                On event: {data.trigger.eventName}
              </span>
            )}
            {data.triggerType === 'manual' && (
              <span className="text-xs text-muted-foreground">
                Manually triggered from UI
              </span>
            )}
            {data.triggerType === 'webhook' && (
              <span className="text-xs text-muted-foreground">
                Via webhook URL (generated after creation)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions Configuration */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium flex items-center gap-1.5">
            {data.actions.length === 0 ? (
              <AlertCircle className="h-3 w-3 text-yellow-600" />
            ) : (
              <Check className="h-3 w-3 text-green-600" />
            )}
            Actions ({data.actions.length})
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => onEdit(2)}
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>

        {data.actions.length === 0 ? (
          <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex gap-2">
              <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                No actions configured. Add at least one action to make this workflow functional.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {data.actions.map((action, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-1.5 rounded bg-muted/30"
              >
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  {index + 1}
                </Badge>
                <span className="text-xs font-medium">
                  {ACTION_TYPE_LABELS[action.type] || action.type}
                </span>
                {action.delayMinutes && action.delayMinutes > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">
                    +{formatDelay(action.delayMinutes)} delay
                  </Badge>
                )}
                {action.type === 'send_email' && action.config.templateId && (
                  <span className="text-[10px] text-muted-foreground">
                    (Template configured)
                  </span>
                )}
                {action.type === 'wait' && action.config.waitMinutes && (
                  <span className="text-[10px] text-muted-foreground">
                    ({formatDelay(action.config.waitMinutes as number)})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workflow Settings */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium flex items-center gap-1.5">
            <Check className="h-3 w-3 text-green-600" />
            Settings
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => onEdit(0)}
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Max runs per day</p>
            <p className="text-xs font-medium">{data.settings?.maxRunsPerDay || 50}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Priority</p>
            <p className="text-xs font-medium">{data.settings?.priority || 50}/100</p>
          </div>
          {data.settings?.maxRunsPerRecipient && (
            <div>
              <p className="text-[10px] text-muted-foreground">Max runs per recipient</p>
              <p className="text-xs font-medium">{data.settings.maxRunsPerRecipient}</p>
            </div>
          )}
          {data.settings?.cooldownMinutes && (
            <div>
              <p className="text-[10px] text-muted-foreground">Cooldown period</p>
              <p className="text-xs font-medium">{formatDelay(data.settings.cooldownMinutes)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <h4 className="text-xs font-medium mb-2">Workflow Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Total Actions</p>
            <p className="text-sm font-semibold">{stats.totalActions}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Total Time</p>
            <p className="text-sm font-semibold">
              {stats.totalDelay === 0 ? 'Instant' : `~${formatDelay(stats.totalDelay)}`}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Emails</p>
            <p className="text-sm font-semibold">{stats.emailActions}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Notifications</p>
            <p className="text-sm font-semibold">{stats.notificationActions}</p>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {data.actions.length === 0 && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <div className="flex gap-2">
            <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-red-900 dark:text-red-100">
                Workflow Incomplete
              </p>
              <p className="text-[10px] text-red-800 dark:text-red-200">
                Please add at least one action before creating the workflow.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
        <div className="flex gap-2">
          <Info className="h-3 w-3 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
              Before You Create:
            </p>
            <ul className="text-[10px] text-blue-800 dark:text-blue-200 space-y-0.5 list-disc list-inside">
              <li>Review all action configurations for completeness</li>
              <li>Check that delays and timing make sense for your use case</li>
              <li>Verify email templates are selected where needed</li>
              <li>Consider testing with a single recipient first</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}