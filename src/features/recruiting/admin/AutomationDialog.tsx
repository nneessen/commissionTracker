// src/features/recruiting/admin/AutomationDialog.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, X, Mail, Bell, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateAutomation,
  useUpdateAutomation,
} from "../hooks/usePipelineAutomations";
import type {
  PipelineAutomation,
  AutomationTriggerType,
  AutomationCommunicationType,
  AutomationRecipientType,
  AutomationSenderType,
  RecipientConfig,
  CreateAutomationInput,
} from "@/types/recruiting.types";

interface AutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseId?: string;
  checklistItemId?: string;
  editingAutomation?: PipelineAutomation | null;
}

// All phase-level triggers
const PHASE_TRIGGERS: {
  value: AutomationTriggerType;
  label: string;
  description: string;
}[] = [
  {
    value: "phase_enter",
    label: "When Recruit Enters Phase",
    description: "Triggers when a recruit first enters this phase",
  },
  {
    value: "phase_complete",
    label: "When Recruit Completes Phase",
    description: "Triggers when all required items in this phase are completed",
  },
  {
    value: "phase_stall",
    label: "Stall Reminder",
    description: "Triggers after X days of no progress in this phase",
  },
];

// All item-level triggers
const ITEM_TRIGGERS: {
  value: AutomationTriggerType;
  label: string;
  description: string;
}[] = [
  {
    value: "item_complete",
    label: "When Item is Completed",
    description: "Triggers when this checklist item is marked complete",
  },
  {
    value: "item_approval_needed",
    label: "When Approval is Needed",
    description: "Triggers when item needs manager or upline approval",
  },
  {
    value: "item_deadline_approaching",
    label: "Deadline Reminder",
    description: "Triggers X days before the item deadline",
  },
];

// All recipient options
const RECIPIENT_OPTIONS: {
  value: AutomationRecipientType;
  label: string;
  description: string;
}[] = [
  {
    value: "recruit",
    label: "Recruit",
    description: "The recruit being onboarded",
  },
  {
    value: "upline",
    label: "Upline/Recruiter",
    description: "The recruit's assigned upline",
  },
  {
    value: "trainer",
    label: "Trainer",
    description: "Assigned trainer (if any)",
  },
  {
    value: "contracting_manager",
    label: "Contracting Mgr",
    description: "Contracting manager",
  },
  {
    value: "custom_email",
    label: "Custom Email(s)",
    description: "Specific email addresses",
  },
];

// Communication type options with SMS
const COMMUNICATION_OPTIONS: {
  value: AutomationCommunicationType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "email", label: "Email", icon: <Mail className="h-3 w-3" /> },
  {
    value: "notification",
    label: "Notification",
    icon: <Bell className="h-3 w-3" />,
  },
  { value: "sms", label: "SMS", icon: <MessageSquare className="h-3 w-3" /> },
  { value: "both", label: "Email + Notification", icon: null },
  { value: "all", label: "All Channels", icon: null },
];

// Sender type options - who the communication comes FROM
const SENDER_OPTIONS: {
  value: AutomationSenderType;
  label: string;
  description: string;
}[] = [
  {
    value: "system",
    label: "System",
    description: "Default system email/sender",
  },
  {
    value: "upline",
    label: "Upline/Recruiter",
    description: "Recruit's assigned upline",
  },
  {
    value: "trainer",
    label: "Trainer",
    description: "Assigned trainer (if any)",
  },
  {
    value: "contracting_manager",
    label: "Contracting Mgr",
    description: "Contracting manager",
  },
  {
    value: "custom",
    label: "Custom Sender",
    description: "Specify custom email/name",
  },
];

// Template variable categories for organized display
const TEMPLATE_VARIABLE_CATEGORIES = [
  {
    category: "Recruit Info",
    variables: [
      {
        variable: "{{recruit_name}}",
        description: "Full name",
        example: "John Smith",
      },
      {
        variable: "{{recruit_first_name}}",
        description: "First name",
        example: "John",
      },
      {
        variable: "{{recruit_last_name}}",
        description: "Last name",
        example: "Smith",
      },
      {
        variable: "{{recruit_email}}",
        description: "Email address",
        example: "john@email.com",
      },
      {
        variable: "{{recruit_phone}}",
        description: "Phone number",
        example: "(555) 123-4567",
      },
    ],
  },
  {
    category: "Location",
    variables: [
      { variable: "{{recruit_city}}", description: "City", example: "Dallas" },
      { variable: "{{recruit_state}}", description: "State", example: "TX" },
      {
        variable: "{{recruit_zip}}",
        description: "ZIP code",
        example: "75001",
      },
      {
        variable: "{{recruit_address}}",
        description: "Full address",
        example: "123 Main St, Dallas, TX 75001",
      },
    ],
  },
  {
    category: "Professional",
    variables: [
      {
        variable: "{{recruit_license_number}}",
        description: "License number",
        example: "1234567",
      },
      { variable: "{{recruit_npn}}", description: "NPN", example: "9876543" },
      {
        variable: "{{recruit_license_state}}",
        description: "License state",
        example: "TX",
      },
      {
        variable: "{{contract_level}}",
        description: "Contract level",
        example: "75",
      },
    ],
  },
  {
    category: "Organization",
    variables: [
      {
        variable: "{{agency_name}}",
        description: "Agency name",
        example: "ABC Insurance",
      },
      {
        variable: "{{imo_name}}",
        description: "IMO name",
        example: "Premier IMO",
      },
    ],
  },
  {
    category: "Pipeline",
    variables: [
      {
        variable: "{{phase_name}}",
        description: "Current phase",
        example: "Contracting",
      },
      {
        variable: "{{template_name}}",
        description: "Pipeline template",
        example: "New Agent Onboarding",
      },
      {
        variable: "{{item_name}}",
        description: "Checklist item",
        example: "Submit W-9",
      },
    ],
  },
  {
    category: "Upline",
    variables: [
      {
        variable: "{{upline_name}}",
        description: "Full name",
        example: "Jane Doe",
      },
      {
        variable: "{{upline_first_name}}",
        description: "First name",
        example: "Jane",
      },
      {
        variable: "{{upline_email}}",
        description: "Email",
        example: "jane@email.com",
      },
      {
        variable: "{{upline_phone}}",
        description: "Phone",
        example: "(555) 987-6543",
      },
    ],
  },
  {
    category: "Dates & Numbers",
    variables: [
      {
        variable: "{{current_date}}",
        description: "Today's date",
        example: "Monday, January 15, 2025",
      },
      {
        variable: "{{days_in_phase}}",
        description: "Days in current phase",
        example: "5",
      },
      {
        variable: "{{days_since_signup}}",
        description: "Days since signup",
        example: "30",
      },
    ],
  },
  {
    category: "Links",
    variables: [
      {
        variable: "{{portal_link}}",
        description: "Recruit portal link",
        example: "https://...",
      },
    ],
  },
];

// Flat list for backward compatibility (used by other components that import this)
const _TEMPLATE_VARIABLES = TEMPLATE_VARIABLE_CATEGORIES.flatMap(
  (cat) => cat.variables,
);
export { _TEMPLATE_VARIABLES as TEMPLATE_VARIABLES };

// Common emoji shortcodes for quick reference
const EMOJI_SHORTCUTS = [
  { code: ":tada:", emoji: "🎉", label: "Celebration" },
  { code: ":fire:", emoji: "🔥", label: "Fire" },
  { code: ":rocket:", emoji: "🚀", label: "Rocket" },
  { code: ":star:", emoji: "⭐", label: "Star" },
  { code: ":sparkles:", emoji: "✨", label: "Sparkles" },
  { code: ":100:", emoji: "💯", label: "100" },
  { code: ":thumbsup:", emoji: "👍", label: "Thumbs up" },
  { code: ":clap:", emoji: "👏", label: "Clap" },
  { code: ":wave:", emoji: "👋", label: "Wave" },
  { code: ":trophy:", emoji: "🏆", label: "Trophy" },
  { code: ":white_check_mark:", emoji: "✅", label: "Check" },
  { code: ":bell:", emoji: "🔔", label: "Bell" },
  { code: ":moneybag:", emoji: "💰", label: "Money bag" },
  { code: ":handshake:", emoji: "🤝", label: "Handshake" },
  { code: ":chart_with_upwards_trend:", emoji: "📈", label: "Chart up" },
];

// Email validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AutomationDialog({
  open,
  onOpenChange,
  phaseId,
  checklistItemId,
  editingAutomation,
}: AutomationDialogProps) {
  const createAutomation = useCreateAutomation();
  const updateAutomation = useUpdateAutomation();

  const isEditing = !!editingAutomation;
  const isPhaseLevel = !!phaseId && !checklistItemId;
  const triggers = isPhaseLevel ? PHASE_TRIGGERS : ITEM_TRIGGERS;

  // Refs for text inputs to enable insert-at-cursor
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailBodyRef = useRef<HTMLTextAreaElement>(null);
  const notificationTitleRef = useRef<HTMLInputElement>(null);
  const notificationMessageRef = useRef<HTMLTextAreaElement>(null);
  const smsMessageRef = useRef<HTMLTextAreaElement>(null);

  // Track which field was last focused for variable insertion
  const [lastFocusedField, setLastFocusedField] = useState<
    | "emailSubject"
    | "emailBody"
    | "notificationTitle"
    | "notificationMessage"
    | "smsMessage"
    | null
  >(null);

  // Form state
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>(
    triggers[0].value,
  );
  const [communicationType, setCommunicationType] =
    useState<AutomationCommunicationType>("both");
  const [delayDays, setDelayDays] = useState<number>(7);
  const [recipients, setRecipients] = useState<RecipientConfig[]>([
    { type: "recruit" },
  ]);
  const [customEmails, setCustomEmails] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");
  const [notificationTitle, setNotificationTitle] = useState<string>("");
  const [notificationMessage, setNotificationMessage] = useState<string>("");
  const [smsMessage, setSmsMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("email");
  const [senderType, setSenderType] = useState<AutomationSenderType>("system");
  const [senderEmail, setSenderEmail] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");

  // Determine which content sections to show
  const showEmail = ["email", "both", "all"].includes(communicationType);
  const showNotification = ["notification", "both", "all"].includes(
    communicationType,
  );
  const showSms = ["sms", "all"].includes(communicationType);

  // Reset form when dialog opens/closes or when editing changes
  useEffect(() => {
    if (open) {
      if (editingAutomation) {
        setTriggerType(editingAutomation.trigger_type);
        setCommunicationType(editingAutomation.communication_type);
        setDelayDays(editingAutomation.delay_days || 7);
        setRecipients(editingAutomation.recipients);
        setEmailSubject(editingAutomation.email_subject || "");
        setEmailBody(editingAutomation.email_body_html || "");
        setNotificationTitle(editingAutomation.notification_title || "");
        setNotificationMessage(editingAutomation.notification_message || "");
        setSmsMessage(editingAutomation.sms_message || "");
        setSenderType(editingAutomation.sender_type || "system");
        setSenderEmail(editingAutomation.sender_email || "");
        setSenderName(editingAutomation.sender_name || "");

        const customRecipient = editingAutomation.recipients.find(
          (r) => r.type === "custom_email",
        );
        if (customRecipient?.emails) {
          setCustomEmails(customRecipient.emails.join(", "));
        } else {
          setCustomEmails("");
        }

        // Set initial tab based on communication type
        if (editingAutomation.communication_type === "sms") {
          setActiveTab("sms");
        } else if (editingAutomation.communication_type === "notification") {
          setActiveTab("notification");
        } else {
          setActiveTab("email");
        }
      } else {
        // Reset to defaults
        setTriggerType(triggers[0].value);
        setCommunicationType("both");
        setDelayDays(7);
        setRecipients([{ type: "recruit" }]);
        setCustomEmails("");
        setEmailSubject("");
        setEmailBody("");
        setNotificationTitle("");
        setNotificationMessage("");
        setSmsMessage("");
        setActiveTab("email");
        setSenderType("system");
        setSenderEmail("");
        setSenderName("");
      }
    }
  }, [open, editingAutomation, triggers]);

  // Update active tab when communication type changes
  useEffect(() => {
    if (communicationType === "sms") {
      setActiveTab("sms");
    } else if (communicationType === "notification") {
      setActiveTab("notification");
    } else if (communicationType === "email") {
      setActiveTab("email");
    }
    // For "both" and "all", keep current tab if valid, otherwise default to email
    else if (!["email", "notification", "sms"].includes(activeTab)) {
      setActiveTab("email");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger on communicationType change
  }, [communicationType]);

  const handleRecipientToggle = (type: AutomationRecipientType) => {
    const exists = recipients.some((r) => r.type === type);
    if (exists) {
      setRecipients(recipients.filter((r) => r.type !== type));
    } else {
      setRecipients([...recipients, { type }]);
    }
  };

  const needsDelayDays =
    triggerType === "phase_stall" ||
    triggerType === "item_deadline_approaching";

  // Insert variable at cursor position in the last focused field
  const insertVariable = useCallback(
    (variable: string) => {
      const insertIntoField = (
        ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
        value: string,
        setValue: (v: string) => void,
      ) => {
        const el = ref.current;
        if (!el) return false;

        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const newValue = value.slice(0, start) + variable + value.slice(end);
        setValue(newValue);

        // Restore focus and set cursor position after the inserted variable
        requestAnimationFrame(() => {
          el.focus();
          const newPos = start + variable.length;
          el.setSelectionRange(newPos, newPos);
        });
        return true;
      };

      // Try to insert into the last focused field
      let inserted = false;
      switch (lastFocusedField) {
        case "emailSubject":
          inserted = insertIntoField(
            emailSubjectRef,
            emailSubject,
            setEmailSubject,
          );
          break;
        case "emailBody":
          inserted = insertIntoField(emailBodyRef, emailBody, setEmailBody);
          break;
        case "notificationTitle":
          inserted = insertIntoField(
            notificationTitleRef,
            notificationTitle,
            setNotificationTitle,
          );
          break;
        case "notificationMessage":
          inserted = insertIntoField(
            notificationMessageRef,
            notificationMessage,
            setNotificationMessage,
          );
          break;
        case "smsMessage":
          inserted = insertIntoField(smsMessageRef, smsMessage, setSmsMessage);
          break;
      }

      // If no field was focused or insertion failed, default to email body based on active tab
      if (!inserted) {
        if (activeTab === "email" && showEmail) {
          insertIntoField(emailBodyRef, emailBody, setEmailBody);
        } else if (activeTab === "notification" && showNotification) {
          insertIntoField(
            notificationMessageRef,
            notificationMessage,
            setNotificationMessage,
          );
        } else if (activeTab === "sms" && showSms) {
          insertIntoField(smsMessageRef, smsMessage, setSmsMessage);
        } else {
          // Fallback: copy to clipboard
          navigator.clipboard.writeText(variable);
          toast.success("Copied to clipboard");
        }
      }
    },
    [
      lastFocusedField,
      activeTab,
      showEmail,
      showNotification,
      showSms,
      emailSubject,
      emailBody,
      notificationTitle,
      notificationMessage,
      smsMessage,
    ],
  );

  const handleSave = async () => {
    // Validation
    if (recipients.length === 0) {
      toast.error("At least one recipient is required");
      return;
    }

    const hasCustomEmail = recipients.some((r) => r.type === "custom_email");
    if (hasCustomEmail) {
      if (!customEmails.trim()) {
        toast.error("Custom email addresses are required");
        return;
      }
      const emails = customEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e);
      const invalidEmails = emails.filter((e) => !isValidEmail(e));
      if (invalidEmails.length > 0) {
        toast.error(`Invalid email(s): ${invalidEmails.join(", ")}`);
        return;
      }
    }

    // Validate required content based on communication type
    if (showEmail && !emailSubject.trim()) {
      toast.error("Email subject is required");
      return;
    }

    if (showNotification && !notificationTitle.trim()) {
      toast.error("Notification title is required");
      return;
    }

    if (showSms && !smsMessage.trim()) {
      toast.error("SMS message is required");
      return;
    }

    // Validate custom sender email
    if (senderType === "custom" && !senderEmail.trim()) {
      toast.error("Custom sender email is required");
      return;
    }
    if (
      senderType === "custom" &&
      senderEmail.trim() &&
      !isValidEmail(senderEmail.trim())
    ) {
      toast.error("Invalid custom sender email");
      return;
    }

    // Build recipients array with custom emails if present
    const finalRecipients: RecipientConfig[] = recipients.map((r) => {
      if (r.type === "custom_email") {
        return {
          type: r.type,
          emails: customEmails
            .split(",")
            .map((e) => e.trim())
            .filter((e) => e && isValidEmail(e)),
        };
      }
      return r;
    });

    try {
      if (isEditing && editingAutomation) {
        await updateAutomation.mutateAsync({
          id: editingAutomation.id,
          updates: {
            trigger_type: triggerType,
            communication_type: communicationType,
            delay_days: needsDelayDays ? delayDays : undefined,
            recipients: finalRecipients,
            email_subject: showEmail ? emailSubject || undefined : undefined,
            email_body_html: showEmail ? emailBody || undefined : undefined,
            notification_title: showNotification
              ? notificationTitle || undefined
              : undefined,
            notification_message: showNotification
              ? notificationMessage || undefined
              : undefined,
            sms_message: showSms ? smsMessage || undefined : undefined,
            sender_type: senderType,
            sender_email:
              senderType === "custom"
                ? senderEmail.trim() || undefined
                : undefined,
            sender_name: senderName.trim() || undefined,
          },
        });
        toast.success("Automation updated");
      } else {
        const data: CreateAutomationInput = {
          phase_id: phaseId,
          checklist_item_id: checklistItemId,
          trigger_type: triggerType,
          communication_type: communicationType,
          delay_days: needsDelayDays ? delayDays : undefined,
          recipients: finalRecipients,
          email_subject: showEmail ? emailSubject || undefined : undefined,
          email_body_html: showEmail ? emailBody || undefined : undefined,
          notification_title: showNotification
            ? notificationTitle || undefined
            : undefined,
          notification_message: showNotification
            ? notificationMessage || undefined
            : undefined,
          sms_message: showSms ? smsMessage || undefined : undefined,
          sender_type: senderType,
          sender_email:
            senderType === "custom"
              ? senderEmail.trim() || undefined
              : undefined,
          sender_name: senderName.trim() || undefined,
        };
        await createAutomation.mutateAsync(data);
        toast.success("Automation created");
      }
      onOpenChange(false);
    } catch (_error) {
      toast.error(
        isEditing
          ? "Failed to update automation"
          : "Failed to create automation",
      );
    }
  };

  const isPending = createAutomation.isPending || updateAutomation.isPending;

  // Get available tabs based on communication type
  const availableTabs = [];
  if (showEmail)
    availableTabs.push({
      value: "email",
      label: "Email",
      icon: <Mail className="h-3 w-3" />,
    });
  if (showNotification)
    availableTabs.push({
      value: "notification",
      label: "Notification",
      icon: <Bell className="h-3 w-3" />,
    });
  if (showSms)
    availableTabs.push({
      value: "sms",
      label: "SMS",
      icon: <MessageSquare className="h-3 w-3" />,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0">
        <div className="flex">
          {/* LEFT COLUMN - Settings */}
          <div className="w-72 shrink-0 border-r border-border p-4 space-y-3 bg-muted/30">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {isEditing ? "Edit Automation" : "Add Automation"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPhaseLevel ? "Phase" : "Item"}-level trigger
              </p>
            </div>

            {/* Trigger Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Trigger Event
              </Label>
              <Select
                value={triggerType}
                onValueChange={(v: AutomationTriggerType) => setTriggerType(v)}
              >
                <SelectTrigger className="h-9 text-sm bg-background border-input shadow-sm hover:shadow-md transition-shadow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggers.map(({ value, label }) => (
                    <SelectItem key={value} value={value} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delay Days */}
            {needsDelayDays && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">
                  {triggerType === "phase_stall"
                    ? "Days After No Progress"
                    : "Days Before Deadline"}
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={delayDays}
                  onChange={(e) =>
                    setDelayDays(Math.max(1, parseInt(e.target.value) || 7))
                  }
                  className="h-9 text-sm w-24 bg-background border-input shadow-sm hover:shadow-md transition-shadow"
                />
              </div>
            )}

            {/* Recipients */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Recipients
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {RECIPIENT_OPTIONS.map(({ value, label, description }) => {
                  const isSelected = recipients.some((r) => r.type === value);
                  return (
                    <TooltipProvider key={value}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={isSelected ? "default" : "outline"}
                            className={`text-xs cursor-pointer h-6 px-2 shadow-sm hover:shadow-md transition-all ${
                              isSelected
                                ? "bg-foreground text-background hover:bg-foreground/90"
                                : "bg-background border-input hover:bg-accent hover:text-accent-foreground"
                            }`}
                            onClick={() => handleRecipientToggle(value)}
                          >
                            {label}
                            {isSelected && <X className="h-3 w-3 ml-1" />}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          {description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>

            {/* Custom Emails */}
            {recipients.some((r) => r.type === "custom_email") && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Custom Emails
                </Label>
                <Input
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  placeholder="email1@example.com"
                  className="h-9 text-sm bg-background border-input shadow-sm hover:shadow-md transition-shadow"
                />
              </div>
            )}

            {/* Communication Channel */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Channel
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {COMMUNICATION_OPTIONS.map(({ value, label, icon }) => (
                  <Badge
                    key={value}
                    variant={
                      communicationType === value ? "default" : "outline"
                    }
                    className={`text-xs cursor-pointer h-6 px-2 shadow-sm hover:shadow-md transition-all ${
                      communicationType === value
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "bg-background border-input hover:bg-accent hover:text-accent-foreground"
                    }`}
                    onClick={() => setCommunicationType(value)}
                  >
                    {icon && <span className="mr-1">{icon}</span>}
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sender */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Send From
              </Label>
              <Select
                value={senderType}
                onValueChange={(v: AutomationSenderType) => setSenderType(v)}
              >
                <SelectTrigger className="h-9 text-sm bg-background border-input shadow-sm hover:shadow-md transition-shadow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SENDER_OPTIONS.map(({ value, label, description }) => (
                    <SelectItem key={value} value={value} className="text-sm">
                      <div className="flex flex-col">
                        <span>{label}</span>
                        <span className="text-xs text-muted-foreground">
                          {description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Sender Fields */}
            {senderType === "custom" && (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">
                    Sender Email *
                  </Label>
                  <Input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="sender@example.com"
                    className="h-9 text-sm bg-background border-input shadow-sm hover:shadow-md transition-shadow"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">
                    Sender Name
                  </Label>
                  <Input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="John Smith"
                    className="h-9 text-sm bg-background border-input shadow-sm hover:shadow-md transition-shadow"
                  />
                </div>
              </div>
            )}

            {/* Display Name Override */}
            {senderType !== "custom" && senderType !== "system" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Display Name Override
                </Label>
                <Input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Leave blank for default"
                  className="h-9 text-sm bg-background border-input shadow-sm hover:shadow-md transition-shadow"
                />
              </div>
            )}

            {/* Footer in left column */}
            <div className="pt-3 mt-auto border-t border-border flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-sm flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-9 text-sm flex-1"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending && (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                )}
                {isEditing ? "Save" : "Add"}
              </Button>
            </div>
          </div>

          {/* RIGHT SECTION - Content & Variables */}
          <div className="flex-1 flex">
            {/* CENTER - Message Content */}
            <div className="flex-1 p-4 space-y-3">
              {availableTabs.length > 0 && (
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="h-10 w-full bg-muted/50 p-1 border border-border rounded-lg">
                    {availableTabs.map(({ value, label, icon }) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="h-8 text-sm flex-1 rounded-md text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm hover:text-foreground transition-all"
                      >
                        {icon}
                        <span className="ml-1.5">{label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* Email Tab */}
                  {showEmail && (
                    <TabsContent value="email" className="mt-3 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">
                          Subject
                        </Label>
                        <Input
                          ref={emailSubjectRef}
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          onFocus={() => setLastFocusedField("emailSubject")}
                          placeholder="e.g., Welcome to {{phase_name}}!"
                          className="h-9 text-sm bg-background border-input shadow-sm hover:shadow-md focus:shadow-md transition-shadow"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">
                          Body (HTML supported)
                        </Label>
                        <Textarea
                          ref={emailBodyRef}
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          onFocus={() => setLastFocusedField("emailBody")}
                          placeholder="<p>Hello {{recruit_first_name}},</p><p>Welcome! 🎉</p>"
                          className="text-sm min-h-[320px] font-mono bg-background border-input shadow-sm hover:shadow-md focus:shadow-md transition-shadow"
                        />
                      </div>
                    </TabsContent>
                  )}

                  {/* Notification Tab */}
                  {showNotification && (
                    <TabsContent
                      value="notification"
                      className="mt-3 space-y-3"
                    >
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">
                          Title
                        </Label>
                        <Input
                          ref={notificationTitleRef}
                          value={notificationTitle}
                          onChange={(e) => setNotificationTitle(e.target.value)}
                          onFocus={() =>
                            setLastFocusedField("notificationTitle")
                          }
                          placeholder="e.g., Phase Started"
                          className="h-9 text-sm bg-background border-input shadow-sm hover:shadow-md focus:shadow-md transition-shadow"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">
                          Message
                        </Label>
                        <Textarea
                          ref={notificationMessageRef}
                          value={notificationMessage}
                          onChange={(e) =>
                            setNotificationMessage(e.target.value)
                          }
                          onFocus={() =>
                            setLastFocusedField("notificationMessage")
                          }
                          placeholder="{{recruit_name}} has entered {{phase_name}}"
                          className="text-sm min-h-[280px] bg-background border-input shadow-sm hover:shadow-md focus:shadow-md transition-shadow"
                        />
                      </div>
                    </TabsContent>
                  )}

                  {/* SMS Tab */}
                  {showSms && (
                    <TabsContent value="sms" className="mt-3 space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-foreground">
                            SMS Message
                          </Label>
                          <span className="text-xs text-muted-foreground">
                            {smsMessage.length}/160
                          </span>
                        </div>
                        <Textarea
                          ref={smsMessageRef}
                          value={smsMessage}
                          onChange={(e) => setSmsMessage(e.target.value)}
                          onFocus={() => setLastFocusedField("smsMessage")}
                          placeholder="Hi {{recruit_first_name}}, reminder about {{phase_name}}..."
                          className="text-sm min-h-[280px] bg-background border-input shadow-sm hover:shadow-md focus:shadow-md transition-shadow"
                          maxLength={320}
                        />
                        <p className="text-xs text-muted-foreground">
                          Keep under 160 chars for single SMS
                        </p>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              )}
            </div>

            {/* RIGHT - Template Variables & Emojis Sidebar */}
            <div className="w-64 shrink-0 border-l border-border p-3 bg-muted/30 space-y-3">
              <div className="text-xs text-muted-foreground text-center font-medium">
                Click to insert at cursor
              </div>

              {/* Template Variables */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Variables
                </span>
                <div className="space-y-2">
                  {TEMPLATE_VARIABLE_CATEGORIES.map(
                    ({ category, variables }) => (
                      <div key={category}>
                        <span className="text-xs font-medium text-muted-foreground block mb-1">
                          {category}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {variables.map(({ variable, description }) => (
                            <TooltipProvider key={variable}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => insertVariable(variable)}
                                    className="px-1.5 py-0.5 text-xs font-mono bg-background border border-input rounded shadow-sm hover:shadow-md hover:bg-accent hover:text-accent-foreground active:shadow-none transition-all"
                                  >
                                    {variable.replace(/\{\{|\}\}/g, "")}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">
                                  <p className="font-mono">{variable}</p>
                                  <p className="text-muted-foreground">
                                    {description}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Emoji Shortcuts */}
              <div className="pt-2 border-t border-border">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-2">
                  Emojis
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_SHORTCUTS.map(({ emoji, label }) => (
                    <TooltipProvider key={emoji}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => insertVariable(emoji)}
                            className="w-8 h-8 text-lg flex items-center justify-center bg-background border border-input rounded shadow-sm hover:shadow-md hover:bg-accent active:shadow-none transition-all"
                          >
                            {emoji}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          {label}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
