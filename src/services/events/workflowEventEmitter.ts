// File: /home/nneessen/projects/commissionTracker/src/services/events/workflowEventEmitter.ts
// TODO: remove console.logs

import {supabase} from "@/services/base/supabase";
import type {Workflow} from "@/types/workflow.types";

interface EventContext {
  // Common context fields
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  timestamp?: string;

  // Entity-specific fields
  recruitId?: string;
  policyId?: string;
  commissionId?: string;
  agentId?: string;

  // Additional data
  [key: string]: unknown;
}

interface EventEmissionResult {
  success: boolean;
  workflowsTriggered: number;
  errors?: string[];
}

class WorkflowEventEmitter {
  private static instance: WorkflowEventEmitter;

  private constructor() {}

  static getInstance(): WorkflowEventEmitter {
    if (!WorkflowEventEmitter.instance) {
      WorkflowEventEmitter.instance = new WorkflowEventEmitter();
    }
    return WorkflowEventEmitter.instance;
  }

  async emit(
    eventName: string,
    context: EventContext,
  ): Promise<EventEmissionResult> {
    const result: EventEmissionResult = {
      success: true,
      workflowsTriggered: 0,
      errors: [],
    };

    try {
      console.log(`[EventEmitter] Firing event: ${eventName}`, context);

      if (typeof window !== "undefined" && import.meta.env?.DEV) {
        const { toast } = await import("sonner");
        toast.info(`Event: ${eventName}`, {
          description: "Workflow event triggered",
          duration: 2000,
        });
      }

      await this.recordEvent(eventName, context);

      const workflows = await this.findTriggeredWorkflows(eventName);

      if (workflows.length === 0) {
        console.log(
          `[EventEmitter] No active workflows found for event: ${eventName}`,
        );
        return result;
      }

      console.log(
        `[EventEmitter] Found ${workflows.length} workflows for event: ${eventName}`,
      );

      // Execute each workflow
      for (const workflow of workflows) {
        try {
          await this.executeWorkflow(workflow, eventName, context);
          result.workflowsTriggered++;
        } catch (error) {
          console.error(
            `[EventEmitter] Failed to execute workflow ${workflow.id}:`,
            error,
          );
          result.errors?.push(
            `Workflow ${workflow.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      // Show success feedback if workflows were triggered
      if (
        result.workflowsTriggered > 0 &&
        typeof window !== "undefined" &&
        import.meta.env?.DEV
      ) {
        const { toast } = await import("sonner");
        toast.success(`${result.workflowsTriggered} workflow(s) triggered`, {
          description: `Event: ${eventName}`,
          duration: 3000,
        });
      }

      return result;
    } catch (error) {
      console.error("[EventEmitter] Error emitting event:", error);
      return {
        success: false,
        workflowsTriggered: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  /**
   * Record event occurrence for audit and debugging
   */
  private async recordEvent(
    eventName: string,
    context: EventContext,
  ): Promise<void> {
    try {
      await supabase.from("workflow_events").insert({
        event_name: eventName,
        context,
        fired_at: new Date().toISOString(),
        workflows_triggered: 0, // Will be updated later
      });
    } catch (error) {
      // Don't fail if we can't record the event, just log it
      console.warn("[EventEmitter] Failed to record event:", error);
    }
  }

  /**
   * Find all active workflows that should be triggered by this event
   */
  private async findTriggeredWorkflows(eventName: string): Promise<Workflow[]> {
    // Query workflows with event trigger matching this event name
    const { data: workflows, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("status", "active")
      .eq("trigger_type", "event")
      .contains("config", { trigger: { eventName } });

    if (error) {
      console.error("[EventEmitter] Error finding triggered workflows:", error);
      throw error;
    }

    // Additional filtering for workflows that match the event
    const matchingWorkflows = (workflows || []).filter((workflow) => {
      const trigger = workflow.config?.trigger;
      return trigger?.eventName === eventName;
    });

    return matchingWorkflows as Workflow[];
  }

  /**
   * Execute a workflow in response to an event
   */
  private async executeWorkflow(
    workflow: Workflow,
    eventName: string,
    context: EventContext,
  ): Promise<void> {
    console.log(
      `[EventEmitter] Executing workflow: ${workflow.name} for event: ${eventName}`,
    );

    // Check cooldown period
    const canRun = await this.checkWorkflowCooldown(workflow, context);
    if (!canRun) {
      console.log(
        `[EventEmitter] Workflow ${workflow.name} is in cooldown period`,
      );
      return;
    }

    // Check conditions if any
    if (!this.evaluateConditions(workflow.conditions, context)) {
      console.log(
        `[EventEmitter] Workflow ${workflow.name} conditions not met`,
      );
      return;
    }

    // Create workflow run
    const { data: run, error: runError } = await supabase
      .from("workflow_runs")
      .insert({
        workflow_id: workflow.id,
        trigger_source: `event:${eventName}`,
        status: "running",
        context: {
          ...context,
          eventName,
          triggeredBy: "system",
          triggeredAt: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (runError) {
      console.error(`[EventEmitter] Failed to create workflow run:`, runError);
      throw runError;
    }

    // Trigger the edge function to process the workflow asynchronously
    supabase.functions
      .invoke("process-workflow", {
        body: {
          runId: run.id,
          workflowId: workflow.id,
          isEventTriggered: true,
        },
      })
      .then((response) => {
        if (response.error) {
          console.error(
            `[EventEmitter] Workflow processor error for ${workflow.name}:`,
            response.error,
          );
        } else {
          console.log(
            `[EventEmitter] Workflow ${workflow.name} triggered successfully`,
          );
        }
      })
      .catch((err) => {
        console.error(
          `[EventEmitter] Failed to invoke workflow processor:`,
          err,
        );
      });
  }

  /**
   * Check if workflow can run based on cooldown and rate limits
   */
  private async checkWorkflowCooldown(
    workflow: Workflow, _context: EventContext,
  ): Promise<boolean> {
    if (!workflow.cooldownMinutes) {
      return true; // No cooldown configured
    }

    const cooldownTime = new Date();
    cooldownTime.setMinutes(
      cooldownTime.getMinutes() - workflow.cooldownMinutes,
    );

    // Check for recent runs
    const { data: recentRuns, error } = await supabase
      .from("workflow_runs")
      .select("id")
      .eq("workflow_id", workflow.id)
      .gte("started_at", cooldownTime.toISOString())
      .limit(1);

    if (error) {
      console.warn("[EventEmitter] Failed to check cooldown:", error);
      return true; // Allow run if we can't check
    }

    return !recentRuns || recentRuns.length === 0;
  }

  /**
   * Evaluate workflow conditions against the event context
   */
  private evaluateConditions(
    conditions: unknown[],
    context: EventContext,
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions to check
    }

    for (const condition of conditions) {
      const cond = condition as {
        field: string;
        operator: string;
        value: unknown;
      };
      const fieldValue = this.getNestedValue(context, cond.field);
      const conditionMet = this.evaluateCondition(
        fieldValue,
        cond.operator,
        cond.value,
      );

      // For now, we'll use AND logic for all conditions
      if (!conditionMet) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path
      .split(".")
      .reduce(
        (current, key) => (current as Record<string, unknown>)?.[key],
        obj,
      );
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    fieldValue: unknown,
    operator: string,
    expectedValue: unknown,
  ): boolean {
    switch (operator) {
      case "equals":
        return fieldValue === expectedValue;
      case "not_equals":
        return fieldValue !== expectedValue;
      case "contains":
        return String(fieldValue).includes(String(expectedValue));
      case "not_contains":
        return !String(fieldValue).includes(String(expectedValue));
      case "greater_than":
        return Number(fieldValue) > Number(expectedValue);
      case "less_than":
        return Number(fieldValue) < Number(expectedValue);
      case "in":
        return (
          Array.isArray(expectedValue) && expectedValue.includes(fieldValue)
        );
      case "not_in":
        return (
          Array.isArray(expectedValue) && !expectedValue.includes(fieldValue)
        );
      default:
        return true; // Unknown operator, allow
    }
  }

  /**
   * Emit batch events for bulk operations
   */
  async emitBatch(
    events: Array<{ eventName: string; context: EventContext }>,
  ): Promise<void> {
    for (const event of events) {
      await this.emit(event.eventName, event.context);
    }
  }
}

// Export singleton instance
export const workflowEventEmitter = WorkflowEventEmitter.getInstance();

// Export event names as constants for type safety
export const WORKFLOW_EVENTS = {
  // Recruit events
  RECRUIT_CREATED: "recruit.created",
  RECRUIT_PHASE_CHANGED: "recruit.phase_changed",
  RECRUIT_GRADUATED_TO_AGENT: "recruit.graduated_to_agent",
  RECRUIT_DROPPED_OUT: "recruit.dropped_out",

  // Policy events
  POLICY_CREATED: "policy.created",
  POLICY_APPROVED: "policy.approved",
  POLICY_CANCELLED: "policy.cancelled",
  POLICY_RENEWED: "policy.renewed",

  // Commission events
  COMMISSION_EARNED: "commission.earned",
  COMMISSION_CHARGEBACK: "commission.chargeback",
  COMMISSION_PAID: "commission.paid",

  // User events
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  USER_ROLE_CHANGED: "user.role_changed",

  // Email events
  EMAIL_SENT: "email.sent",
  EMAIL_FAILED: "email.failed",
  EMAIL_BOUNCED: "email.bounced",

  // Lead events
  LEAD_PACK_PURCHASED: "lead.pack_purchased",
  LEAD_CONVERSION_THRESHOLD: "lead.conversion_threshold",

  // Custom events
  CUSTOM_TRIGGER: "custom.trigger",
} as const;

