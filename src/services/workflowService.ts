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

    // Create workflow with proper structure
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        name: formData.name.trim(),
        description: formData.description?.trim(),
        category: formData.category,
        trigger_type: formData.triggerType,
        status: formData.status || 'draft',
        config: {
          trigger: formData.trigger,
          continueOnError: formData.settings?.continueOnError
        },
        conditions: formData.conditions || [],
        // Store actions in JSON column with ALL config including recipients
        actions: formData.actions.map(a => ({
          type: a.type,
          order: a.order,
          config: a.config, // This includes recipientType, recipientEmail, etc.
          delayMinutes: a.delayMinutes || 0,
          conditions: a.conditions || [],
          retryOnFailure: a.retryOnFailure ?? true,
          maxRetries: a.maxRetries || 3
        })),
        max_runs_per_day: formData.settings?.maxRunsPerDay || 50,
        max_runs_per_recipient: formData.settings?.maxRunsPerRecipient,
        cooldown_minutes: formData.settings?.cooldownMinutes,
        priority: Number(formData.settings?.priority) || 50,
        created_by: user.user.id
      })
      .select()
      .single();

    if (workflowError) throw workflowError;

    // Don't duplicate actions in workflow_actions table - we're using the JSON column
    // The Edge Function reads from the JSON column, not the separate table

    return workflow as Workflow;
  }

  async updateWorkflow(id: string, updates: Partial<WorkflowFormData>) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Build update object - only include fields that are provided
    const updateData: any = {
      last_modified_by: user.user.id,
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.description !== undefined) updateData.description = updates.description?.trim();
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.triggerType !== undefined) updateData.trigger_type = updates.triggerType;
    if (updates.conditions !== undefined) updateData.conditions = updates.conditions;

    // Store complete action configuration including recipients
    if (updates.actions !== undefined) {
      updateData.actions = updates.actions.map(a => ({
        type: a.type,
        order: a.order,
        config: a.config, // This MUST include recipientType, recipientEmail, etc.
        delayMinutes: a.delayMinutes || 0,
        conditions: a.conditions || [],
        retryOnFailure: a.retryOnFailure ?? true,
        maxRetries: a.maxRetries || 3
      }));
    }

    if (updates.settings?.maxRunsPerDay !== undefined) {
      updateData.max_runs_per_day = updates.settings.maxRunsPerDay;
    }
    if (updates.settings?.maxRunsPerRecipient !== undefined) {
      updateData.max_runs_per_recipient = updates.settings.maxRunsPerRecipient;
    }
    if (updates.settings?.cooldownMinutes !== undefined) {
      updateData.cooldown_minutes = updates.settings.cooldownMinutes;
    }
    if (updates.settings?.priority !== undefined) {
      updateData.priority = Number(updates.settings.priority);
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }

    // Update config if trigger provided
    if (updates.trigger || updates.settings?.continueOnError !== undefined) {
      updateData.config = {
        trigger: updates.trigger,
        continueOnError: updates.settings?.continueOnError
      };
    }

    // Update main workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (workflowError) throw workflowError;

    // Don't use workflow_actions table - everything is in the JSON column

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
    let query = supabase
      .from('workflow_runs')
      .select(`
        *,
        workflow:workflows (
          id,
          name,
          status,
          trigger_type
        )
      `)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (workflowId) {
      query = query.eq('workflow_id', workflowId);
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

  async triggerWorkflow(workflowId: string, context: Record<string, unknown> = {}) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Get the workflow to understand its structure
    const { data: workflow, error: wfError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (wfError || !workflow) throw new Error('Workflow not found');

    // Build proper context with recipient information
    const enrichedContext: Record<string, unknown> = {
      ...context,
      triggeredBy: user.user.id,
      triggeredByEmail: user.user.email,
      triggeredAt: new Date().toISOString(),
      workflowName: workflow.name
    };

    // If no recipientId provided, use the current user as default recipient
    if (!enrichedContext.recipientId) {
      enrichedContext.recipientId = user.user.id;
      enrichedContext.recipientEmail = user.user.email;
      enrichedContext.recipientName = user.user.user_metadata?.name || user.user.email;
    }

    // Check if workflow can run (skip this check if the RPC doesn't exist)
    try {
      const { data: canRun, error: checkError } = await supabase
        .rpc('can_workflow_run', {
          p_workflow_id: workflowId,
          p_recipient_id: enrichedContext.recipientId as string
        });

      if (!checkError && !canRun) {
        throw new Error('Workflow cannot run due to execution limits');
      }
    } catch (err) {
      // If RPC doesn't exist, continue anyway
      console.warn('can_workflow_run check failed, continuing:', err);
    }

    // Create workflow run with enriched context
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .insert({
        workflow_id: workflowId,
        trigger_source: 'manual',
        status: 'running',
        context: enrichedContext
      })
      .select()
      .single();

    if (runError) throw runError;

    // Trigger edge function to process workflow asynchronously
    // Note: We don't await this - the workflow runs in the background
    // But we do log errors for debugging
    supabase.functions.invoke('process-workflow', {
      body: { runId: run.id, workflowId }
    }).then((response) => {
      if (response.error) {
        console.error('Workflow processor returned error:', response.error);
      } else {
        console.log('Workflow processor invoked successfully:', response.data);
      }
    }).catch((err) => {
      console.error('Failed to invoke workflow processor:', err);
    });

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
      trigger: {
        type: workflowConfig.triggerType || 'manual',
        eventName: undefined,
        schedule: undefined,
        webhookConfig: undefined,
      },
      conditions: workflowConfig.conditions || [],
      actions: workflowConfig.actions || [],
      settings: {
        maxRunsPerDay: workflowConfig.maxRunsPerDay || 10,
        maxRunsPerRecipient: workflowConfig.maxRunsPerRecipient,
        cooldownMinutes: workflowConfig.cooldownMinutes,
        continueOnError: false,
        priority: workflowConfig.priority || 50
      }
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
    interface RunRecord {
      status: string;
      duration_ms: number | null;
      started_at: string;
    }

    const { data: runs, error } = await supabase
      .from('workflow_runs')
      .select('status, duration_ms, started_at')
      .eq('workflow_id', workflowId);

    if (error) throw error;

    const typedRuns = (runs || []) as RunRecord[];
    const totalRuns = typedRuns.length;
    const successfulRuns = typedRuns.filter((r) => r.status === 'completed').length;
    const failedRuns = typedRuns.filter((r) => r.status === 'failed').length;

    const durations = typedRuns
      .filter((r) => r.duration_ms !== null)
      .map((r) => r.duration_ms as number);

    const averageDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const lastRun = typedRuns.length > 0
      ? typedRuns.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
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

  async testWorkflow(workflowId: string, testContext: Record<string, unknown>) {
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

    // Trigger edge function to process test workflow
    supabase.functions.invoke('process-workflow', {
      body: { runId: run.id, workflowId, isTest: true }
    }).catch((err) => {
      console.error('Failed to invoke workflow processor for test:', err);
    });

    return run as WorkflowRun;
  }
}

export const workflowService = new WorkflowService();