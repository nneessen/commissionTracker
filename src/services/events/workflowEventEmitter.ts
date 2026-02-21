// src/services/events/workflowEventEmitter.ts
// Client-side event emitter that delegates to server-side edge function
// for reliable workflow matching and execution (bypasses RLS issues).
// TODO: is bypassing RLS going to be a security issue?

import { supabase } from "@/services/base/supabase";

interface EventContext {
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  timestamp?: string;
  recruitId?: string;
  policyId?: string;
  commissionId?: string;
  agentId?: string;
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
    try {
      const { data, error } = await supabase.functions.invoke(
        "trigger-workflow-event",
        {
          body: { eventName, context },
        },
      );

      if (error) {
        console.error(
          `[EventEmitter] Edge function error for ${eventName}:`,
          error,
        );
        return {
          success: false,
          workflowsTriggered: 0,
          errors: [error.message || "Edge function invocation failed"],
        };
      }

      const result: EventEmissionResult = {
        success: data?.success ?? false,
        workflowsTriggered: data?.workflowsTriggered ?? 0,
        errors: data?.matches
          ?.filter(
            (m: { status: string; error?: string }) => m.status === "failed",
          )
          .map(
            (m: { workflowName: string; error?: string }) =>
              `${m.workflowName}: ${m.error}`,
          ),
      };

      if (
        typeof window !== "undefined" &&
        import.meta.env?.DEV &&
        result.workflowsTriggered > 0
      ) {
        const { toast } = await import("sonner");
        toast.success(
          `${result.workflowsTriggered} workflow(s) triggered by ${eventName}`,
        );
      }

      return result;
    } catch (error) {
      console.error(`[EventEmitter] Failed to emit ${eventName}:`, error);
      return {
        success: false,
        workflowsTriggered: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  
  async emitBatch(
    events: Array<{ eventName: string; context: EventContext }>,
  ): Promise<void> {
    for (const event of events) {
      await this.emit(event.eventName, event.context);
    }
  }
}

export const workflowEventEmitter = WorkflowEventEmitter.getInstance();

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
  POLICY_OVER_30_DAYS_NOT_ISSUED: "policy.over_30_days_not_issued",

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
