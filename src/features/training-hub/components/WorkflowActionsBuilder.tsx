// src/features/training-hub/components/workflow-wizard/WorkflowActionsBuilder.tsx

import { useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Plus,
  Mail,
  Bell,
  Clock,
  Webhook,
  GitBranch,
  User,
  FileText,
  Brain,
  Trash2,
  Copy,
  Settings,
  GripVertical,
  ChevronRight,
  AlertCircle,
  Zap,
  PlayCircle,
  CheckCircle,
  XCircle,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WorkflowAction } from '@/types/workflow.types';
import ActionConfigPanel from './ActionConfigPanel';

interface WorkflowActionsBuilderProps {
  actions: WorkflowAction[];
  onChange: (actions: WorkflowAction[]) => void;
  errors: Record<string, string>;
}

// Enhanced action types with more options
const ACTION_TYPES = [
  {
    type: 'send_email',
    label: 'Send Email',
    icon: Mail,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    description: 'Send email using template',
    requiredConfig: ['templateId']
  },
  {
    type: 'create_notification',
    label: 'Create Notification',
    icon: Bell,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    description: 'Show in-app notification',
    requiredConfig: ['title', 'message']
  },
  {
    type: 'wait',
    label: 'Wait',
    icon: Clock,
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    description: 'Delay before next action',
    requiredConfig: ['waitMinutes']
  },
  {
    type: 'webhook',
    label: 'Webhook',
    icon: Webhook,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    description: 'Call external API',
    requiredConfig: ['webhookUrl']
  },
  {
    type: 'update_field',
    label: 'Update Field',
    icon: Edit3,
    color: 'text-green-600 bg-green-50 border-green-200',
    description: 'Update database field',
    requiredConfig: ['fieldName', 'fieldValue']
  },
  {
    type: 'assign_user',
    label: 'Assign User',
    icon: User,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    description: 'Assign to team member',
    requiredConfig: ['userId']
  },
  {
    type: 'create_task',
    label: 'Create Task',
    icon: FileText,
    color: 'text-pink-600 bg-pink-50 border-pink-200',
    description: 'Create a new task',
    requiredConfig: ['title', 'description']
  },
  {
    type: 'branch',
    label: 'Conditional Branch',
    icon: GitBranch,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    description: 'If/then logic',
    requiredConfig: ['conditions']
  },
  {
    type: 'ai_decision',
    label: 'AI Decision',
    icon: Brain,
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    description: 'Smart routing with AI',
    requiredConfig: ['prompt']
  }
] as const;

export default function WorkflowActionsBuilder({ actions, onChange, errors }: WorkflowActionsBuilderProps) {
  const [selectedAction, setSelectedAction] = useState<number | null>(null);
  const [showActionPalette, setShowActionPalette] = useState(false);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(actions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order property
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    onChange(updatedItems);
  };

  const addAction = (type: string) => {
    const newAction: WorkflowAction = {
      type: type as WorkflowAction['type'],
      order: actions.length,
      config: {},
      delayMinutes: 0
    };
    onChange([...actions, newAction]);
    setSelectedAction(actions.length);
    setShowActionPalette(false);
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
    if (selectedAction === index) {
      setSelectedAction(null);
    } else if (selectedAction !== null && selectedAction > index) {
      setSelectedAction(selectedAction - 1);
    }
  };

  const duplicateAction = (index: number) => {
    const actionToDuplicate = actions[index];
    const newAction = {
      ...actionToDuplicate,
      order: actions.length
    };
    onChange([...actions, newAction]);
  };

  const getActionType = (type: string) => {
    return ACTION_TYPES.find(t => t.type === type);
  };

  const validateAction = (action: WorkflowAction, index: number) => {
    const actionType = getActionType(action.type);
    if (!actionType) return [];

    const issues: string[] = [];
    actionType.requiredConfig.forEach(field => {
      if (!action.config[field]) {
        issues.push(`Missing ${field}`);
      }
    });

    return issues;
  };

  return (
    <div className="flex gap-4 h-full min-h-[600px]">
      {/* Visual Flow Builder */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-medium">Workflow Actions</h3>
            <p className="text-[10px] text-muted-foreground">
              Drag to reorder, click to configure
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setShowActionPalette(!showActionPalette)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Action
          </Button>
        </div>

        {/* Action Palette */}
        {showActionPalette && (
          <div className="mb-3 p-3 rounded-lg border bg-card">
            <div className="grid grid-cols-3 gap-2">
              {ACTION_TYPES.map((actionType) => {
                const Icon = actionType.icon;
                return (
                  <button
                    key={actionType.type}
                    type="button"
                    onClick={() => addAction(actionType.type)}
                    className={cn(
                      "p-2 rounded-md border transition-all",
                      "hover:shadow-sm text-left",
                      actionType.color
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3 w-3" />
                      <div>
                        <div className="text-[10px] font-medium">{actionType.label}</div>
                        <div className="text-[9px] opacity-80">{actionType.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Flow Visualization */}
        <div className="flex-1 overflow-auto rounded-lg border bg-muted/10 p-4">
          {actions.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  No actions yet
                </p>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Add actions to define your workflow
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px]"
                  onClick={() => setShowActionPalette(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add First Action
                </Button>
              </div>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="actions">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {/* Start Node */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 border-2 border-green-500 flex items-center justify-center">
                        <PlayCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">START</span>
                    </div>

                    {/* Action Nodes */}
                    {actions.map((action, index) => {
                      const actionType = getActionType(action.type);
                      const Icon = actionType?.icon || Zap;
                      const isSelected = selectedAction === index;
                      const issues = validateAction(action, index);
                      const errorKey = `action_${index}`;
                      const hasError = errors[errorKey] || issues.length > 0;

                      return (
                        <Draggable key={index} draggableId={`action-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="relative"
                            >
                              {/* Connection Line */}
                              {index > 0 && (
                                <div className="absolute left-4 -top-2 w-0.5 h-2 bg-border" />
                              )}

                              {/* Action Node */}
                              <div
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-lg border-2 bg-card transition-all cursor-pointer",
                                  isSelected && "border-primary shadow-sm",
                                  !isSelected && "border-border hover:border-muted-foreground/50",
                                  hasError && "border-destructive",
                                  snapshot.isDragging && "shadow-lg opacity-90"
                                )}
                                onClick={() => setSelectedAction(index)}
                              >
                                {/* Drag Handle */}
                                <div {...provided.dragHandleProps} className="cursor-grab">
                                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                                </div>

                                {/* Action Icon */}
                                <div className={cn(
                                  "w-8 h-8 rounded-md flex items-center justify-center",
                                  actionType?.color || "bg-muted"
                                )}>
                                  <Icon className="h-4 w-4" />
                                </div>

                                {/* Action Details */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">
                                      {actionType?.label || action.type}
                                    </span>
                                    {action.delayMinutes && action.delayMinutes > 0 && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                                        {action.delayMinutes}m delay
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    {actionType?.description}
                                  </p>

                                  {/* Show recipient info for email and notification actions */}
                                  {(action.type === 'send_email' || action.type === 'create_notification') && action.config.recipientType && (
                                    <div className="mt-1 text-[9px] text-primary font-medium">
                                      {action.type === 'send_email' ? '📧' : '🔔'} To: {
                                        action.config.recipientType === 'trigger_user' ? 'Trigger User' :
                                        action.config.recipientType === 'specific_email' ? (action.config.recipientEmail || 'Not set') :
                                        action.config.recipientType === 'current_user' ? 'You' :
                                        action.config.recipientType === 'manager' ? 'Manager' :
                                        action.config.recipientType === 'all_trainers' ? 'All Trainers' :
                                        action.config.recipientType === 'all_agents' ? 'All Agents' :
                                        'Unknown'
                                      }
                                    </div>
                                  )}

                                  {hasError && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <AlertCircle className="h-2.5 w-2.5 text-destructive" />
                                      <span className="text-[9px] text-destructive">
                                        {errors[errorKey] || issues.join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Action Controls */}
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      duplicateAction(index);
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteAction(index);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Connection to next */}
                              {index < actions.length - 1 && (
                                <div className="absolute left-4 -bottom-2 w-0.5 h-2 bg-border" />
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}

                    {/* End Node */}
                    {actions.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-900/30 border-2 border-gray-500 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-gray-600" />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground">END</span>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {/* Action Summary */}
        {actions.length > 0 && (
          <div className="mt-3 p-2 rounded-md bg-muted/30 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-muted-foreground">Total actions:</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  {actions.length}
                </Badge>
                <span className="text-muted-foreground">Estimated time:</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  ~{actions.reduce((sum, a) => sum + (a.delayMinutes || 0), 0)}m
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      {selectedAction !== null && actions[selectedAction] && (
        <ActionConfigPanel
          action={actions[selectedAction]}
          onUpdate={(updates) => updateAction(selectedAction, updates)}
          onClose={() => setSelectedAction(null)}
        />
      )}
    </div>
  );
}