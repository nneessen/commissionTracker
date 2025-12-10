// src/features/training-hub/components/WorkflowWizard.tsx

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Save,
  TestTube
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type {
  Workflow,
  WorkflowFormData,
  WorkflowAction,
  WorkflowCategory,
  WorkflowStatus,
  TriggerType
} from '@/types/workflow.types';
import { useCreateWorkflow, useUpdateWorkflow, useWorkflows } from '@/hooks/workflows';
import WorkflowBasicInfo from './WorkflowBasicInfo';
import WorkflowTriggerSetup from './WorkflowTriggerSetup';
import WorkflowActionsBuilder from './WorkflowActionsBuilder';
import WorkflowReview from './WorkflowReview';

interface WorkflowWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow?: Workflow | null;
}

const WIZARD_STEPS = [
  { id: 'basic', label: 'Basic Info', component: WorkflowBasicInfo },
  { id: 'trigger', label: 'Trigger', component: WorkflowTriggerSetup },
  { id: 'actions', label: 'Actions', component: WorkflowActionsBuilder },
  { id: 'review', label: 'Review', component: WorkflowReview }
];

export default function WorkflowWizard({ open, onOpenChange, workflow }: WorkflowWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WorkflowFormData>({
    name: '',
    description: '',
    category: 'general',
    triggerType: 'manual',
    trigger: {
      type: 'manual',
      schedule: undefined,
      eventName: undefined,
      webhookConfig: undefined,
    },
    actions: [],
    settings: {
      maxRunsPerDay: 10,
      continueOnError: false,
      priority: 50,  // 1-100, 50 is normal priority
    },
    status: 'draft',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow(workflow?.id || '');
  const { data: existingWorkflows = [] } = useWorkflows();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (workflow) {
        // Load existing workflow
        // Parse trigger from config if needed
        const triggerConfig = workflow.config?.trigger || {};
        setFormData({
          name: workflow.name,
          description: workflow.description || '',
          category: (workflow.category as WorkflowCategory) || 'general',
          triggerType: (workflow.triggerType as TriggerType) || 'manual',
          trigger: {
            type: (workflow.triggerType as TriggerType) || 'manual',
            eventName: triggerConfig.eventName,
            schedule: triggerConfig.schedule,
            webhookConfig: triggerConfig.webhookConfig,
          },
          actions: (workflow.actions as WorkflowAction[]) || [],
          settings: {
            maxRunsPerDay: workflow.maxRunsPerDay || 10,
            maxRunsPerRecipient: workflow.maxRunsPerRecipient || undefined,
            cooldownMinutes: workflow.cooldownMinutes || undefined,
            continueOnError: workflow.config?.continueOnError || false,
            priority: workflow.priority || 50
          },
          status: (workflow.status as WorkflowStatus) || 'draft'
        });
      } else {
        // Reset for new workflow
        setFormData({
          name: '',
          description: '',
          category: 'general',
          triggerType: 'manual',
          trigger: {
            type: 'manual',
            schedule: undefined,
            eventName: undefined,
            webhookConfig: undefined,
          },
          actions: [],
          settings: {
            maxRunsPerDay: 10,
            continueOnError: false,
            priority: 50
          },
          status: 'draft'
        });
      }
      setCurrentStep(0);
      setErrors({});
    }
  }, [open, workflow]);

  // Parse error messages for user-friendly display
  const parseErrorMessage = (error: any): string => {
    const errorMessage = error?.message || error?.toString() || 'An unknown error occurred';

    // Check for duplicate key errors
    if (errorMessage.includes('duplicate key') || errorMessage.includes('workflows_name_unique')) {
      return `A workflow named "${formData.name}" already exists. Please choose a different name.`;
    }

    // Check for validation errors
    if (errorMessage.includes('required')) {
      return 'Please fill in all required fields.';
    }

    // Check for permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
      return 'You do not have permission to perform this action.';
    }

    // Check for network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }

    // Return original if we can't parse it
    return errorMessage;
  };

  // Validate current step
  const validateStep = useCallback((stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepIndex) {
      case 0: // Basic Info
        if (!formData.name.trim()) {
          newErrors.name = 'Workflow name is required';
        } else if (formData.name.trim().length < 3) {
          newErrors.name = 'Workflow name must be at least 3 characters';
        } else if (formData.name.trim().length > 50) {
          newErrors.name = 'Workflow name must be less than 50 characters';
        } else {
          // Check for duplicate names (only for new workflows or if name changed)
          const isDuplicate = existingWorkflows.some(w =>
            w.name.toLowerCase() === formData.name.trim().toLowerCase() &&
            w.id !== workflow?.id // Exclude current workflow when editing
          );
          if (isDuplicate) {
            newErrors.name = `A workflow named "${formData.name.trim()}" already exists. Please choose a different name.`;
          }
        }
        if (formData.description && formData.description.length > 500) {
          newErrors.description = 'Description must be less than 500 characters';
        }
        break;

      case 1: // Trigger
        if (formData.triggerType === 'event' && !formData.trigger?.eventName) {
          newErrors.trigger = 'Please select an event';
        }
        if (formData.triggerType === 'schedule') {
          if (!formData.trigger?.schedule?.time) {
            newErrors.schedule = 'Please set a schedule time';
          }
        }
        if (formData.triggerType === 'webhook' && !formData.trigger?.webhookConfig) {
          newErrors.trigger = 'Please configure webhook settings';
        }
        break;

      case 2: // Actions
        if (formData.actions.length === 0) {
          newErrors.actions = 'Add at least one action';
        }
        // Validate each action
        formData.actions.forEach((action, index) => {
          if (action.type === 'send_email' && !action.config.templateId) {
            newErrors[`action_${index}`] = 'Select an email template';
          }
          if (action.type === 'webhook' && !action.config.webhookUrl) {
            newErrors[`action_${index}`] = 'Enter webhook URL';
          }
          if (action.type === 'create_notification') {
            if (!action.config.title) newErrors[`action_${index}_title`] = 'Title required';
            if (!action.config.message) newErrors[`action_${index}_message`] = 'Message required';
          }
          if (action.type === 'wait' && !action.config.waitMinutes) {
            newErrors[`action_${index}`] = 'Wait duration is required';
          }
        });
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, existingWorkflows, workflow?.id]);

  // Handle navigation
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // Update form data
  const updateFormData = useCallback((updates: Partial<WorkflowFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear relevant errors when data changes
    const newErrors = { ...errors };
    if (updates.name !== undefined) delete newErrors.name;
    if (updates.trigger !== undefined) {
      delete newErrors.trigger;
      delete newErrors.schedule;
    }
    if (updates.actions !== undefined) {
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith('action_')) delete newErrors[key];
      });
      delete newErrors.actions;
    }
    setErrors(newErrors);
  }, [errors]);

  // Handle save
  const handleSave = async () => {
    // Validate all steps
    for (let i = 0; i <= 2; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }

    // Clear any previous errors
    setErrors({});
    setIsSubmitting(true);

    try {
      if (workflow) {
        await updateWorkflow.mutateAsync(formData);
      } else {
        await createWorkflow.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save workflow:', error);
      
      // Parse and display user-friendly error
      const userMessage = parseErrorMessage(error);
      setErrors({ submit: userMessage });
      
      // If it's a name conflict, go back to basic info step
      if (userMessage.includes('already exists') || userMessage.includes('name')) {
        setCurrentStep(0);
        setErrors(prev => ({ ...prev, name: userMessage }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle test run
  const handleTestRun = async () => {
    // Validate all steps
    for (let i = 0; i <= 2; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // First save the workflow as draft if new
      let workflowId = workflow?.id;

      if (!workflowId) {
        const draftData = { ...formData, status: 'draft' as WorkflowStatus };
        const result = await createWorkflow.mutateAsync(draftData);
        workflowId = result.id;
      }

      // Now trigger test run
      const { testWorkflow } = await import('@/services/workflowService').then(m => ({ testWorkflow: m.workflowService.testWorkflow }));
      await testWorkflow(workflowId, {
        testMode: true,
        testData: {
          recipientEmail: 'test@example.com',
          recipientId: 'test-user-id'
        }
      });

      // Show success message
      const { toast } = await import('sonner');
      toast.success('Test workflow started! Check the runs tab for results.');

      // Optional: Switch to runs tab or close dialog
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to test workflow:', error);
      setErrors({ submit: `Test failed: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render current step component
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <WorkflowBasicInfo
            data={formData}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 1:
        return (
          <WorkflowTriggerSetup
            data={formData}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 2:
        return (
          <WorkflowActionsBuilder
            actions={formData.actions}
            onChange={(actions) => updateFormData({ actions })}
            errors={errors}
          />
        );
      case 3:
        return (
          <WorkflowReview
            data={formData}
            onEdit={setCurrentStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="shrink-0 px-6 py-4 border-b bg-background">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-lg font-semibold">
                {workflow ? 'Edit Workflow' : 'Create New Workflow'}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Step Progress - Simple text indicators, NOT buttons */}
            <div className="flex items-center gap-4 text-sm">
              {WIZARD_STEPS.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const hasError = Object.keys(errors).some(key => {
                  if (index === 0) return key === 'name' || key === 'description';
                  if (index === 1) return key === 'trigger' || key === 'schedule';
                  if (index === 2) return key === 'actions' || key.startsWith('action_');
                  return false;
                });

                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-2",
                      isActive && "font-semibold text-foreground",
                      isCompleted && !isActive && "text-muted-foreground",
                      !isActive && !isCompleted && "text-muted-foreground/50",
                      hasError && "text-destructive"
                    )}
                  >
                    <span className={cn(
                      "flex items-center justify-center w-5 h-5 rounded-full text-xs",
                      isActive && "bg-primary text-primary-foreground",
                      isCompleted && !isActive && "bg-primary/20 text-primary",
                      !isActive && !isCompleted && "bg-muted",
                      hasError && "bg-destructive/20 text-destructive"
                    )}>
                      {isCompleted && !isActive ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span>{step.label}</span>
                    {index < WIZARD_STEPS.length - 1 && (
                      <span className="text-muted-foreground/30 ml-2">→</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Display submit error if any */}
            {errors.submit && (
              <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Content - Full height with scroll */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="w-full h-full">
              {renderStepContent()}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Space for additional footer content */}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0 || isSubmitting}
                  size="default"
                  className="border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {currentStep < WIZARD_STEPS.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    size="default"
                    disabled={isSubmitting}
                    variant="default"
                    className="bg-primary hover:bg-primary/90"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={handleTestRun}
                      disabled={isSubmitting}
                      size="default"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      Test Run
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSubmitting}
                      size="default"
                      variant="default"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Saving...' : (workflow ? 'Update' : 'Create')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}