// src/features/messages/components/compose/ComposeDialog.tsx
// Email compose dialog with Sheet-based contact browser
// Uses zinc palette and compact design patterns

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Send,
  Paperclip,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Save,
  X,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSendEmail, useEmailQuota } from "../../hooks/useSendEmail";
import { useCurrentUserProfile } from "@/hooks/admin/useUserApproval";
import { ContactBrowser } from "./ContactBrowser";
import type { Contact } from "../../services/contactService";

// Super admin email - all admin-sent emails come from this address
const SUPER_ADMIN_EMAIL = "nickneessen@thestandardhq.com";

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyTo?: {
    threadId: string;
    messageId: string;
    to: string;
    subject: string;
  };
  forward?: {
    subject: string;
    body: string;
  };
}

export function ComposeDialog({
  open,
  onOpenChange,
  replyTo,
  forward,
}: ComposeDialogProps) {
  const { user: _user } = useAuth();
  const { send, saveDraft, isSending, isSavingDraft } = useSendEmail();
  const { remainingDaily } = useEmailQuota();
  const { data: userProfile } = useCurrentUserProfile();

  // Check if user is admin (super admin always sends from the business email)
  const isAdmin = userProfile?.is_admin || false;

  // Form state
  const [to, setTo] = useState<string[]>(replyTo ? [replyTo.to] : []);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState(
    replyTo
      ? `Re: ${replyTo.subject}`
      : forward
        ? `Fwd: ${forward.subject}`
        : "",
  );
  const [body, setBody] = useState(forward?.body || "");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [showSchedule, setShowSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state - Sheet starts closed
  const [showContactBrowser, setShowContactBrowser] = useState(false);
  const [activeRecipientField, setActiveRecipientField] = useState<
    "to" | "cc" | "bcc"
  >("to");

  const handleSend = async () => {
    if (to.length === 0) {
      setError("Please add at least one recipient");
      return;
    }

    if (!subject.trim()) {
      setError("Please add a subject");
      return;
    }

    if (remainingDaily <= 0) {
      setError("Daily email limit reached");
      return;
    }

    setError(null);

    try {
      const result = await send({
        to,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject,
        bodyHtml: `<div>${body.replace(/\n/g, "<br/>")}</div>`,
        bodyText: body,
        threadId: replyTo?.threadId,
        replyToMessageId: replyTo?.messageId,
        scheduledFor: scheduledDate,
        trackOpens: true,
        trackClicks: true,
        // Admins always send from the super admin email
        source: "owner",
        fromOverride: isAdmin ? SUPER_ADMIN_EMAIL : undefined,
      });

      if (result.success) {
        toast.success(
          scheduledDate ? "Email scheduled" : "Email sent successfully",
        );
        onOpenChange(false);
        resetForm();
      } else {
        setError(result.error || "Failed to send email");
      }
    } catch {
      setError("Failed to send email");
    }
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft({
        to,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject,
        bodyHtml: `<div>${body.replace(/\n/g, "<br/>")}</div>`,
      });
      toast.success("Draft saved");
      onOpenChange(false);
      resetForm();
    } catch {
      setError("Failed to save draft");
    }
  };

  const resetForm = () => {
    setTo([]);
    setCc([]);
    setBcc([]);
    setSubject("");
    setBody("");
    setScheduledDate(undefined);
    setShowSchedule(false);
    setError(null);
  };

  const handleSelectContact = useCallback(
    (contact: Contact) => {
      const email = contact.email.toLowerCase();
      switch (activeRecipientField) {
        case "to":
          // Use functional update to handle rapid successive calls (e.g., Add Entire Team)
          setTo((prev) => (prev.includes(email) ? prev : [...prev, email]));
          break;
        case "cc":
          setCc((prev) => (prev.includes(email) ? prev : [...prev, email]));
          break;
        case "bcc":
          setBcc((prev) => (prev.includes(email) ? prev : [...prev, email]));
          break;
      }
    },
    [activeRecipientField],
  );

  const removeRecipient = (email: string, field: "to" | "cc" | "bcc") => {
    switch (field) {
      case "to":
        setTo(to.filter((e) => e !== email));
        break;
      case "cc":
        setCc(cc.filter((e) => e !== email));
        break;
      case "bcc":
        setBcc(bcc.filter((e) => e !== email));
        break;
    }
  };

  const allSelectedEmails = [...to, ...cc, ...bcc].map((e) => e.toLowerCase());

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex flex-col p-0 gap-0 max-w-2xl bg-zinc-50 dark:bg-zinc-950 transition-all duration-200"
          style={{
            maxHeight: "85vh",
            left: showContactBrowser ? "calc(50% - 200px)" : "50%",
          }}
        >
          <DialogHeader className="px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <DialogTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {replyTo ? "Reply" : forward ? "Forward" : "New Message"}
            </DialogTitle>
          </DialogHeader>

          {/* Compose Form */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-white dark:bg-zinc-900">
              {/* Contacts Button - Prominent placement */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowContactBrowser(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Browse Contacts</span>
                </button>
              </div>

              {/* To Field */}
              <RecipientField
                label="To"
                values={to}
                isActive={activeRecipientField === "to"}
                onActivate={() => setActiveRecipientField("to")}
                onRemove={(email) => removeRecipient(email, "to")}
                onOpenContacts={() => setShowContactBrowser(true)}
                disabled={isSending}
              />

              {/* Cc/Bcc toggle */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-5 px-2 text-[10px] bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 border-0 shadow-none"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                >
                  {showCcBcc ? (
                    <ChevronUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  )}
                  Cc/Bcc
                </Button>
              </div>

              {/* CC/BCC Fields */}
              {showCcBcc && (
                <>
                  <RecipientField
                    label="Cc"
                    values={cc}
                    isActive={activeRecipientField === "cc"}
                    onActivate={() => setActiveRecipientField("cc")}
                    onRemove={(email) => removeRecipient(email, "cc")}
                    onOpenContacts={() => setShowContactBrowser(true)}
                    disabled={isSending}
                  />
                  <RecipientField
                    label="Bcc"
                    values={bcc}
                    isActive={activeRecipientField === "bcc"}
                    onActivate={() => setActiveRecipientField("bcc")}
                    onRemove={(email) => removeRecipient(email, "bcc")}
                    onOpenContacts={() => setShowContactBrowser(true)}
                    disabled={isSending}
                  />
                </>
              )}

              {/* Subject */}
              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-zinc-500 dark:text-zinc-400 w-8">
                  Subj
                </Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="flex-1 h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  disabled={isSending}
                />
              </div>

              {/* Body */}
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                className="min-h-[180px] text-[11px] resize-none bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                disabled={isSending}
              />

              {/* Schedule */}
              {showSchedule && (
                <div className="flex items-center gap-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-sm border border-zinc-200 dark:border-zinc-700">
                  <Clock className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Scheduled for:
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="sm"
                        className="h-6 text-[10px] bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 border-0 shadow-none"
                      >
                        {scheduledDate
                          ? format(scheduledDate, "PPp")
                          : "Pick date & time"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 z-[200]"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    size="sm"
                    className="h-6 px-1 bg-transparent hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 border-0 shadow-none"
                    onClick={() => {
                      setShowSchedule(false);
                      setScheduledDate(undefined);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-sm border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSend}
                  disabled={isSending || to.length === 0}
                  size="sm"
                  className="h-6 text-[10px] gap-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 border-0 shadow-none"
                >
                  <Send className="h-3 w-3" />
                  {scheduledDate ? "Schedule" : "Send"}
                </Button>

                {/* Show admin indicator when sending as super admin */}
                {isAdmin && (
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    as {SUPER_ADMIN_EMAIL}
                  </span>
                )}

                <Button
                  size="sm"
                  className="h-6 px-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border-0 shadow-none"
                  onClick={() => setShowSchedule(!showSchedule)}
                >
                  <Clock className="h-3 w-3" />
                </Button>

                <Button
                  size="sm"
                  className="h-6 px-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 border-0 shadow-none"
                  disabled
                >
                  <Paperclip className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {remainingDaily} remaining
                </span>

                <Button
                  size="sm"
                  className="h-6 px-2 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 border-0 shadow-none"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                >
                  <Save className="h-3 w-3" />
                </Button>

                <Button
                  size="sm"
                  className="h-6 px-2 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 border-0 shadow-none"
                  onClick={() => {
                    resetForm();
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Browser Sheet - separate from dialog */}
      <ContactBrowser
        open={showContactBrowser}
        onOpenChange={setShowContactBrowser}
        onSelectContact={handleSelectContact}
        selectedEmails={allSelectedEmails}
      />
    </>
  );
}

// Recipient field component - Zinc styled
interface RecipientFieldProps {
  label: string;
  values: string[];
  isActive: boolean;
  onActivate: () => void;
  onRemove: (email: string) => void;
  onOpenContacts: () => void;
  disabled?: boolean;
}

function RecipientField({
  label,
  values,
  isActive,
  onActivate,
  onRemove,
  onOpenContacts,
  disabled,
}: RecipientFieldProps) {
  return (
    <div className="flex items-start gap-2">
      <Label className="text-[11px] text-zinc-500 dark:text-zinc-400 w-8 pt-1.5">
        {label}
      </Label>
      <div
        onClick={onActivate}
        className={cn(
          "flex-1 flex flex-wrap items-center gap-1 min-h-[32px] px-2 py-1 border rounded-sm bg-zinc-50 dark:bg-zinc-800 cursor-text",
          isActive
            ? "border-zinc-400 dark:border-zinc-500 ring-1 ring-zinc-300 dark:ring-zinc-600"
            : "border-zinc-200 dark:border-zinc-700",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {values.map((email) => (
          <Badge
            key={email}
            className="h-5 text-[10px] gap-1 pr-1 shrink-0 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-0"
          >
            <span className="max-w-[150px] truncate">{email}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(email);
                }}
                className="hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-full p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </Badge>
        ))}
        {values.length === 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenContacts();
            }}
            className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Click to add from contacts →
          </button>
        )}
      </div>
    </div>
  );
}
