// File: /home/nneessen/projects/commissionTracker/src/types/workflow.types.ts

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type WorkflowCategory = 'email' | 'recruiting' | 'commission' | 'general';
export type TriggerType = 'manual' | 'schedule' | 'event' | 'webhook';
export type WorkflowRunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  combineWith?: 'AND' | 'OR';
}

export interface WorkflowAction {
  id?: string;
  type: 'send_email' | 'create_notification' | 'update_field' | 'create_task' | 'webhook' | 'wait' | 'branch' | 'assign_user' | 'ai_decision';
  order: number;
  config: {
    // Email action
    templateId?: string;
    recipientId?: string;
    recipientType?: string;
    recipientEmail?: string;
    variables?: Record<string, unknown>;

    // Update field action
    entityType?: string;
    fieldName?: string;
    fieldValue?: unknown;

    // Webhook action
    webhookUrl?: string;
    webhookMethod?: string;
    webhookHeaders?: Record<string, string> | string;
    webhookBody?: Record<string, unknown> | string;

    // Wait action
    waitMinutes?: number;

    // Branch action
    branchConditions?: WorkflowCondition[];
    conditions?: WorkflowCondition[];
    conditionType?: string;
    conditionField?: string;
    conditionValue?: string;
    elseBranch?: string;

    // Notification config
    title?: string;
    message?: string;
    notificationType?: string;

    // Assign user action
    userId?: string;
    assignEntityType?: string;
    assignmentNote?: string;

    // Create task action
    taskTitle?: string;
    taskDescription?: string;
    taskPriority?: string;
    taskDueDays?: number;
    description?: string;
    dueDate?: string;

    // AI decision action
    prompt?: string;
    aiPrompt?: string;
    aiContext?: string[];
    aiOptions?: string;
  };
  conditions?: WorkflowCondition[];
  delayMinutes?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface WorkflowTrigger {
  id?: string;
  type: TriggerType;
  eventName?: string; // For event triggers
  schedule?: {
    cronExpression?: string;
    timezone?: string;
    time?: string;
    dayOfWeek?: string;
    dayOfMonth?: number;
  };
  webhookConfig?: {
    endpoint?: string;
    secret?: string;
  };
  conditions?: WorkflowCondition[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  category: WorkflowCategory;
  status: WorkflowStatus;
  triggerType: TriggerType;

  // Configuration
  config: Record<string, any>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];

  // Execution settings
  maxRunsPerDay?: number;
  maxRunsPerRecipient?: number;
  cooldownMinutes?: number;
  priority?: number;

  // Metadata
  createdBy?: string;
  lastModifiedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflow?: Workflow;
  triggerSource?: string;
  status: WorkflowRunStatus;

  // Execution details
  startedAt: string;
  completedAt?: string;
  durationMs?: number;

  // Context and results
  context: Record<string, any>;
  actionsExecuted: Array<{
    actionId: string;
    status: 'success' | 'failed' | 'skipped';
    result?: any;
    error?: string;
  }>;
  errorMessage?: string;
  errorDetails?: Record<string, any>;

  // Performance metrics
  emailsSent?: number;
  actionsCompleted?: number;
  actionsFailed?: number;

  createdAt?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: WorkflowCategory;
  icon?: string;

  // Template definition
  workflowConfig: Partial<Workflow>;

  // Visibility
  isPublic?: boolean;
  isFeatured?: boolean;
  createdBy?: string;

  // Usage tracking
  usageCount?: number;
  rating?: number;

  createdAt?: string;
  updatedAt?: string;
}

export interface TriggerEventType {
  id: string;
  eventName: string;
  category: string;
  description?: string;
  availableVariables?: Record<string, string>;
  isActive?: boolean;
  createdAt?: string;
}

// Helper types for UI components
export interface WorkflowFormData {
  name: string;
  description?: string;
  category: WorkflowCategory;
  triggerType: TriggerType;
  trigger: WorkflowTrigger;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  settings: {
    maxRunsPerDay?: number;
    maxRunsPerRecipient?: number;
    cooldownMinutes?: number;
    continueOnError?: boolean;
    priority?: number;
  };
  status?: WorkflowStatus;
}

export interface WorkflowStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDuration: number;
  lastRunAt?: string;
  nextScheduledAt?: string;
}