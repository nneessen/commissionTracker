// /home/nneessen/projects/commissionTracker/src/features/training-hub/utils/seedTriggerEvents.ts

// eslint-disable-next-line no-restricted-imports
import { supabase } from "@/services/base/supabase";

const triggerEventTypes = [
  // Recruiting events
  {
    event_name: "recruit.phase_changed",
    category: "recruiting",
    description: "Triggered when a recruit moves to a new phase",
    available_variables: {
      recruit_name: "string",
      old_phase: "string",
      new_phase: "string",
      phase_date: "date",
    },
    is_active: true,
  },
  {
    event_name: "recruit.document_uploaded",
    category: "recruiting",
    description: "Triggered when a recruit uploads a document",
    available_variables: {
      recruit_name: "string",
      document_name: "string",
      document_type: "string",
    },
    is_active: true,
  },
  {
    event_name: "recruit.checklist_completed",
    category: "recruiting",
    description: "Triggered when a recruit completes their checklist",
    available_variables: {
      recruit_name: "string",
      completion_date: "date",
      items_completed: "number",
    },
    is_active: true,
  },
  {
    event_name: "recruit.application_submitted",
    category: "recruiting",
    description: "Triggered when a recruit submits their application",
    available_variables: {
      recruit_name: "string",
      application_date: "date",
      status: "string",
    },
    is_active: true,
  },
  // Policy events
  {
    event_name: "policy.created",
    category: "policies",
    description: "Triggered when a new policy is created",
    available_variables: {
      policy_number: "string",
      client_name: "string",
      premium: "number",
      carrier: "string",
    },
    is_active: true,
  },
  {
    event_name: "policy.renewal_upcoming",
    category: "policies",
    description: "Triggered X days before policy renewal",
    available_variables: {
      policy_number: "string",
      client_name: "string",
      renewal_date: "date",
      days_until: "number",
    },
    is_active: true,
  },
  {
    event_name: "policy.cancelled",
    category: "policies",
    description: "Triggered when a policy is cancelled",
    available_variables: {
      policy_number: "string",
      client_name: "string",
      cancellation_date: "date",
      reason: "string",
    },
    is_active: true,
  },
  {
    event_name: "policy.status_changed",
    category: "policies",
    description: "Triggered when policy status changes",
    available_variables: {
      policy_number: "string",
      old_status: "string",
      new_status: "string",
      change_date: "date",
    },
    is_active: true,
  },
  // Commission events
  {
    event_name: "commission.received",
    category: "commissions",
    description: "Triggered when commission is received",
    available_variables: {
      amount: "number",
      policy_number: "string",
      carrier: "string",
      month: "string",
    },
    is_active: true,
  },
  {
    event_name: "commission.chargeback",
    category: "commissions",
    description: "Triggered when a chargeback occurs",
    available_variables: {
      amount: "number",
      policy_number: "string",
      reason: "string",
      chargeback_date: "date",
    },
    is_active: true,
  },
  {
    event_name: "commission.advance_paid",
    category: "commissions",
    description: "Triggered when an advance is paid out",
    available_variables: {
      amount: "number",
      agent_name: "string",
      advance_date: "date",
    },
    is_active: true,
  },
  {
    event_name: "commission.threshold_reached",
    category: "commissions",
    description: "Triggered when commission reaches a threshold",
    available_variables: {
      total_amount: "number",
      threshold: "number",
      period: "string",
    },
    is_active: true,
  },
  // Target events
  {
    event_name: "target.milestone_reached",
    category: "targets",
    description: "Triggered when reaching a target milestone",
    available_variables: {
      target_name: "string",
      milestone: "string",
      percentage: "number",
      amount: "number",
    },
    is_active: true,
  },
  {
    event_name: "target.weekly_progress",
    category: "targets",
    description: "Triggered weekly to report on target progress",
    available_variables: {
      target_name: "string",
      current_value: "number",
      target_value: "number",
      percentage: "number",
    },
    is_active: true,
  },
  {
    event_name: "target.monthly_summary",
    category: "targets",
    description: "Monthly summary of target progress",
    available_variables: {
      month: "string",
      targets_met: "number",
      targets_missed: "number",
      overall_percentage: "number",
    },
    is_active: true,
  },
  // Email events
  {
    event_name: "email.opened",
    category: "email",
    description: "Triggered when an email is opened",
    available_variables: {
      recipient_email: "string",
      subject: "string",
      opened_at: "datetime",
      template_id: "string",
    },
    is_active: true,
  },
  {
    event_name: "email.clicked",
    category: "email",
    description: "Triggered when a link in an email is clicked",
    available_variables: {
      recipient_email: "string",
      link_url: "string",
      clicked_at: "datetime",
      template_id: "string",
    },
    is_active: true,
  },
  {
    event_name: "email.bounced",
    category: "email",
    description: "Triggered when an email bounces",
    available_variables: {
      recipient_email: "string",
      bounce_type: "string",
      bounce_reason: "string",
    },
    is_active: true,
  },
  // Schedule events
  {
    event_name: "time.daily",
    category: "schedule",
    description: "Triggered daily at specified time",
    available_variables: {
      current_date: "date",
      day_of_week: "string",
      month: "string",
      year: "number",
    },
    is_active: true,
  },
  {
    event_name: "time.weekly",
    category: "schedule",
    description: "Triggered weekly on specified day",
    available_variables: {
      current_date: "date",
      week_number: "number",
      month: "string",
      year: "number",
    },
    is_active: true,
  },
  {
    event_name: "time.monthly",
    category: "schedule",
    description: "Triggered monthly on specified day",
    available_variables: {
      current_date: "date",
      month: "string",
      year: "number",
      day_of_month: "number",
    },
    is_active: true,
  },
  {
    event_name: "time.quarterly",
    category: "schedule",
    description: "Triggered quarterly",
    available_variables: {
      quarter: "number",
      year: "number",
      start_date: "date",
      end_date: "date",
    },
    is_active: true,
  },
];

export async function seedTriggerEventTypes() {
  console.log("Starting seed process for trigger_event_types...");

  try {
    // First, check if any events already exist
    const { data: existingEvents, error: checkError } = await supabase
      .from("trigger_event_types")
      .select("event_name");

    if (checkError) {
      console.error("Error checking existing events:", checkError);
      throw checkError;
    }

    console.log(`Found ${existingEvents?.length || 0} existing events`);

    // Insert all events using upsert
    const { data, error } = await supabase
      .from("trigger_event_types")
      .upsert(triggerEventTypes, {
        onConflict: "event_name",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error("Error inserting events:", error);
      throw error;
    }

    console.log(`✅ Successfully upserted ${data?.length || 0} event types`);

    // Verify the final count
    const { data: finalEvents, error: finalError } = await supabase
      .from("trigger_event_types")
      .select("event_name, category, description");

    if (finalError) {
      console.error("Error fetching final events:", finalError);
      throw finalError;
    }

    console.log(`\n✅ Total event types in database: ${finalEvents.length}`);

    // Group by category for summary
    const byCategory = finalEvents.reduce(
      (acc: Record<string, number>, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
      },
      {},
    );

    console.log("\nEvents by category:");
    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });

    return {
      success: true,
      total: finalEvents.length,
      byCategory,
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    throw error;
  }
}
