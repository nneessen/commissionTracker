// File: /home/nneessen/projects/commissionTracker/src/services/workflowService.ts

import { supabase } from '@/services/base/supabase';
import type {
  Workflow,
  WorkflowRun,
  WorkflowTemplate,
  TriggerEventType,
  WorkflowFormData,
  WorkflowStats,
  WorkflowStatus
} from '@/types/workflow.types';

class WorkflowService {
  // =====================================================
  // WORKFLOWS CRUD
  // =====================================================

  async getWorkflows(status?: WorkflowStatus) {
    const query = supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Workflow[];
  }

  async getWorkflow(id: string) {
    const { data, error } = await supabase
      .from('workflows')
      .select(`
        *,
        workflow_triggers (*),
        workflow_actions (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Workflow;
  }

  async createWorkflow(formData: WorkflowFormData) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Start transaction
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        trigger_type: formData.triggerType,
        status: 'draft',
        config: {},
        conditions: formData.conditions || [],
        actions: formData.actions.map(a => ({
          ...a.config,
          type: a.type,
          order: a.order
        })),
        max_runs_per_day: formData.settings?.maxRunsPerDay,
        max_runs_per_recipient: formData.settings?.maxRunsPerRecipient,
        cooldown_minutes: formData.settings?.cooldownMinutes,
        priority: formData.settings?.priority || 50,
        created_by: user.user.id
      })
      .select()
      .single();

    if (workflowError) throw workflowError;

    // Create trigger if provided
    if (formData.trigger) {
      const triggerConfig = this.buildTriggerConfig(formData.trigger);

      const { error: triggerError } = await supabase
        .from('workflow_triggers')
        .insert({
          workflow_id: workflow.id,
          trigger_type: formData.trigger.type,
          ...triggerConfig
        });

      if (triggerError) throw triggerError;
    }

    // Create actions
    if (formData.actions.length > 0) {
      const { error: actionsError } = await supabase
        .from('workflow_actions')
        .insert(
          formData.actions.map(action => ({
            workflow_id: workflow.id,
            action_order: action.order,
            action_type: action.type,
            config: action.config,
            conditions: action.conditions || [],
            delay_minutes: action.delayMinutes || 0,
            retry_on_failure: action.retryOnFailure ?? true,
            max_retries: action.maxRetries || 3
          }))
        );

      if (actionsError) throw actionsError;
    }

    return workflow as Workflow;
  }

  async updateWorkflow(id: string, updates: Partial<WorkflowFormData>) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Update main workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .update({
        name: updates.name,
        description: updates.description,
        category: updates.category,
        trigger_type: updates.triggerType,
        conditions: updates.conditions,
        actions: updates.actions?.map(a => ({
          ...a.config,
          type: a.type,
          order: a.order
        })),
        max_runs_per_day: updates.settings?.maxRunsPerDay,
        max_runs_per_recipient: updates.settings?.maxRunsPerRecipient,
        cooldown_minutes: updates.settings?.cooldownMinutes,
        priority: updates.settings?.priority,
        last_modified_by: user.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (workflowError) throw workflowError;

    // Update actions if provided
    if (updates.actions) {
      // Delete existing actions
      await supabase
        .from('workflow_actions')
        .delete()
        .eq('workflow_id', id);

      // Insert new actions
      if (updates.actions.length > 0) {
        const { error: actionsError } = await supabase
          .from('workflow_actions')
          .insert(
            updates.actions.map(action => ({
              workflow_id: id,
              action_order: action.order,
              action_type: action.type,
              config: action.config,
              conditions: action.conditions || [],
              delay_minutes: action.delayMinutes || 0,
              retry_on_failure: action.retryOnFailure ?? true,
              max_retries: action.maxRetries || 3
            }))
          );

        if (actionsError) throw actionsError;
      }
    }

    return workflow as Workflow;
  }

  async deleteWorkflow(id: string) {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateWorkflowStatus(id: string, status: WorkflowStatus) {
    const { data, error } = await supabase
      .from('workflows')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Workflow;
  }

  // =====================================================
  // WORKFLOW RUNS
  // =====================================================

  async getWorkflowRuns(workflowId?: string, limit = 50) {
    const query = supabase
      .from('workflow_runs')
      .select(`
        *,
        workflows (name, category)
      `)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (workflowId) {
      query.eq('workflow_id', workflowId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as WorkflowRun[];
  }

  async getWorkflowRun(id: string) {
    const { data, error } = await supabase
      .from('workflow_runs')
      .select(`
        *,
        workflows (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as WorkflowRun;
  }

  async triggerWorkflow(workflowId: string, context: Record<string, any> = {}) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Check if workflow can run
    const { data: canRun, error: checkError } = await supabase
      .rpc('can_workflow_run', {
        p_workflow_id: workflowId,
        p_recipient_id: context.recipientId || null
      });

    if (checkError) throw checkError;
    if (!canRun) {
      throw new Error('Workflow cannot run due to execution limits');
    }

    // Create workflow run
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .insert({
        workflow_id: workflowId,
        trigger_source: 'manual',
        status: 'running',
        context
      })
      .select()
      .single();

    if (runError) throw runError;

    // TODO: Trigger edge function to process workflow
    // For now, mark as completed after a delay
    setTimeout(async () => {
      await supabase
        .from('workflow_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: 1000
        })
        .eq('id', run.id);
    }, 1000);

    return run as WorkflowRun;
  }

  async cancelWorkflowRun(runId: string) {
    const { data, error } = await supabase
      .from('workflow_runs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', runId)
      .select()
      .single();

    if (error) throw error;
    return data as WorkflowRun;
  }

  // =====================================================
  // WORKFLOW TEMPLATES
  // =====================================================

  async getWorkflowTemplates(category?: string) {
    const query = supabase
      .from('workflow_templates')
      .select('*')
      .order('usage_count', { ascending: false });

    if (category) {
      query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as WorkflowTemplate[];
  }

  async createWorkflowFromTemplate(templateId: string, name: string) {
    const { data: template, error: templateError } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    // Increment usage count
    await supabase
      .from('workflow_templates')
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq('id', templateId);

    // Create workflow from template
    const workflowConfig = template.workflow_config as Partial<Workflow>;
    const formData: WorkflowFormData = {
      name,
      description: workflowConfig.description,
      category: workflowConfig.category || 'general',
      triggerType: workflowConfig.triggerType || 'manual',
      conditions: workflowConfig.conditions || [],
      actions: workflowConfig.actions || []
    };

    return this.createWorkflow(formData);
  }

  // =====================================================
  // TRIGGER EVENT TYPES
  // =====================================================

  async getTriggerEventTypes() {
    const { data, error } = await supabase
      .from('trigger_event_types')
      .select('*')
      .eq('is_active', true)
      .order('category');

    if (error) throw error;
    return data as TriggerEventType[];
  }

  // =====================================================
  // STATISTICS
  // =====================================================

  async getWorkflowStats(workflowId: string): Promise<WorkflowStats> {
    const { data: runs, error } = await supabase
      .from('workflow_runs')
      .select('status, duration_ms, started_at')
      .eq('workflow_id', workflowId);

    if (error) throw error;

    const totalRuns = runs.length;
    const successfulRuns = runs.filter((r: any) => r.status === 'completed').length;
    const failedRuns = runs.filter((r: any) => r.status === 'failed').length;

    const durations = runs
      .filter((r: any) => r.duration_ms)
      .map((r: any) => r.duration_ms as number);

    const averageDuration = durations.length > 0
      ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
      : 0;

    const lastRun = runs.length > 0
      ? runs.sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
      : null;

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      averageDuration,
      lastRunAt: lastRun?.started_at
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private buildTriggerConfig(trigger: any) {
    const config: any = {};

    switch (trigger.type) {
      case 'schedule':
        config.schedule_config = trigger.schedule;
        break;
      case 'event':
        config.event_config = {
          event_name: trigger.eventName,
          conditions: trigger.conditions || []
        };
        break;
      case 'webhook':
        config.webhook_config = trigger.webhookConfig;
        break;
    }

    return config;
  }

  async testWorkflow(workflowId: string, testContext: Record<string, any>) {
    // Create a test run
    const { data: run, error } = await supabase
      .from('workflow_runs')
      .insert({
        workflow_id: workflowId,
        trigger_source: 'test',
        status: 'running',
        context: { ...testContext, isTest: true }
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Process test run with edge function
    // For now, simulate completion
    setTimeout(async () => {
      await supabase
        .from('workflow_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: 500,
          actions_executed: [
            { actionId: 'test-1', status: 'success', result: 'Email would be sent' }
          ]
        })
        .eq('id', run.id);
    }, 500);

    return run as WorkflowRun;
  }
}

export const workflowService = new WorkflowService();