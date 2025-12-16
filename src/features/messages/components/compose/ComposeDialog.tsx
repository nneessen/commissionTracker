// src/features/messages/components/compose/ComposeDialog.tsx
// Email compose dialog with rich text editor

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
// Select components reserved for future use (template selection, etc.)
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  X,
  Send,
  Paperclip,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Save,
} from "lucide-react";
import { format } from "date-fns";
// cn utility reserved for conditional styling
// import { cn } from '@/lib/utils';
import { useSendEmail, useEmailQuota } from "../../hooks/useSendEmail";

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
  const { quota: _quota, remainingDaily } = useEmailQuota();

  const [to, setTo] = useState<string[]>(replyTo ? [replyTo.to] : []);
  const [toInput, setToInput] = useState("");
  const [cc, setCc] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  const [bcc, setBcc] = useState<string[]>([]);
  const [bccInput, setBccInput] = useState("");
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

  const handleAddEmail = useCallback(
    (
      input: string,
      setInput: (v: string) => void,
      list: string[],
      setList: (v: string[]) => void,
    ) => {
      const email = input.trim().toLowerCase();
      if (email && email.includes("@") && !list.includes(email)) {
        setList([...list, email]);
        setInput("");
      }
    },
    [],
  );

  const handleRemoveEmail = useCallback(
    (email: string, list: string[], setList: (v: string[]) => void) => {
      setList(list.filter((e) => e !== email));
    },
    [],
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      input: string,
      setInput: (v: string) => void,
      list: string[],
      setList: (v: string[]) => void,
    ) => {
      if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
        e.preventDefault();
        handleAddEmail(input, setInput, list, setList);
      }
    },
    [handleAddEmail],
  );

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
    } catch (_err) {
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
    } catch (_err) {
      setError("Failed to save draft");
    }
  };

  const resetForm = () => {
    setTo([]);
    setToInput("");
    setCc([]);
    setCcInput("");
    setBcc([]);
    setBccInput("");
    setSubject("");
    setBody("");
    setScheduledDate(undefined);
    setShowSchedule(false);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold">
            {replyTo ? "Reply" : forward ? "Forward" : "New Message"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* To field */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-[11px] text-muted-foreground w-8">
                To
              </Label>
              <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[28px] px-2 py-1 border border-border rounded-sm bg-background">
                {to.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="h-5 text-[10px] gap-1 pr-1"
                  >
                    {email}
                    <button
                      onClick={() => handleRemoveEmail(email, to, setTo)}
                      className="hover:bg-muted-foreground/20 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  type="text"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={(e) =>
                    handleKeyDown(e, toInput, setToInput, to, setTo)
                  }
                  onBlur={() => handleAddEmail(toInput, setToInput, to, setTo)}
                  placeholder={to.length === 0 ? "Add recipients..." : ""}
                  className="flex-1 min-w-[120px] bg-transparent text-[11px] outline-none"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setShowCcBcc(!showCcBcc)}
              >
                {showCcBcc ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                Cc/Bcc
              </Button>
            </div>
          </div>

          {/* CC/BCC fields */}
          {showCcBcc && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-muted-foreground w-8">
                  Cc
                </Label>
                <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[28px] px-2 py-1 border border-border rounded-sm bg-background">
                  {cc.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="h-5 text-[10px] gap-1 pr-1"
                    >
                      {email}
                      <button
                        onClick={() => handleRemoveEmail(email, cc, setCc)}
                        className="hover:bg-muted-foreground/20 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    type="text"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, ccInput, setCcInput, cc, setCc)
                    }
                    onBlur={() =>
                      handleAddEmail(ccInput, setCcInput, cc, setCc)
                    }
                    className="flex-1 min-w-[120px] bg-transparent text-[11px] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-muted-foreground w-8">
                  Bcc
                </Label>
                <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[28px] px-2 py-1 border border-border rounded-sm bg-background">
                  {bcc.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="h-5 text-[10px] gap-1 pr-1"
                    >
                      {email}
                      <button
                        onClick={() => handleRemoveEmail(email, bcc, setBcc)}
                        className="hover:bg-muted-foreground/20 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    type="text"
                    value={bccInput}
                    onChange={(e) => setBccInput(e.target.value)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, bccInput, setBccInput, bcc, setBcc)
                    }
                    onBlur={() =>
                      handleAddEmail(bccInput, setBccInput, bcc, setBcc)
                    }
                    className="flex-1 min-w-[120px] bg-transparent text-[11px] outline-none"
                  />
                </div>
              </div>
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
            />
          </div>

          {/* Body */}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            className="min-h-[200px] text-[11px] resize-none"
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
                <PopoverContent className="w-auto p-0" align="start">
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
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

            <Button variant="outline" size="sm" className="h-7 px-2" disabled>
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {remainingDaily} emails remaining today
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
      </DialogContent>
    </Dialog>
  );
}
