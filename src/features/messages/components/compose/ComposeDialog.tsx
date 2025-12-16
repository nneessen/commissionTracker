// src/features/messages/components/compose/ComposeDialog.tsx
// Email compose dialog with contact browser sidebar

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
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSendEmail, useEmailQuota } from "../../hooks/useSendEmail";
import { ContactBrowser } from "./ContactBrowser";
import type { Contact } from "../../services/contactService";

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
  const { send, saveDraft, isSending, isSavingDraft } = useSendEmail();
  const { remainingDaily } = useEmailQuota();

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

  // UI state
  const [showContactBrowser, setShowContactBrowser] = useState(true);
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
      });

      if (result.success) {
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
          if (!to.includes(email)) {
            setTo([...to, email]);
          }
          break;
        case "cc":
          if (!cc.includes(email)) {
            setCc([...cc, email]);
          }
          break;
        case "bcc":
          if (!bcc.includes(email)) {
            setBcc([...bcc, email]);
          }
          break;
      }
    },
    [activeRecipientField, to, cc, bcc],
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col p-0 gap-0",
          showContactBrowser ? "max-w-4xl" : "max-w-2xl",
        )}
        style={{ maxHeight: "85vh" }}
      >
        <DialogHeader className="px-4 py-2 border-b border-border">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-sm font-semibold">
              {replyTo ? "Reply" : forward ? "Forward" : "New Message"}
            </DialogTitle>
            <button
              onClick={() => setShowContactBrowser(!showContactBrowser)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-colors",
                showContactBrowser
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              {showContactBrowser ? (
                <>
                  <PanelRightClose className="h-3 w-3" />
                  <span>Hide Contacts</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="h-3 w-3" />
                  <span>Show Contacts</span>
                </>
              )}
            </button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Compose Form */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* To Field */}
              <RecipientField
                label="To"
                values={to}
                isActive={activeRecipientField === "to"}
                onActivate={() => setActiveRecipientField("to")}
                onRemove={(email) => removeRecipient(email, "to")}
                disabled={isSending}
              />

              {/* Cc/Bcc toggle */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 text-[10px] text-muted-foreground"
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
                    disabled={isSending}
                  />
                  <RecipientField
                    label="Bcc"
                    values={bcc}
                    isActive={activeRecipientField === "bcc"}
                    onActivate={() => setActiveRecipientField("bcc")}
                    onRemove={(email) => removeRecipient(email, "bcc")}
                    disabled={isSending}
                  />
                </>
              )}

              {/* Subject */}
              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-muted-foreground w-8">
                  Subj
                </Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="flex-1 h-7 text-[11px]"
                  disabled={isSending}
                />
              </div>

              {/* Body */}
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                className="min-h-[180px] text-[11px] resize-none"
                disabled={isSending}
              />

              {/* Schedule */}
              {showSchedule && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">
                    Scheduled for:
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px]"
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
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1"
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
                <div className="text-[11px] text-destructive bg-destructive/10 px-2 py-1 rounded-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSend}
                  disabled={isSending || to.length === 0}
                  size="sm"
                  className="h-7 text-[11px] gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {scheduledDate ? "Schedule" : "Send"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setShowSchedule(!showSchedule)}
                >
                  <Clock className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {remainingDaily} remaining
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive"
                  onClick={() => {
                    resetForm();
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Contact Browser Sidebar */}
          {showContactBrowser && (
            <ContactBrowser
              onSelectContact={handleSelectContact}
              selectedEmails={allSelectedEmails}
              className="w-[280px] relative"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Recipient field component
interface RecipientFieldProps {
  label: string;
  values: string[];
  isActive: boolean;
  onActivate: () => void;
  onRemove: (email: string) => void;
  disabled?: boolean;
}

function RecipientField({
  label,
  values,
  isActive,
  onActivate,
  onRemove,
  disabled,
}: RecipientFieldProps) {
  return (
    <div className="flex items-start gap-2">
      <Label className="text-[11px] text-muted-foreground w-8 pt-1.5">
        {label}
      </Label>
      <div
        onClick={onActivate}
        className={cn(
          "flex-1 flex flex-wrap items-center gap-1 min-h-[32px] px-2 py-1 border rounded-sm bg-background cursor-text",
          isActive ? "border-primary ring-1 ring-primary" : "border-input",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {values.map((email) => (
          <Badge
            key={email}
            variant="secondary"
            className="h-5 text-[10px] gap-1 pr-1 shrink-0"
          >
            <span className="max-w-[150px] truncate">{email}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(email);
                }}
                className="hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </Badge>
        ))}
        {values.length === 0 && (
          <span className="text-[11px] text-muted-foreground">
            Click to add from contacts →
          </span>
        )}
      </div>
    </div>
  );
}
