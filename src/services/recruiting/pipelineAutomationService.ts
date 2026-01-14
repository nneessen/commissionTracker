// src/services/recruiting/pipelineAutomationService.ts
// Service layer for pipeline automation communications

import {
  PipelineAutomationRepository,
  PipelineAutomationLogRepository,
} from "./repositories";
import type {
  PipelineAutomationEntity,
  CreatePipelineAutomationData,
  UpdatePipelineAutomationData,
  PipelineAutomationLogEntity,
} from "./repositories";
import type {
  PipelineAutomation,
  AutomationTriggerType,
  RecipientConfig,
  CreateAutomationInput,
  UpdateAutomationInput,
} from "@/types/recruiting.types";
import { emailService } from "@/services/email";
import { notificationService } from "@/services/notifications/notification/NotificationService";
import { smsService, isValidPhoneNumber } from "@/services/sms";
import { supabase } from "@/services/base/supabase";
import { processEmojiShortcodes } from "@/lib/emoji";

// Repository instances
const automationRepository = new PipelineAutomationRepository();
const automationLogRepository = new PipelineAutomationLogRepository();

// Context for variable substitution
export interface AutomationContext {
  // Recruit basic info
  recruitId: string;
  recruitName: string;
  recruitFirstName: string;
  recruitLastName: string;
  recruitEmail: string;
  recruitPhone?: string;
  // Recruit location
  recruitCity?: string;
  recruitState?: string;
  recruitZip?: string;
  recruitAddress?: string;
  // Recruit professional info
  recruitLicenseNumber?: string;
  recruitNpn?: string;
  recruitLicenseState?: string;
  contractLevel?: number;
  // Organization info
  agencyName?: string;
  imoName?: string;
  // Pipeline info
  phaseName?: string;
  templateName?: string;
  itemName?: string;
  // Upline info
  uplineName?: string;
  uplineFirstName?: string;
  uplineEmail?: string;
  uplinePhone?: string;
  // Calculated values
  daysInPhase?: number;
  daysSinceSignup?: number;
  currentDate?: string;
  portalLink?: string;
}

// Resolved recipients with email addresses, phone numbers, and user IDs
export interface ResolvedRecipients {
  emails: string[];
  phoneNumbers: string[];
  userIds: string[];
}

export const pipelineAutomationService = {
  // ========================================
  // CRUD Operations
  // ========================================

  /**
   * Get all automations for a phase
   */
  async getByPhaseId(phaseId: string): Promise<PipelineAutomation[]> {
    const entities = await automationRepository.findByPhaseId(phaseId);
    return entities.map(mapEntityToType);
  },

  /**
   * Get all automations for a checklist item
   */
  async getByChecklistItemId(itemId: string): Promise<PipelineAutomation[]> {
    const entities = await automationRepository.findByChecklistItemId(itemId);
    return entities.map(mapEntityToType);
  },

  /**
   * Get a single automation by ID
   */
  async getById(id: string): Promise<PipelineAutomation | null> {
    const entity = await automationRepository.findById(id);
    if (!entity) return null;
    return mapEntityToType(entity);
  },

  /**
   * Get all system-level automations (not tied to a phase or checklist item)
   * These are automations like password reminders that apply globally
   */
  async getSystemAutomations(): Promise<PipelineAutomation[]> {
    const entities = await automationRepository.findSystemAutomations();
    return entities.map(mapEntityToType);
  },

  /**
   * Create a new automation
   */
  async create(data: CreateAutomationInput): Promise<PipelineAutomation> {
    const createData: CreatePipelineAutomationData = {
      phaseId: data.phase_id,
      checklistItemId: data.checklist_item_id,
      imoId: data.imo_id,
      triggerType: data.trigger_type,
      communicationType: data.communication_type,
      delayDays: data.delay_days,
      recipients: data.recipients,
      emailTemplateId: data.email_template_id,
      emailSubject: data.email_subject,
      emailBodyHtml: data.email_body_html,
      notificationTitle: data.notification_title,
      notificationMessage: data.notification_message,
      smsMessage: data.sms_message,
    };
    const entity = await automationRepository.create(createData);
    return mapEntityToType(entity);
  },

  /**
   * Update an automation
   */
  async update(
    id: string,
    updates: UpdateAutomationInput,
  ): Promise<PipelineAutomation> {
    const updateData: UpdatePipelineAutomationData = {
      triggerType: updates.trigger_type,
      communicationType: updates.communication_type,
      delayDays: updates.delay_days,
      recipients: updates.recipients,
      emailTemplateId: updates.email_template_id,
      emailSubject: updates.email_subject,
      emailBodyHtml: updates.email_body_html,
      notificationTitle: updates.notification_title,
      notificationMessage: updates.notification_message,
      smsMessage: updates.sms_message,
      isActive: updates.is_active,
    };
    const entity = await automationRepository.update(id, updateData);
    return mapEntityToType(entity);
  },

  /**
   * Delete an automation
   */
  async delete(id: string): Promise<void> {
    await automationRepository.delete(id);
  },

  // ========================================
  // Trigger Execution
  // ========================================

  /**
   * Trigger phase-level automations
   */
  async triggerPhaseAutomations(
    phaseId: string,
    trigger: AutomationTriggerType,
    recruitId: string,
  ): Promise<void> {
    // Get active automations for this phase and trigger type
    const automations = await automationRepository.findByPhaseAndTrigger(
      phaseId,
      trigger,
    );

    if (automations.length === 0) return;

    // Build context for variable substitution
    const context = await this.buildContext(recruitId, phaseId);

    // Execute each automation
    for (const automation of automations) {
      await this.executeAutomation(automation, recruitId, context);
    }
  },

  /**
   * Trigger checklist item automations
   */
  async triggerItemAutomations(
    checklistItemId: string,
    trigger: AutomationTriggerType,
    recruitId: string,
  ): Promise<void> {
    // Get active automations for this item and trigger type
    const automations = await automationRepository.findByItemAndTrigger(
      checklistItemId,
      trigger,
    );

    if (automations.length === 0) return;

    // Get the phase ID from the checklist item for context
    const { data: item } = await supabase
      .from("phase_checklist_items")
      .select("phase_id, item_name")
      .eq("id", checklistItemId)
      .single();

    const phaseId = item?.phase_id;
    const itemName = item?.item_name;

    // Build context for variable substitution
    const context = await this.buildContext(recruitId, phaseId, itemName);

    // Execute each automation
    for (const automation of automations) {
      await this.executeAutomation(automation, recruitId, context);
    }
  },

  /**
   * Execute a single automation
   */
  async executeAutomation(
    automation: PipelineAutomationEntity,
    recruitId: string,
    context: AutomationContext,
  ): Promise<void> {
    // Check if already triggered today (prevents duplicates)
    const wasTriggered = await automationLogRepository.wasTriggeredToday(
      automation.id,
      recruitId,
    );

    if (wasTriggered) {
      console.log(
        `Automation ${automation.id} already triggered for recruit ${recruitId} today, skipping`,
      );
      return;
    }

    // Create pending log entry - handle race condition gracefully
    // If another request created an entry between our check and insert,
    // the unique constraint will throw and we catch it here
    let log;
    try {
      log = await automationLogRepository.create({
        automationId: automation.id,
        recruitId,
        status: "pending",
        metadata: { trigger: automation.triggerType, context },
      });
    } catch (error) {
      // Check if this is a unique constraint violation (duplicate entry)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("unique_daily_automation") ||
        errorMessage.includes("duplicate key") ||
        errorMessage.includes("23505") // PostgreSQL unique violation code
      ) {
        console.log(
          `Automation ${automation.id} already triggered for recruit ${recruitId} today (race condition handled)`,
        );
        return;
      }
      // Re-throw if it's a different error
      throw error;
    }

    try {
      // Resolve recipients
      const recipients = await this.resolveRecipients(
        automation.recipients,
        recruitId,
      );

      // Send communications based on type
      const communicationType = automation.communicationType || "both";
      const shouldSendEmail = ["email", "both", "all"].includes(
        communicationType,
      );
      const shouldSendNotification = ["notification", "both", "all"].includes(
        communicationType,
      );
      const shouldSendSms = ["sms", "all"].includes(communicationType);

      // Send Email
      if (shouldSendEmail) {
        if (recipients.emails.length > 0 && automation.emailSubject) {
          const emailBody = this.substituteVariables(
            automation.emailBodyHtml || "",
            context,
          );
          const emailSubject = this.substituteVariables(
            automation.emailSubject,
            context,
          );

          await emailService.sendEmail({
            to: recipients.emails,
            subject: emailSubject,
            html: emailBody,
            from: "The Standard HQ <noreply@updates.thestandardhq.com>",
            recruitId,
            metadata: {
              automationId: automation.id,
              trigger: automation.triggerType,
            },
          });
        }
      }

      // Send In-App Notification
      if (shouldSendNotification) {
        if (recipients.userIds.length > 0 && automation.notificationTitle) {
          const notificationMessage = this.substituteVariables(
            automation.notificationMessage || "",
            context,
          );
          const notificationTitle = this.substituteVariables(
            automation.notificationTitle,
            context,
          );

          // Create notification for each recipient
          for (const userId of recipients.userIds) {
            await notificationService.create({
              user_id: userId,
              type: "pipeline_automation",
              title: notificationTitle,
              message: notificationMessage,
              metadata: {
                automationId: automation.id,
                recruitId,
                trigger: automation.triggerType,
              },
            });
          }
        }
      }

      // Send SMS via Twilio
      if (shouldSendSms) {
        if (recipients.phoneNumbers.length > 0 && automation.smsMessage) {
          const smsMessage = this.substituteVariables(
            automation.smsMessage,
            context,
          );

          // Send SMS to each recipient
          for (const phoneNumber of recipients.phoneNumbers) {
            try {
              const result = await smsService.sendSms({
                to: phoneNumber,
                message: smsMessage,
                recruitId,
                automationId: automation.id,
                trigger: automation.triggerType,
              });

              if (!result.success) {
                console.warn(
                  `[pipelineAutomation] SMS failed for ${phoneNumber}: ${result.error}`,
                );
              }
            } catch (smsError) {
              console.error(
                `[pipelineAutomation] SMS error for ${phoneNumber}:`,
                smsError,
              );
              // Continue with other recipients even if one fails
            }
          }
        }
      }

      // Update log to sent
      await automationLogRepository.update(log.id, {
        status: "sent",
        metadata: {
          ...((log.metadata as Record<string, unknown>) || {}),
          recipientEmails: recipients.emails,
          recipientPhones: recipients.phoneNumbers,
          recipientUserIds: recipients.userIds,
        },
      });
    } catch (error) {
      // Update log to failed
      await automationLogRepository.update(log.id, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      console.error(`Failed to execute automation ${automation.id}:`, error);
    }
  },

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Build context for variable substitution
   * Fetches all relevant data for template variable replacement
   */
  async buildContext(
    recruitId: string,
    phaseId?: string | null,
    itemName?: string,
  ): Promise<AutomationContext> {
    // Get recruit info with upline, agency, and IMO in single query
    const { data: recruit } = await supabase
      .from("user_profiles")
      .select(
        `
        first_name,
        last_name,
        email,
        phone,
        city,
        state,
        zip,
        street_address,
        license_number,
        npn,
        resident_state,
        contract_level,
        created_at,
        upline_id,
        agency_id,
        imo_id,
        pipeline_template_id,
        upline:user_profiles!upline_id(first_name, last_name, email, phone),
        agency:agencies!agency_id(name),
        imo:imos!imo_id(name)
      `,
      )
      .eq("id", recruitId)
      .single();

    let uplineName: string | undefined;
    let uplineFirstName: string | undefined;
    let uplineEmail: string | undefined;
    let uplinePhone: string | undefined;

    // Extract upline info from joined query
    if (recruit?.upline) {
      const uplineData = Array.isArray(recruit.upline)
        ? recruit.upline[0]
        : recruit.upline;
      if (uplineData && typeof uplineData === "object") {
        const upline = uplineData as {
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
        };
        uplineName = `${upline.first_name} ${upline.last_name}`;
        uplineFirstName = upline.first_name;
        uplineEmail = upline.email;
        uplinePhone = upline.phone || undefined;
      }
    }

    // Extract agency name
    let agencyName: string | undefined;
    if (recruit?.agency) {
      const agencyData = Array.isArray(recruit.agency)
        ? recruit.agency[0]
        : recruit.agency;
      if (agencyData && typeof agencyData === "object") {
        agencyName = (agencyData as { name: string }).name;
      }
    }

    // Extract IMO name
    let imoName: string | undefined;
    if (recruit?.imo) {
      const imoData = Array.isArray(recruit.imo) ? recruit.imo[0] : recruit.imo;
      if (imoData && typeof imoData === "object") {
        imoName = (imoData as { name: string }).name;
      }
    }

    let phaseName: string | undefined;
    let templateName: string | undefined;
    let daysInPhase: number | undefined;

    // Get phase info with progress and template name
    if (phaseId) {
      const [phaseResult, progressResult] = await Promise.all([
        supabase
          .from("pipeline_phases")
          .select("phase_name, template:pipeline_templates!template_id(name)")
          .eq("id", phaseId)
          .single(),
        supabase
          .from("recruit_phase_progress")
          .select("started_at")
          .eq("user_id", recruitId)
          .eq("phase_id", phaseId)
          .maybeSingle(),
      ]);

      phaseName = phaseResult.data?.phase_name;

      // Extract template name
      if (phaseResult.data?.template) {
        const templateData = Array.isArray(phaseResult.data.template)
          ? phaseResult.data.template[0]
          : phaseResult.data.template;
        if (templateData && typeof templateData === "object") {
          templateName = (templateData as { name: string }).name;
        }
      }

      if (progressResult.data?.started_at) {
        const startDate = new Date(progressResult.data.started_at);
        const now = new Date();
        daysInPhase = Math.floor(
          (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }
    } else if (recruit?.pipeline_template_id) {
      // If no phaseId, try to get template name from recruit's assigned template
      const { data: template } = await supabase
        .from("pipeline_templates")
        .select("name")
        .eq("id", recruit.pipeline_template_id)
        .single();
      templateName = template?.name;
    }

    // Calculate days since signup
    let daysSinceSignup: number | undefined;
    if (recruit?.created_at) {
      const createdDate = new Date(recruit.created_at);
      const now = new Date();
      daysSinceSignup = Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    // Format current date
    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Build full address if components exist
    let recruitAddress: string | undefined;
    if (recruit?.street_address || recruit?.city || recruit?.state) {
      const parts = [
        recruit.street_address,
        recruit.city,
        recruit.state && recruit.zip
          ? `${recruit.state} ${recruit.zip}`
          : recruit.state || recruit.zip,
      ].filter(Boolean);
      recruitAddress = parts.join(", ");
    }

    // Use environment variable for base URL, fallback to relative path
    const baseUrl =
      import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_URL || "";
    const portalLink = baseUrl
      ? `${baseUrl}/recruiting/recruit/${recruitId}`
      : `/recruiting/recruit/${recruitId}`;

    return {
      recruitId,
      recruitName: recruit
        ? `${recruit.first_name} ${recruit.last_name}`
        : "Recruit",
      recruitFirstName: recruit?.first_name || "Recruit",
      recruitLastName: recruit?.last_name || "",
      recruitEmail: recruit?.email || "",
      recruitPhone: recruit?.phone || undefined,
      // Location
      recruitCity: recruit?.city || undefined,
      recruitState: recruit?.state || undefined,
      recruitZip: recruit?.zip || undefined,
      recruitAddress,
      // Professional
      recruitLicenseNumber: recruit?.license_number || undefined,
      recruitNpn: recruit?.npn || undefined,
      recruitLicenseState: recruit?.resident_state || undefined,
      contractLevel: recruit?.contract_level ?? undefined,
      // Organization
      agencyName,
      imoName,
      // Pipeline
      phaseName,
      templateName,
      itemName,
      // Upline
      uplineName,
      uplineFirstName,
      uplineEmail,
      uplinePhone,
      // Calculated
      daysInPhase,
      daysSinceSignup,
      currentDate,
      portalLink,
    };
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Resolve recipient configs to actual email addresses, phone numbers, and user IDs
   * Optimized to batch database queries instead of N+1 pattern
   */
  async resolveRecipients(
    recipients: RecipientConfig[],
    recruitId: string,
  ): Promise<ResolvedRecipients> {
    const emails: string[] = [];
    const phoneNumbers: string[] = [];
    const userIds: string[] = [];

    // Determine which user IDs we need to fetch
    const recipientTypes = new Set(recipients.map((r) => r.type));

    // Get recruit info (note: key_contacts column doesn't exist yet, trainer/contracting_manager not supported)
    const { data: recruit, error: recruitError } = await supabase
      .from("user_profiles")
      .select("id, email, phone, upline_id")
      .eq("id", recruitId)
      .single();

    if (recruitError || !recruit) {
      console.warn(
        `Recruit ${recruitId} not found for automation:`,
        recruitError?.message,
      );
      return { emails: [], phoneNumbers: [], userIds: [] };
    }

    // Collect all user IDs we need to fetch
    const userIdsToFetch: string[] = [];

    if (recipientTypes.has("upline") && recruit.upline_id) {
      userIdsToFetch.push(recruit.upline_id);
    }

    // Note: trainer and contracting_manager recipients are not yet supported
    // The key_contacts column doesn't exist in user_profiles
    if (recipientTypes.has("trainer")) {
      console.warn(
        "[pipelineAutomation] trainer recipient type not yet supported (key_contacts column missing)",
      );
    }
    if (recipientTypes.has("contracting_manager")) {
      console.warn(
        "[pipelineAutomation] contracting_manager recipient type not yet supported (key_contacts column missing)",
      );
    }

    // Batch fetch all needed users in single query (include phone for SMS)
    let userMap: Map<
      string,
      { id: string; email: string; phone: string | null }
    > = new Map();
    if (userIdsToFetch.length > 0) {
      const { data: users } = await supabase
        .from("user_profiles")
        .select("id, email, phone")
        .in("id", userIdsToFetch);

      if (users) {
        userMap = new Map(
          users.map((u) => [
            u.id,
            { id: u.id, email: u.email, phone: u.phone },
          ]),
        );
      }
    }

    // Now resolve recipients using the fetched data
    for (const recipient of recipients) {
      switch (recipient.type) {
        case "recruit":
          if (recruit.email && this.isValidEmail(recruit.email)) {
            emails.push(recruit.email);
          } else if (!recruit.email) {
            console.warn(
              `[pipelineAutomation] Recruit ${recruitId} has no email address, skipping email send`,
            );
          } else {
            console.warn(
              `[pipelineAutomation] Recruit ${recruitId} email invalid: ${recruit.email}`,
            );
          }
          if (recruit.phone && isValidPhoneNumber(recruit.phone)) {
            phoneNumbers.push(recruit.phone);
          }
          userIds.push(recruitId);
          break;

        case "upline":
          if (recruit.upline_id) {
            const upline = userMap.get(recruit.upline_id);
            if (upline) {
              if (upline.email && this.isValidEmail(upline.email)) {
                emails.push(upline.email);
              } else if (!upline.email) {
                console.warn(
                  `[pipelineAutomation] Upline ${recruit.upline_id} has no email address, skipping email send`,
                );
              } else {
                console.warn(
                  `[pipelineAutomation] Upline ${recruit.upline_id} email invalid: ${upline.email}`,
                );
              }
              if (upline.phone && isValidPhoneNumber(upline.phone)) {
                phoneNumbers.push(upline.phone);
              }
              userIds.push(upline.id);
            } else {
              console.warn(
                `[pipelineAutomation] Upline ${recruit.upline_id} not found in database`,
              );
            }
          } else {
            console.warn(
              `[pipelineAutomation] Recruit ${recruitId} has no upline_id, skipping upline recipient`,
            );
          }
          break;

        case "trainer":
          // Not yet supported - key_contacts column doesn't exist
          // Warning logged above
          break;

        case "contracting_manager":
          // Not yet supported - key_contacts column doesn't exist
          // Warning logged above
          break;

        case "custom_email":
          if (recipient.emails && recipient.emails.length > 0) {
            // Validate each custom email
            const validEmails = recipient.emails.filter((email) => {
              const isValid = this.isValidEmail(email);
              if (!isValid) {
                console.warn(`Invalid custom email skipped: ${email}`);
              }
              return isValid;
            });
            emails.push(...validEmails);
            // Custom emails don't have phone numbers or user IDs
          }
          break;
      }
    }

    // Remove duplicates
    return {
      emails: [...new Set(emails)],
      phoneNumbers: [...new Set(phoneNumbers)],
      userIds: [...new Set(userIds)],
    };
  },

  /**
   * Substitute template variables in content
   * Supports {{variable}} syntax and :emoji: shortcodes
   */
  substituteVariables(template: string, context: AutomationContext): string {
    let result = template;

    const replacements: Record<string, string> = {
      // Recruit basic info
      "{{recruit_name}}": context.recruitName,
      "{{recruit_first_name}}": context.recruitFirstName,
      "{{recruit_last_name}}": context.recruitLastName,
      "{{recruit_email}}": context.recruitEmail,
      "{{recruit_phone}}": context.recruitPhone || "",
      // Recruit location
      "{{recruit_city}}": context.recruitCity || "",
      "{{recruit_state}}": context.recruitState || "",
      "{{recruit_zip}}": context.recruitZip || "",
      "{{recruit_address}}": context.recruitAddress || "",
      // Recruit professional
      "{{recruit_license_number}}": context.recruitLicenseNumber || "",
      "{{recruit_npn}}": context.recruitNpn || "",
      "{{recruit_license_state}}": context.recruitLicenseState || "",
      "{{contract_level}}": context.contractLevel?.toString() || "",
      // Organization
      "{{agency_name}}": context.agencyName || "",
      "{{imo_name}}": context.imoName || "",
      // Pipeline
      "{{phase_name}}": context.phaseName || "",
      "{{template_name}}": context.templateName || "",
      "{{item_name}}": context.itemName || "",
      // Upline
      "{{upline_name}}": context.uplineName || "",
      "{{upline_first_name}}": context.uplineFirstName || "",
      "{{upline_email}}": context.uplineEmail || "",
      "{{upline_phone}}": context.uplinePhone || "",
      // Calculated
      "{{days_in_phase}}": context.daysInPhase?.toString() || "0",
      "{{days_since_signup}}": context.daysSinceSignup?.toString() || "0",
      "{{current_date}}": context.currentDate || "",
      "{{portal_link}}": context.portalLink || "",
    };

    // Replace all template variables
    for (const [variable, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(variable, "g"), value);
    }

    // Process emoji shortcodes (:emoji: syntax)
    result = processEmojiShortcodes(result);

    return result;
  },

  // ========================================
  // Log Operations
  // ========================================

  /**
   * Get automation logs for a recruit
   */
  async getLogsForRecruit(
    recruitId: string,
  ): Promise<PipelineAutomationLogEntity[]> {
    return automationLogRepository.findByRecruitId(recruitId);
  },

  /**
   * Get automation logs for an automation
   */
  async getLogsForAutomation(
    automationId: string,
  ): Promise<PipelineAutomationLogEntity[]> {
    return automationLogRepository.findByAutomationId(automationId);
  },
};

// ========================================
// Mapping Functions
// ========================================

function mapEntityToType(entity: PipelineAutomationEntity): PipelineAutomation {
  return {
    id: entity.id,
    phase_id: entity.phaseId,
    checklist_item_id: entity.checklistItemId,
    imo_id: entity.imoId,
    trigger_type: entity.triggerType,
    communication_type: entity.communicationType,
    delay_days: entity.delayDays,
    recipients: entity.recipients,
    email_template_id: entity.emailTemplateId,
    email_subject: entity.emailSubject,
    email_body_html: entity.emailBodyHtml,
    notification_title: entity.notificationTitle,
    notification_message: entity.notificationMessage,
    sms_message: entity.smsMessage,
    sender_type: entity.senderType,
    sender_email: entity.senderEmail,
    sender_name: entity.senderName,
    is_active: entity.isActive,
    created_at: entity.createdAt || new Date().toISOString(),
    updated_at: entity.updatedAt || new Date().toISOString(),
  };
}
