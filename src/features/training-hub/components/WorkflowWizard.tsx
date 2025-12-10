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
  WorkflowAction
} from '@/types/workflow.types';
import { useCreateWorkflow, useUpdateWorkflow } from '@/hooks/workflows';
import WorkflowBasicInfo from './workflow-wizard/WorkflowBasicInfo';
import WorkflowTriggerSetup from './workflow-wizard/WorkflowTriggerSetup';
import WorkflowActionsBuilder from './workflow-wizard/WorkflowActionsBuilder';
import WorkflowReview from './workflow-wizard/WorkflowReview';

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
    actions: [],
    settings: {
      maxRunsPerDay: 50,
      priority: 50
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow(workflow?.id || '');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (workflow) {
        // Load existing workflow
        setFormData({
          name: workflow.name,
          description: workflow.description || '',
          category: workflow.category,
          triggerType: workflow.triggerType,
          actions: workflow.actions || [],
          settings: {
            maxRunsPerDay: workflow.maxRunsPerDay || 50,
            maxRunsPerRecipient: workflow.maxRunsPerRecipient,
            cooldownMinutes: workflow.cooldownMinutes,
            priority: workflow.priority || 50
          }
        });
      } else {
        // Reset for new workflow
        setFormData({
          name: '',
          description: '',
          category: 'general',
          triggerType: 'manual',
          actions: [],
          settings: {
            maxRunsPerDay: 50,
            priority: 50
          }
        });
      }
      setCurrentStep(0);
      setErrors({});
    }
  }, [open, workflow]);

  // Validate current step
  const validateStep = useCallback((stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepIndex) {
      case 0: // Basic Info
        if (!formData.name.trim()) {
          newErrors.name = 'Workflow name is required';
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
        });
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle navigation
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleStepClick = (index: number) => {
    // Allow navigation to any previous step or current step
    if (index <= currentStep) {
      // Validate all steps up to the target
      let canNavigate = true;
      for (let i = 0; i < index; i++) {
        if (!validateStep(i)) {
          canNavigate = false;
          setCurrentStep(i); // Go to first invalid step
          break;
        }
      }
      if (canNavigate) {
        setCurrentStep(index);
      }
    }
  };

  // Update form data
  const updateFormData = useCallback((updates: Partial<WorkflowFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear relevant errors when data changes
    if (updates.name !== undefined) delete errors.name;
    if (updates.trigger !== undefined) {
      delete errors.trigger;
      delete errors.schedule;
    }
    if (updates.actions !== undefined) {
      Object.keys(errors).forEach(key => {
        if (key.startsWith('action_')) delete errors[key];
      });
    }
    setErrors({ ...errors });
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

    setIsSubmitting(true);
    try {
      if (workflow) {
        await updateWorkflow.mutateAsync(formData);
      } else {
        await createWorkflow.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      setErrors({ submit: 'Failed to save workflow. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle test run
  const handleTestRun = () => {
    // TODO: Implement test run functionality
    console.log('Test run:', formData);
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
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-2">
              {WIZARD_STEPS.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const hasError = Object.keys(errors).some(key => {
                  if (index === 0) return key === 'name';
                  if (index === 1) return key === 'trigger' || key === 'schedule';
                  if (index === 2) return key === 'actions' || key.startsWith('action_');
                  return false;
                });

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStepClick(index)}
                    disabled={index > currentStep}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all",
                      isActive && "bg-primary text-primary-foreground shadow-sm",
                      isCompleted && !isActive && "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground cursor-not-allowed",
                      hasError && "ring-2 ring-destructive ring-offset-2"
                    )}
                  >
                    <span className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                      isActive && "bg-primary-foreground/20",
                      isCompleted && !isActive && "bg-primary/20"
                    )}>
                      {isCompleted && !isActive ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                );
              })}
            </div>
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
                {errors.submit && (
                  <p className="text-sm text-destructive">{errors.submit}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  size="default"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {currentStep < WIZARD_STEPS.length - 1 ? (
                  <Button onClick={handleNext} size="default">
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleTestRun}
                      disabled={isSubmitting}
                      size="default"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      Test Run
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSubmitting}
                      size="default"
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