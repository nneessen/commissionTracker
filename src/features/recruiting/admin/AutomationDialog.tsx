// src/features/recruiting/admin/AutomationDialog.tsx

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Loader2, X, Mail, Bell, MessageSquare, Copy } from "lucide-react";
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

  // Copy variable to clipboard
  const copyVariable = useCallback((variable: string) => {
    navigator.clipboard.writeText(variable);
    toast.success("Copied to clipboard");
  }, []);

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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xs font-medium">
            {isEditing ? "Edit Automation" : "Add Automation"}
          </DialogTitle>
          <DialogDescription className="text-[10px] text-zinc-500">
            Configure automated {isPhaseLevel ? "phase" : "item"}-level
            notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Trigger Type */}
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Trigger Event
            </Label>
            <Select
              value={triggerType}
              onValueChange={(v: AutomationTriggerType) => setTriggerType(v)}
            >
              <SelectTrigger className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {triggers.map(({ value, label, description }) => (
                  <SelectItem key={value} value={value} className="text-[11px]">
                    <div className="flex flex-col">
                      <span>{label}</span>
                      <span className="text-[9px] text-zinc-500">
                        {description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Delay Days (for stall/deadline triggers) */}
          {needsDelayDays && (
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
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
                className="h-7 text-[11px] w-20 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
              />
            </div>
          )}

          {/* Recipients */}
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
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
                          className={`text-[10px] cursor-pointer transition-all h-5 px-1.5 ${
                            isSelected
                              ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-300 dark:border-zinc-600"
                          }`}
                          onClick={() => handleRecipientToggle(value)}
                        >
                          {label}
                          {isSelected && <X className="h-2.5 w-2.5 ml-0.5" />}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px]">
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
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Custom Emails (comma-separated)
              </Label>
              <Input
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
              />
            </div>
          )}

          {/* Communication Type */}
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Communication Channel
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMUNICATION_OPTIONS.map(({ value, label, icon }) => (
                <Badge
                  key={value}
                  variant={communicationType === value ? "default" : "outline"}
                  className={`text-[10px] cursor-pointer transition-all h-5 px-1.5 ${
                    communicationType === value
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-300 dark:border-zinc-600"
                  }`}
                  onClick={() => setCommunicationType(value)}
                >
                  {icon && <span className="mr-1">{icon}</span>}
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Sender Configuration */}
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Send From
            </Label>
            <Select
              value={senderType}
              onValueChange={(v: AutomationSenderType) => setSenderType(v)}
            >
              <SelectTrigger className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENDER_OPTIONS.map(({ value, label, description }) => (
                  <SelectItem key={value} value={value} className="text-[11px]">
                    <div className="flex flex-col">
                      <span>{label}</span>
                      <span className="text-[9px] text-zinc-500">
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
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Sender Email *
                </Label>
                <Input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="sender@example.com"
                  className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Sender Name
                </Label>
                <Input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="John Smith"
                  className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                />
              </div>
            </div>
          )}

          {/* Optional Sender Name for non-custom types */}
          {senderType !== "custom" && senderType !== "system" && (
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Display Name Override (optional)
              </Label>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Leave blank to use default name"
                className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
              />
            </div>
          )}

          {/* Content Tabs */}
          {availableTabs.length > 0 && (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="h-7 w-full bg-zinc-100 dark:bg-zinc-800 p-0.5">
                {availableTabs.map(({ value, label, icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="h-6 text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 flex-1"
                  >
                    {icon}
                    <span className="ml-1">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Email Tab */}
              {showEmail && (
                <TabsContent value="email" className="mt-2 space-y-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Subject
                    </Label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g., Welcome to {{phase_name}}!"
                      className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Body (HTML supported)
                    </Label>
                    <Textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="<p>Hello {{recruit_first_name}},</p><p>...</p>"
                      className="text-[11px] min-h-20 font-mono bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                </TabsContent>
              )}

              {/* Notification Tab */}
              {showNotification && (
                <TabsContent value="notification" className="mt-2 space-y-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Title
                    </Label>
                    <Input
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      placeholder="e.g., Phase Started"
                      className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Message
                    </Label>
                    <Textarea
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      placeholder="{{recruit_name}} has entered {{phase_name}}"
                      className="text-[11px] min-h-14 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                </TabsContent>
              )}

              {/* SMS Tab */}
              {showSms && (
                <TabsContent value="sms" className="mt-2 space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        SMS Message
                      </Label>
                      <span className="text-[9px] text-zinc-400">
                        {smsMessage.length}/160 chars
                      </span>
                    </div>
                    <Textarea
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder="Hi {{recruit_first_name}}, reminder about {{phase_name}}..."
                      className="text-[11px] min-h-16 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                      maxLength={320}
                    />
                    <p className="text-[9px] text-zinc-400">
                      Keep under 160 chars for single SMS. Longer messages may
                      be split.
                    </p>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          )}

          {/* Template Variables & Emojis */}
          <div className="p-2 bg-zinc-50 dark:bg-zinc-800/30 rounded border border-zinc-200 dark:border-zinc-700 space-y-2">
            {/* Template Variables by Category */}
            <div>
              <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1.5">
                Template Variables
              </span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {TEMPLATE_VARIABLE_CATEGORIES.map(({ category, variables }) => (
                  <div
                    key={category}
                    className="flex flex-wrap items-center gap-1"
                  >
                    <span className="text-[8px] font-medium text-zinc-400 dark:text-zinc-500 w-16 shrink-0">
                      {category}:
                    </span>
                    {variables.map(({ variable, description }) => (
                      <TooltipProvider key={variable}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => copyVariable(variable)}
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              {variable.replace(/\{\{|\}\}/g, "")}
                              <Copy className="h-2 w-2 text-zinc-400" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-[10px]">
                            <p className="font-mono text-zinc-300">
                              {variable}
                            </p>
                            <p>{description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Emoji Shortcuts */}
            <div>
              <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1">
                Emoji Shortcodes
              </span>
              <div className="flex flex-wrap gap-1">
                {EMOJI_SHORTCUTS.map(({ code, emoji, label }) => (
                  <TooltipProvider key={code}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => copyVariable(code)}
                          className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          {emoji}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px]">
                        <p className="font-mono">{code}</p>
                        <p className="text-zinc-400">{label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
              <p className="text-[8px] text-zinc-400 mt-1">
                Use :emoji_name: syntax in your message (e.g., :tada: :rocket:)
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] px-3"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] px-3"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {isEditing ? "Save Changes" : "Add Automation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
